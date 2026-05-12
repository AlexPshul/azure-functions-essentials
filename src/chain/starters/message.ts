import { ZodType } from 'zod';
import { FunctionChain } from '../function-chain';
import { zodTransformer } from '../transformers';
import { BasicChainData } from '../types';

/**
 * Initializes a new message chain for message-based triggers (Service Bus, Event Hub, etc.).
 * Without a Zod schema, the type is trusted (no validation).
 * @returns A `FunctionChain<T>`
 */
export function startMessageChain<T>(): FunctionChain<T>;
/**
 * Initializes a new validated message chain for message-based triggers.
 * With a Zod schema, the raw trigger data is validated via a Transformer before guards and handler.
 * @param zodSchema - The Zod schema to validate the trigger data
 * @returns A `FunctionChain` with validated data available as `parsedData`
 */
export function startMessageChain<T>(
  zodSchema: ZodType<T>,
): FunctionChain<unknown, 'none', BasicChainData & { parsedData: T }, BasicChainData>;
export function startMessageChain<T>(zodSchema?: ZodType<T>) {
  const chain = new FunctionChain<unknown>({ responseType: 'none' });
  if (zodSchema) return chain.useTransformer(zodTransformer(zodSchema));
  return chain as FunctionChain<T>;
}
