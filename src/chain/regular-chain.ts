import { InvocationContext } from '@azure/functions';
import { BaseChain } from './base-chain';
import { BasicChainData, ChainHandlerFor, ChainWrapper, ResponseType } from './types';

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
