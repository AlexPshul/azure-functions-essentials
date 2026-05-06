import { InvocationContext } from '@azure/functions';
import { ZodType } from 'zod';
import { ParsedDataChain } from '../parsed-data-chain';
import { RegularChain } from '../regular-chain';
import { BasicChainData, LinkFunctor } from '../types';

/**
 * A chain specialized for MCP (Model Context Protocol) tool triggers.
 * MCP triggers return HTTP-style responses but receive trigger data differently.
 * Tool arguments are accessed via `context.triggerMetadata?.mcptoolargs`.
 */
export class McpChain extends RegularChain<unknown, 'http'> {
  constructor() {
    super('http');
  }

  /**
   * Parses the MCP tool arguments from `context.triggerMetadata?.mcptoolargs`.
   * After this call, the parsed arguments will be available in the chain data as `parsedData`.
   *
   * @param zodType - The Zod schema to use for validating the arguments. (Optional)
   * @returns A variation of the Azure function handler chain that can now access the parsed MCP tool arguments
   */
  public parseArgs<TArgs>(zodType?: ZodType<TArgs>): ParsedDataChain<unknown, TArgs, 'http'>;
  /**
   * Parses the MCP tool arguments from `context.triggerMetadata?.mcptoolargs`.
   * After this call, the parsed arguments will be available in the chain data as `parsedData`.
   *
   * @param zodType - A function that returns a Zod schema to use for validating the arguments. (Optional)
   * @returns A variation of the Azure function handler chain that can now access the parsed MCP tool arguments
   */
  public parseArgs<TArgs>(zodType?: LinkFunctor<BasicChainData<unknown>, ZodType<TArgs>>): ParsedDataChain<unknown, TArgs, 'http'>;
  public parseArgs<TArgs>(zodType?: ZodType<TArgs> | LinkFunctor<BasicChainData<unknown>, ZodType<TArgs>>) {
    const dataAccessor = async (chainData: BasicChainData<unknown>) => {
      const context = chainData.context as InvocationContext & { triggerMetadata?: Record<string, unknown> };
      return context.triggerMetadata?.mcptoolargs as TArgs;
    };
    const parsedDataChain = new ParsedDataChain<unknown, TArgs, 'http'>(dataAccessor, zodType, 'http');
    return parsedDataChain.copyFromChain(this, data => data);
  }
}
