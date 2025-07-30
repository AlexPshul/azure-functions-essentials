import { InvocationContext } from '@azure/functions';
import { ChainLinkResult } from './chain';

export type InputBindingSetter = {
  set: (context: InvocationContext) => ChainLinkResult;
};
