import { ZodType } from 'zod';
import { FunctionChain } from '../function-chain';
import { mcpArgsTransformer } from '../transformers';
import { BasicChainData } from '../types';

/**
 * Initializes a new MCP chain for MCP tool triggers.
 * MCP triggers return JSON-style responses. Tool arguments are parsed from `context.triggerMetadata?.mcptoolargs`.
 * @returns A `FunctionChain` with MCP args available as `parsedData`
 */
export function startMcpChain<TArgs>(): FunctionChain<unknown, 'json', BasicChainData & { parsedData: TArgs }>;
/**
 * Initializes a new MCP chain with Zod validation for the tool arguments.
 * @param zodSchema - The Zod schema to validate the tool arguments
 * @returns A `FunctionChain` with validated MCP args available as `parsedData`
 */
export function startMcpChain<TArgs>(zodSchema: ZodType<TArgs>): FunctionChain<unknown, 'json', BasicChainData & { parsedData: TArgs }>;
export function startMcpChain<TArgs>(zodSchema?: ZodType<TArgs>) {
  return new FunctionChain<unknown, 'json'>({ responseType: 'json' }).useTransformer(mcpArgsTransformer<TArgs>(zodSchema));
}
