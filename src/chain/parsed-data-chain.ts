import { FunctionResult, InvocationContext } from '@azure/functions';
import { ZodType } from 'zod';
import { funcResult } from '../helpers';
import { BaseChain } from './base-chain';
import { ChainGuardError } from './chain-guard-error';
import { ChainResultFor } from './regular-chain';
import { BasicChainData, ChainOptions, LinkFunctor, ResponseType, SpecificHttpResponseInit } from './types';

type HttpParsedHandler<TTriggerData, TData, TResultBody> = (
  triggerData: TTriggerData,
  parsedData: TData,
  context: InvocationContext,
) => FunctionResult<SpecificHttpResponseInit<TResultBody> | void | undefined>;

type JsonParsedHandler<TTriggerData, TData, TResultBody> = (
  triggerData: TTriggerData,
  parsedData: TData,
  context: InvocationContext,
) => FunctionResult<TResultBody>;

type NoneParsedHandler<TTriggerData, TData> = (triggerData: TTriggerData, parsedData: TData, context: InvocationContext) => FunctionResult<void>;

type ParsedHandlerFor<TResponseType extends ResponseType, TTriggerData, TData, TResultBody> = TResponseType extends 'http'
  ? HttpParsedHandler<TTriggerData, TData, TResultBody>
  : TResponseType extends 'json'
    ? JsonParsedHandler<TTriggerData, TData, TResultBody>
    : NoneParsedHandler<TTriggerData, TData>;

type ParsedChainData<TTriggerData, TData> = BasicChainData<TTriggerData> & { parsedData: TData };

/**
 * A chain that extracts parsed data from trigger data using a configurable data accessor.
 * The handler receives three arguments: (triggerData, parsedData, context).
 */
export class ParsedDataChain<TTriggerData, TData, TResponseType extends ResponseType = 'http'> extends BaseChain<
  ParsedChainData<TTriggerData, TData>
> {
  constructor(
    private readonly dataAccessor: (chainData: BasicChainData<TTriggerData>) => Promise<TData>,
    private readonly zodType: ZodType<TData> | LinkFunctor<BasicChainData<TTriggerData>, ZodType<TData>> | undefined,
    private readonly options: ChainOptions<TResponseType> = { responseType: 'http' as TResponseType },
  ) {
    super();
  }

  private get responseType(): TResponseType {
    return this.options.responseType;
  }

  /**
   * Registers a handler for the Azure function handler chain.
   * @param handler - The handler function to be executed after the chain is executed. Contains the trigger data, the parsed data, and the context.
   * @returns A function that satisfies the Azure Functions handler interface.
   */
  public handle<TResultBody = undefined>(
    handler: ParsedHandlerFor<TResponseType, TTriggerData, TData, TResultBody>,
  ): (triggerData: TTriggerData, context: InvocationContext) => Promise<ChainResultFor<TResponseType, TResultBody>> {
    return (async (triggerData: TTriggerData, context: InvocationContext) => {
      const basicChainData: BasicChainData<TTriggerData> = { triggerData, context };
      const rawData = await this.dataAccessor(basicChainData);
      let parsedData: TData;

      if (!this.zodType) {
        parsedData = rawData;
      } else {
        const zodInstance = typeof this.zodType === 'function' ? this.zodType(basicChainData) : this.zodType;
        const parseResult = zodInstance.safeParse(rawData);
        if (!parseResult.success) {
          switch (this.responseType) {
            case 'http':
              context.error('Invalid data', parseResult.error.issues);
              return funcResult('BadRequest', parseResult.error.issues);
            default:
              throw parseResult.error;
          }
        }
        parsedData = parseResult.data;
      }

      const chainData: ParsedChainData<TTriggerData, TData> = { triggerData, context, parsedData };
      const failure = await this.executeChain(chainData);

      if (failure) {
        const guardError = new ChainGuardError(failure.result, failure.linkIndex, failure.linkType);
        switch (this.responseType) {
          case 'http':
            return failure.result;
          case 'json':
            return guardError;
          case 'none':
            throw guardError;
        }
      }

      const result = await (handler as HttpParsedHandler<TTriggerData, TData, TResultBody>)(triggerData, parsedData, context);
      switch (this.responseType) {
        case 'http':
          return result || funcResult('OK');
        case 'json':
          return result;
        case 'none':
          return undefined;
      }
    }) as (triggerData: TTriggerData, context: InvocationContext) => Promise<ChainResultFor<TResponseType, TResultBody>>;
  }
}
