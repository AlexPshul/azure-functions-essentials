import { FunctionResult, HttpResponseInit, InvocationContext } from '@azure/functions';
import { funcResult } from '../helpers';
import { BaseChain } from './base-chain';
import { ChainGuardError } from './chain-guard-error';
import { BasicChainData, ChainOptions, ResponseType, SpecificHttpResponseInit } from './types';

export type HttpChainHandler<TTriggerData, TBody> = (
  triggerData: TTriggerData,
  context: InvocationContext,
) => FunctionResult<SpecificHttpResponseInit<TBody> | void | undefined>;

export type JsonChainHandler<TTriggerData, TResultBody> = (
  triggerData: TTriggerData,
  context: InvocationContext,
) => FunctionResult<TResultBody>;

export type NoneChainHandler<TTriggerData> = (triggerData: TTriggerData, context: InvocationContext) => FunctionResult<void>;

export type ChainHandlerFor<TResponseType extends ResponseType, TTriggerData, TResultBody> = TResponseType extends 'http'
  ? HttpChainHandler<TTriggerData, TResultBody>
  : TResponseType extends 'json'
    ? JsonChainHandler<TTriggerData, TResultBody>
    : NoneChainHandler<TTriggerData>;

export type ChainResultFor<TResponseType extends ResponseType, TResultBody = undefined> = TResponseType extends 'http'
  ? HttpResponseInit
  : TResponseType extends 'json'
    ? TResultBody | ChainGuardError
    : void;

export class RegularChain<TTriggerData = unknown, TResponseType extends ResponseType = 'none'> extends BaseChain<BasicChainData<TTriggerData>> {
  /**
   * Registers a handler for the Azure function handler chain.
   * @param handler - The handler function to be executed after the chain is executed. Contains the trigger data, and the context.
   * @returns A function that satisfies the Azure Functions handler interface.
   */
  public handle<TResultBody = undefined>(
    handler: ChainHandlerFor<TResponseType, TTriggerData, TResultBody>,
  ): (triggerData: TTriggerData, context: InvocationContext) => Promise<ChainResultFor<TResponseType, TResultBody>> {
    return (async (triggerData: TTriggerData, context: InvocationContext) => {
      const chainData: BasicChainData<TTriggerData> = { triggerData, context };
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

      const result = await (handler as HttpChainHandler<TTriggerData, TResultBody>)(triggerData, context);
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

  constructor(protected readonly options: ChainOptions<TResponseType> = { responseType: 'none' as TResponseType }) {
    super();
  }

  protected get responseType(): TResponseType {
    return this.options.responseType;
  }
}
