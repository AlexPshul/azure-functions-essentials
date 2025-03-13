import { FunctionResult, HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { ZodType } from 'zod';
import { funcResult } from '../helpers';
import { BaseChain } from './base-chain';
import { BasicChainData, LinkFunctor, SpecificHttpResponseInit } from './types';

type SpecificBodyHttpHandler<TBody, TResultBody> = (
  request: HttpRequest,
  body: TBody,
  context: InvocationContext,
) => FunctionResult<SpecificHttpResponseInit<TResultBody> | void | undefined>;

type BodyChainData<TBody> = BasicChainData & { body: TBody };

/**
 * An Azure function handler chain that has a parsed body from the request.
 */
export class ParsedBodyChain<TBody> extends BaseChain<BodyChainData<TBody>> {
  /**
   * Constructs a new ParsedBodyChain with an optional ZodType or LinkFunctor for body validation.
   * @param zodType - The Zod validation type or a function that returns a ZodType.
   */
  constructor(private readonly zodType: ZodType<TBody> | LinkFunctor<BasicChainData, ZodType<TBody>> | undefined) {
    super();
  }

  /**
   * Registers a handler for the Azure function handler chain.
   * @param handler - The handler function to be executed after the chain is executed. Contains the request, the parsed body, and the context.
   * @returns A function that satisfies the HttpHandler interface to pass to the Azure function handler property.
   */
  public handle<TResultBody = undefined>(handler: SpecificBodyHttpHandler<TBody, TResultBody>): HttpHandler {
    return async (request, context) => {
      const unknownBody = await request.json();
      let body: TBody;

      if (!this.zodType) body = unknownBody as TBody;
      else {
        const zodInstance = typeof this.zodType === 'function' ? this.zodType({ request, context }) : this.zodType;
        const parseResult = zodInstance.safeParse(unknownBody);
        if (!parseResult.success) {
          context.error('Invalid body', parseResult.error.issues);
          return funcResult('BadRequest', parseResult.error.issues);
        }
        body = parseResult.data;
      }

      const failedGuardResult = await this.executeChain({ request, context, body });
      return failedGuardResult || (await handler(request, body, context)) || funcResult('OK');
    };
  }
}
