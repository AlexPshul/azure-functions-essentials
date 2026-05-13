import { ZodType } from 'zod';
import { BasicTriggerChain } from '../basic-trigger-chain';

/**
 * Initializes a new validated message chain for message-based triggers.
 * With a Zod schema, the raw trigger data is validated before guards, bindings and handler.
 * @param zodSchema - The Zod schema to validate the trigger data
 * @returns A `BasicTriggerChain` with typed trigger data and no response
 */
export function startMessageChain<TTriggerData>(zodSchema?: ZodType<TTriggerData>) {
  return new BasicTriggerChain<TTriggerData>({ responseType: 'none', zodSchema });
}
