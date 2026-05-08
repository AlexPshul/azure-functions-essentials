import { ZodType } from 'zod';
import { ParsedDataChain } from '../parsed-data-chain';

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
  return new ParsedDataChain(({ context }) => context.triggerMetadata?.mcptoolargs as TArgs, zodSchema, { responseType: 'json' });
}
