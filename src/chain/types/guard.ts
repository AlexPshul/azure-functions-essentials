import { BasicChainData, ChainLinkResult } from './chain';

export type Guard<T = unknown> = {
  /**
   * A guard check function to check conditions on the trigger data and/or the context of the function
   * @param chainData - The chain data containing the trigger data and invocation context
   * @returns If the guard fails, it should return a HttpResponseInit object or false. If the guard passes, return true.
   */
  check: (chainData: BasicChainData<T>) => ChainLinkResult;
};
