import { ZodType } from 'zod';
import { BasicTriggerChain } from '../basic-trigger-chain';
import { ParsedDataChain } from '../parsed-data-chain';

/**
 * Initializes a new message chain for message-based triggers (Service Bus, Event Hub, etc.).
 * Without a Zod schema, the type is trusted (no validation).
 * @returns A `BasicTriggerChain<T>`
 */
export function startMessageChain<TTriggerData>(): BasicTriggerChain<TTriggerData>;
/**
 * Initializes a new validated message chain for message-based triggers.
 * With a Zod schema, the raw trigger data is validated via a DataAccessor before guards and handler.
 * @param zodSchema - The Zod schema to validate the trigger data
 * @returns A `ParsedDataChain` with validated data available as `parsedData`
 */
export function startMessageChain<TTriggerData>(zodSchema: ZodType<TTriggerData>): ParsedDataChain<unknown, TTriggerData, 'none'>;
export function startMessageChain<TTriggerData>(zodSchema?: ZodType<TTriggerData>) {
  return zodSchema
    ? new BasicTriggerChain({ responseType: 'none' }).parseData(({ triggerData }) => triggerData as TTriggerData, zodSchema)
    : new BasicTriggerChain<TTriggerData>({ responseType: 'none' });
}
