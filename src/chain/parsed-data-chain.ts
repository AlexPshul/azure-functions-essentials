import { FunctionResult, InvocationContext } from '@azure/functions';
import { ZodType } from 'zod';
import { funcResult } from '../helpers';
import { BaseChain } from './base-chain';
import { BasicChainData, ChainOptions, ChainWrapper, LinkFunctor, ResponseType, SpecificHttpResponseInit } from './types';

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
  ParsedChainData<TTriggerData, TData>,
  TResponseType
> {
  constructor(
    private readonly dataAccessor: (chainData: BasicChainData<TTriggerData>) => Promise<TData>,
    private readonly zodType: ZodType<TData> | LinkFunctor<BasicChainData<TTriggerData>, ZodType<TData>> | undefined,
    options: ChainOptions<TResponseType> = { responseType: 'http' as TResponseType },
  ) {
    super(options);
  }

  /**
   * Registers a handler for the Azure function handler chain.
   * @param handler - The handler function to be executed after the chain is executed. Contains the trigger data, the parsed data, and the context.
   * @returns A function that satisfies the Azure Functions handler interface.
   */
  public handle<TResultBody = undefined>(
    handler: ParsedHandlerFor<TResponseType, TTriggerData, TData, TResultBody>,
  ): ChainWrapper<TTriggerData, TResponseType, TResultBody> {
    return (async (triggerData: TTriggerData, context: InvocationContext) => {
      const basicChainData = { triggerData, context };
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

      const failure = await this.executeChain({ triggerData, context, parsedData });
      if (failure) return this.handleFailure(failure);

      const result = await handler(triggerData, parsedData, context);
      return this.handleResult(result);
    }) as ChainWrapper<TTriggerData, TResponseType, TResultBody>;
  }
}
