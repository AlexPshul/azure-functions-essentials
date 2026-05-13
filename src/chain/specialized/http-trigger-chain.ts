import { HttpRequest, InvocationContext } from '@azure/functions';
import { ZodType } from 'zod';
import { FunctionChain, isChainFailure } from '../function-chain';
import { ParsedDataChain } from '../parsed-data-chain';
import { BasicChainData, ChainHandlerFor, ChainWrapper, LinkFunctor } from '../types';

export class HttpTriggerChain extends FunctionChain<BasicChainData<HttpRequest>, 'http'> {
  constructor() {
    super({ responseType: 'http' });
  }

  /**
   * Parses the body of the HTTP request using the request.json() call.
   * After this call, the parsed body will be available in the chain data as `parsedData`.
   *
   * (!) DO NOT use request.json() if you use this method.
   *
   * @param zodType - The Zod schema to use for validating the body object. (Optional)
   * @returns A ParsedDataChain with the parsed body available as `parsedData`
   */
  public parseBody<TBody>(zodType?: ZodType<TBody>): ParsedDataChain<HttpRequest, TBody, 'http'>;
  public parseBody<TBody>(
    zodType?: LinkFunctor<BasicChainData<HttpRequest>, ZodType<TBody>>,
  ): ParsedDataChain<HttpRequest, TBody, 'http'>;
  public parseBody<TBody>(zodType?: ZodType<TBody> | LinkFunctor<BasicChainData<HttpRequest>, ZodType<TBody>>) {
    const accessor = async (chainData: BasicChainData<HttpRequest>) => (await chainData.triggerData.json()) as TBody;
    return new ParsedDataChain<HttpRequest, TBody, 'http'>(this.options, this, accessor, zodType);
  }

  public override handle<TResultBody = undefined>(
    handler: ChainHandlerFor<'http', BasicChainData<HttpRequest>, TResultBody>,
  ): ChainWrapper<HttpRequest, 'http', TResultBody> {
    return (async (triggerData: HttpRequest, context: InvocationContext) => {
      const chainResult = await this.executeChain({ triggerData, context });

      if (isChainFailure(chainResult)) return this.handleFailure(chainResult);

      const result = await handler(chainResult);
      return this.handleResult(result);
    }) as ChainWrapper<HttpRequest, 'http', TResultBody>;
  }
}
