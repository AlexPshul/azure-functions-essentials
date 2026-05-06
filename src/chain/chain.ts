import { Timer } from '@azure/functions';
import { ZodType } from 'zod';
import { RegularChain } from './regular-chain';
import { HttpChain, McpChain, ValidatedChain } from './specialized';
import { ResponseType } from './types';

/**
 * Initializes a new HTTP chain for Azure Functions HTTP triggers.
 * Replaces the old `startChain()` for HTTP handlers.
 * @returns An `HttpChain` with `parseBody()` support
 * @example
 * ```ts
 * app.post('knock-knock', {
 *   handler: startHttpChain()
 *    .useGuard(new MyGuard())
 *    .parseBody(myZodSchema)
 *    .handle((triggerData, parsedData, context) => {
 *      return funcResult('Ok', 'Follow the white rabbit');
 *    });
 * });
 * ```
 */
export const startHttpChain = () => new HttpChain();

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
  if (zodSchema) return new ValidatedChain<T, 'none'>(zodSchema, 'none');
  return new RegularChain<T, 'none'>('none');
}

/**
 * Initializes a new timer chain for Azure Functions timer triggers.
 * @returns A `RegularChain<Timer, 'none'>`
 */
export const startTimerChain = () => new RegularChain<Timer, 'none'>('none');

/**
 * Initializes a new MCP chain for MCP tool triggers.
 * MCP triggers return HTTP-style responses. Use `parseArgs()` to access tool arguments.
 * @returns An `McpChain` with `parseArgs()` support
 */
export const startMcpChain = () => new McpChain();

/**
 * Initializes a fully generic chain for any trigger type.
 * Use the specific factory functions (`startHttpChain`, `startMessageChain`, etc.) when possible.
 * @param options - Optional chain options. `responseType` defaults to `'none'`.
 * @returns A `RegularChain<T, TResponseType>`
 */
export const startGenericChain = <T, TResponseType extends ResponseType = 'none'>(options?: { responseType?: TResponseType }) =>
  new RegularChain<T, TResponseType>((options?.responseType ?? 'none') as TResponseType);
