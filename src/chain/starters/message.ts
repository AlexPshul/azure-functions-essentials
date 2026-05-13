import { ZodType } from 'zod';
import { BasicTriggerChain } from '../basic-trigger-chain';
import { ParsedDataChain } from '../parsed-data-chain';

/**
 * Initializes a new message chain for message-based triggers (Service Bus, Event Hub, etc.).
 * Without a Zod schema, the type is trusted (no validation).
 * @returns A `BasicTriggerChain<T>`
 */
export function startMessageChain<T>(): BasicTriggerChain<T>;
/**
 * Initializes a new validated message chain for message-based triggers.
 * With a Zod schema, the raw trigger data is validated via a DataAccessor before guards and handler.
 * @param zodSchema - The Zod schema to validate the trigger data
 * @returns A `ParsedDataChain` with validated data available as `parsedData`
 */
export function startMessageChain<T>(zodSchema: ZodType<T>): ParsedDataChain<unknown, T, 'none'>;
export function startMessageChain<T>(zodSchema?: ZodType<T>) {
  const chain = new BasicTriggerChain<unknown>({ responseType: 'none' });
  if (zodSchema) return chain.parseData(({ triggerData }) => triggerData as T, zodSchema);
  return chain as BasicTriggerChain<T>;
}
