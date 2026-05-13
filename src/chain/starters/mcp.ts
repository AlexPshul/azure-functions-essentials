import { ZodType } from 'zod';
import { BasicTriggerChain } from '../basic-trigger-chain';
import { ParsedDataChain } from '../parsed-data-chain';
import { BasicChainData } from '../types';

/**
 * Initializes a new MCP chain for MCP tool triggers.
 * MCP triggers return JSON-style responses. Tool arguments are parsed from `context.triggerMetadata?.mcptoolargs`.
 * @returns A `ParsedDataChain` with MCP args available as `parsedData`
 */
export function startMcpChain<TArgs>(): ParsedDataChain<unknown, TArgs, 'json'>;
/**
 * Initializes a new MCP chain with Zod validation for the tool arguments.
 * @param zodSchema - The Zod schema to validate the tool arguments
 * @returns A `ParsedDataChain` with validated MCP args available as `parsedData`
 */
export function startMcpChain<TArgs>(zodSchema: ZodType<TArgs>): ParsedDataChain<unknown, TArgs, 'json'>;
export function startMcpChain<TArgs>(zodSchema?: ZodType<TArgs>) {
  const mcpAccessor = ({ context }: BasicChainData) => context.triggerMetadata?.mcptoolargs as TArgs;
  if (zodSchema) return new BasicTriggerChain<unknown, 'json'>({ responseType: 'json' }).parseData(mcpAccessor, zodSchema);
  return new BasicTriggerChain<unknown, 'json'>({ responseType: 'json' }).parseData(mcpAccessor);
}
