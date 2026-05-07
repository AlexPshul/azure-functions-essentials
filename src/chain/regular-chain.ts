import { FunctionResult, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BaseChain } from './base-chain';
import { ChainGuardError } from './chain-guard-error';
import { BasicChainData, ResponseType, SpecificHttpResponseInit } from './types';

export type HttpChainHandler<TTriggerData, TBody> = (
  triggerData: TTriggerData,
  context: InvocationContext,
) => FunctionResult<SpecificHttpResponseInit<TBody> | void | undefined>;

export type JsonChainHandler<TTriggerData, TResultBody> = (triggerData: TTriggerData, context: InvocationContext) => FunctionResult<TResultBody>;

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

export type ChainWrapper<TTriggerData, TResponseType extends ResponseType, TResultBody = undefined> = (
  triggerData: TTriggerData,
  context: InvocationContext,
) => Promise<ChainResultFor<TResponseType, TResultBody>>;

export class RegularChain<TTriggerData = unknown, TResponseType extends ResponseType = 'none'> extends BaseChain<
  BasicChainData<TTriggerData>,
  TResponseType
> {
  /**
   * Registers a handler for the Azure function handler chain.
   * @param handler - The handler function to be executed after the chain is executed. Contains the trigger data, and the context.
   * @returns A function that satisfies the Azure Functions handler interface.
   */
  public handle<TResultBody = undefined>(
    handler: ChainHandlerFor<TResponseType, TTriggerData, TResultBody>,
  ): ChainWrapper<TTriggerData, TResponseType, TResultBody> {
    return (async (triggerData: TTriggerData, context: InvocationContext) => {
      const failure = await this.executeChain({ triggerData, context });
      if (failure) return this.handleFailure(failure);

      const result = await handler(triggerData, context);
      return this.handleResult(result);
    }) as ChainWrapper<TTriggerData, TResponseType, TResultBody>;
  }
}
