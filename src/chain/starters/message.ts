import { ZodType } from 'zod';
import { RegularChain } from '../regular-chain';
import { ValidatedChain } from '../specialized';

/**
 * Initializes a new message chain for message-based triggers (Service Bus, Event Hub, etc.).
 * Without a Zod schema, the type is trusted (no validation).
 * @returns A `RegularChain<T, 'none'>`
 */
export function startMessageChain<T>(): RegularChain<T, 'none'>;
/**
 * Initializes a new validated message chain for message-based triggers.
 * With a Zod schema, the raw trigger data is validated before guards and handler.
 * @param zodSchema - The Zod schema to validate the trigger data
 * @returns A `ValidatedChain<T, 'none'>`
 */
export function startMessageChain<T>(zodSchema: ZodType<T>): ValidatedChain<T, 'none'>;
export function startMessageChain<T>(zodSchema?: ZodType<T>): RegularChain<T, 'none'> | ValidatedChain<T, 'none'> {
  return zodSchema ? new ValidatedChain(zodSchema, { responseType: 'none' }) : new RegularChain<T, 'none'>({ responseType: 'none' });
}
