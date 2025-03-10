import { HttpRequest, InvocationContext } from '@azure/functions';
import { ChainLinkResult } from './chain';

export type Guard = {
  /**
   * A guard check function to check the request and/or the context of the function
   * @param request - The Azure function http request object
   * @param context - The Azure function invocation context
   * @returns If the guard fails, it should return a HttpResponseInit object or false. If the guard passes, return true.
   */
  check: (request: HttpRequest, context: InvocationContext) => ChainLinkResult;
};
