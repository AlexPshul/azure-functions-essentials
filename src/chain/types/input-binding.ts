import { InvocationContext } from '@azure/functions';
import { ChainLinkResult } from './chain';

export type InputBinding<TResult> = {
  set: (context: InvocationContext) => ChainLinkResult;
  get: (context: InvocationContext) => TResult;
};
