import { FunctionResult, HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { ZodType } from 'zod';
import { funcResult } from '../helpers';
import { BaseChain } from './base-chain';
import { ParsedBodyChain } from './parsed-body-chain';
import { BasicChainData, LinkFunctor, SpecificHttpResponseInit } from './types';

export type SpecificHttpHandler<TBody> = (
  request: HttpRequest,
  context: InvocationContext,
) => FunctionResult<SpecificHttpResponseInit<TBody> | void | undefined>;

export class RegularChain extends BaseChain {
  /**
   * Parses the body of the HTTP request using the request.json() call.
   * After this call, the body will be available in the chain data.
   *
   * (!) DO NOT use request.json() if you use this method.
   *
   * @param zodType - The Zod schema to use for validating the body object. (Optional)
   * @returns A variation of the Azure function handler chain that can now access the request body
   */
  public parseBody<TBody>(zodType?: ZodType<TBody>): ParsedBodyChain<TBody>;
  /**
   * Parses the body of the HTTP request using the request.json() call.
   * After this call, the body will be available in the chain data.
   *
   * (!) DO NOT use request.json() if you use this method.
   *
   * @param zodType - A function that returns a Zod schema to use for validating the body object. (Optional)
   * @returns A variation of the Azure function handler chain that can now access the request body
   */
  public parseBody<TBody>(zodType?: LinkFunctor<BasicChainData, ZodType<TBody>>): ParsedBodyChain<TBody>;
  public parseBody<TBody>(zodType?: ZodType<TBody> | LinkFunctor<BasicChainData, ZodType<TBody>>) {
    const parsedBodyChain = new ParsedBodyChain<TBody>(zodType);
    return parsedBodyChain.copyFromChain(this, data => data);
  }

  /**
   * Registers a handler for the Azure function handler chain.
   * @param handler - The handler function to be executed after the chain is executed. Contains the request, and the context.
   * @returns A function that satisfies the HttpHandler interface to pass to the Azure function handler property.
   */
  public handle<TResultBody = undefined>(handler: SpecificHttpHandler<TResultBody>): HttpHandler {
    return async (request, context) => {
      const failedGuardResult = await this.executeChain({ request, context });
      return failedGuardResult || (await handler(request, context)) || funcResult('OK');
    };
  }
}
