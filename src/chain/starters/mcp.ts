import { InvocationContext } from '@azure/functions';
import { ZodType } from 'zod';
import { ParsedDataChain } from '../parsed-data-chain';
import { BasicChainData } from '../types';

/**
 * Initializes a new MCP chain for MCP tool triggers.
 * MCP triggers return JSON-style responses. Tool arguments are parsed from `context.triggerMetadata?.mcptoolargs`.
 * @returns A `ParsedDataChain<unknown, TArgs, 'json'>`
 */
export function startMcpChain<TArgs>(): ParsedDataChain<unknown, TArgs, 'json'>;
/**
 * Initializes a new MCP chain with Zod validation for the tool arguments.
 * @param zodSchema - The Zod schema to validate the tool arguments
 * @returns A `ParsedDataChain<unknown, TArgs, 'json'>`
 */
export function startMcpChain<TArgs>(zodSchema: ZodType<TArgs>): ParsedDataChain<unknown, TArgs, 'json'>;
export function startMcpChain<TArgs>(zodSchema?: ZodType<TArgs>) {
  const dataAccessor = async (chainData: BasicChainData) => {
    const context = chainData.context as InvocationContext & { triggerMetadata?: Record<string, unknown> };
    return context.triggerMetadata?.mcptoolargs as TArgs;
  };
  return new ParsedDataChain<unknown, TArgs, 'json'>(dataAccessor, zodSchema, { responseType: 'json' });
}
