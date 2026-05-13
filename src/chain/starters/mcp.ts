import { ZodType } from 'zod';
import { BasicTriggerChain } from '../basic-trigger-chain';
import { DataAccessor } from '../types';

const mcpAccessor =
  <TArgs>(): DataAccessor<unknown, TArgs> =>
  ({ context }) =>
    context.triggerMetadata?.mcptoolargs as TArgs;

/**
 * Initializes a new MCP chain for MCP tool triggers.
 * MCP triggers return JSON-style responses. Tool arguments are parsed from `context.triggerMetadata?.mcptoolargs`.
 * @returns A `ParsedDataChain` with MCP args available as `parsedData`
 */
export function startMcpChain<TArgs>(zodSchema?: ZodType<TArgs>) {
  return new BasicTriggerChain<unknown, 'json'>({ responseType: 'json' }).parseData(mcpAccessor<TArgs>(), zodSchema);
}
