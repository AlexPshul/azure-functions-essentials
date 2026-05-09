import { HttpRequest } from '@azure/functions';
import { ZodType } from 'zod';
import { funcResult } from '../../helpers';
import { FunctionChain } from '../function-chain';
import { transformer } from '../transformers';
import { BasicChainData, LinkFunctor, TransformerResult } from '../types';

/**
 * A chain specialized for HTTP triggers.
 * Extends `FunctionChain<HttpRequest, 'http'>` and adds `parseBody()` for parsing the request body.
 */
export class HttpChain extends FunctionChain<HttpRequest, 'http'> {
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
  public parseBody<TBody>(zodType?: ZodType<TBody>): FunctionChain<HttpRequest, 'http', BasicChainData<HttpRequest> & { parsedData: TBody }>;
  /**
   * Parses the body of the HTTP request using the request.json() call.
   * After this call, the parsed body will be available in the chain data as `parsedData`.
   *
   * (!) DO NOT use request.json() if you use this method.
   *
   * @param zodType - A function that returns a Zod schema to use for validating the body object. (Optional)
   * @returns A variation of the Azure function handler chain that can now access the parsed body
   */
  public parseBody<TBody>(
    zodType?: LinkFunctor<BasicChainData<HttpRequest>, ZodType<TBody>>,
  ): FunctionChain<HttpRequest, 'http', BasicChainData<HttpRequest> & { parsedData: TBody }>;
  public parseBody<TBody>(zodType?: ZodType<TBody> | LinkFunctor<BasicChainData<HttpRequest>, ZodType<TBody>>) {
    type ParsedHttpData = BasicChainData<HttpRequest> & { parsedData: TBody };

    const bodyTransformer = transformer<BasicChainData<HttpRequest>, ParsedHttpData>(
      async (chainData): Promise<TransformerResult<ParsedHttpData>> => {
        let rawData: TBody;
        try {
          rawData = (await chainData.triggerData.json()) as TBody;
        } catch {
          chainData.context.error('Failed to parse data');
          return { error: funcResult('BadRequest', 'Failed to parse data') };
        }

        if (!zodType) return { ...chainData, parsedData: rawData };

        const zodInstance = typeof zodType === 'function' ? zodType(chainData) : zodType;
        const parseResult = zodInstance.safeParse(rawData);
        if (!parseResult.success) {
          chainData.context.error('Invalid data', parseResult.error.issues);
          return { error: funcResult('BadRequest', parseResult.error.issues) };
        }

        return { ...chainData, parsedData: parseResult.data };
      },
    );

    return this.useTransformer(bodyTransformer);
  }
}
