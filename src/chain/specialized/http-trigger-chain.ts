import { HttpRequest, InvocationContext } from '@azure/functions';
import { ZodType } from 'zod';
import { FunctionChain } from '../function-chain';
import { ParsedDataChain } from '../parsed-data-chain';
import { BasicChainData, DataAccessor, LinkFunctor } from '../types';

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
   * @param zodType - The Zod schema or a function returning one, to validate the body object. (Optional)
   * @returns A ParsedDataChain with the parsed body available as `parsedData`
   */
  public parseBody<TBody>(zodType?: ZodType<TBody>): ParsedDataChain<HttpRequest, TBody, 'http'>;
  public parseBody<TBody>(zodType?: LinkFunctor<BasicChainData<HttpRequest>, ZodType<TBody>>): ParsedDataChain<HttpRequest, TBody, 'http'>;
  public parseBody<TBody>(zodType?: ZodType<TBody> | LinkFunctor<BasicChainData<HttpRequest>, ZodType<TBody>>) {
    const accessor: DataAccessor<HttpRequest, TBody> = async ({ triggerData }) => (await triggerData.json()) as TBody;
    return new ParsedDataChain<HttpRequest, TBody, 'http'>(this.options, this, accessor, zodType);
  }

  protected prepareChain(triggerData: HttpRequest, context: InvocationContext): BasicChainData<HttpRequest> {
    return { triggerData, context };
  }
}
