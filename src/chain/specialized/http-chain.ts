import { HttpRequest } from '@azure/functions';
import { ZodType } from 'zod';
import { ParsedDataChain } from '../parsed-data-chain';
import { RegularChain } from '../regular-chain';
import { BasicChainData, LinkFunctor } from '../types';

/**
 * A chain specialized for HTTP triggers.
 * Extends `RegularChain<HttpRequest, 'http'>` and adds `parseBody()` for parsing the request body.
 */
export class HttpChain extends RegularChain<HttpRequest, 'http'> {
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
   * @returns A variation of the Azure function handler chain that can now access the parsed body
   */
  public parseBody<TBody>(zodType?: ZodType<TBody>): ParsedDataChain<HttpRequest, TBody, 'http'>;
  /**
   * Parses the body of the HTTP request using the request.json() call.
   * After this call, the parsed body will be available in the chain data as `parsedData`.
   *
   * (!) DO NOT use request.json() if you use this method.
   *
   * @param zodType - A function that returns a Zod schema to use for validating the body object. (Optional)
   * @returns A variation of the Azure function handler chain that can now access the parsed body
   */
  public parseBody<TBody>(zodType?: LinkFunctor<BasicChainData<HttpRequest>, ZodType<TBody>>): ParsedDataChain<HttpRequest, TBody, 'http'>;
  public parseBody<TBody>(zodType?: ZodType<TBody> | LinkFunctor<BasicChainData<HttpRequest>, ZodType<TBody>>) {
    const dataAccessor = async (chainData: BasicChainData<HttpRequest>) => (await chainData.triggerData.json()) as TBody;
    const parsedDataChain = new ParsedDataChain<HttpRequest, TBody, 'http'>(dataAccessor, zodType, { responseType: 'http' });
    return parsedDataChain.copyFromChain(this, data => data);
  }
}
