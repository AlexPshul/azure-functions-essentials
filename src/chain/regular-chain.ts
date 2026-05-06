import { FunctionResult, HttpResponseInit, InvocationContext } from '@azure/functions';
import { funcResult } from '../helpers';
import { BaseChain } from './base-chain';
import { ChainGuardError } from './chain-guard-error';
import { BasicChainData, ResponseType, SpecificHttpResponseInit } from './types';

export type HttpChainHandler<TTriggerData, TBody> = (
  triggerData: TTriggerData,
  context: InvocationContext,
) => FunctionResult<SpecificHttpResponseInit<TBody> | void | undefined>;

export type NoneChainHandler<TTriggerData> = (triggerData: TTriggerData, context: InvocationContext) => FunctionResult<void>;

export class RegularChain<TTriggerData = unknown, TResponseType extends ResponseType = 'none'> extends BaseChain<BasicChainData<TTriggerData>> {
  /**
   * Registers a handler for the Azure function handler chain.
   * @param handler - The handler function to be executed after the chain is executed. Contains the trigger data, and the context.
   * @returns A function that satisfies the Azure Functions handler interface.
   */
  public handle<TResultBody = undefined>(
    handler: TResponseType extends 'http' ? HttpChainHandler<TTriggerData, TResultBody> : NoneChainHandler<TTriggerData>,
  ): (triggerData: TTriggerData, context: InvocationContext) => Promise<TResponseType extends 'http' ? HttpResponseInit : void> {
    return (async (triggerData: TTriggerData, context: InvocationContext) => {
      const chainData: BasicChainData<TTriggerData> = { triggerData, context };
      const failure = await this.executeChain(chainData);

      if (failure) {
        if (this.isHttpResponse()) return failure.result;
        throw new ChainGuardError(failure.result, failure.linkIndex, failure.linkType);
      }

      const result = await (handler as HttpChainHandler<TTriggerData, TResultBody>)(triggerData, context);
      if (this.isHttpResponse()) return result || funcResult('OK');
      return undefined;
    }) as (triggerData: TTriggerData, context: InvocationContext) => Promise<TResponseType extends 'http' ? HttpResponseInit : void>;
  }

  protected isHttpResponse(): this is RegularChain<TTriggerData, 'http'> {
    return (this as RegularChain<TTriggerData, ResponseType>).responseType === 'http';
  }

  constructor(protected readonly responseType: TResponseType = 'none' as TResponseType) {
    super();
  }
}
