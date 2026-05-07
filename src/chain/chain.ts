import { InvocationContext, Timer } from '@azure/functions';
import { ZodType } from 'zod';
import { ParsedDataChain } from './parsed-data-chain';
import { RegularChain } from './regular-chain';
import { ValidatedChain } from './specialized';
import { BasicChainData, LinkFunctor, ResponseType } from './types';
import { HttpChain } from './specialized';

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
  if (zodSchema) return new ValidatedChain<T, 'none'>(zodSchema, { responseType: 'none' });
  return new RegularChain<T, 'none'>({ responseType: 'none' });
}

/**
 * Initializes a new timer chain for Azure Functions timer triggers.
 * @returns A `RegularChain<Timer, 'none'>`
 */
export const startTimerChain = () => new RegularChain<Timer, 'none'>({ responseType: 'none' });

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
/**
 * Initializes a new MCP chain with a dynamic Zod schema for the tool arguments.
 * @param zodSchema - A function that returns a Zod schema to validate the tool arguments
 * @returns A `ParsedDataChain<unknown, TArgs, 'json'>`
 */
export function startMcpChain<TArgs>(zodSchema: LinkFunctor<BasicChainData<unknown>, ZodType<TArgs>>): ParsedDataChain<unknown, TArgs, 'json'>;
export function startMcpChain<TArgs>(
  zodSchema?: ZodType<TArgs> | LinkFunctor<BasicChainData<unknown>, ZodType<TArgs>>,
): ParsedDataChain<unknown, TArgs, 'json'> {
  const dataAccessor = async (chainData: BasicChainData<unknown>) => {
    const context = chainData.context as InvocationContext & { triggerMetadata?: Record<string, unknown> };
    return context.triggerMetadata?.mcptoolargs as TArgs;
  };
  return new ParsedDataChain<unknown, TArgs, 'json'>(dataAccessor, zodSchema, { responseType: 'json' });
}

/**
 * Initializes a fully generic chain for any trigger type.
 * Use the specific factory functions (`startHttpChain`, `startMessageChain`, etc.) when possible.
 * @param options - Optional chain options. `responseType` defaults to `'none'`.
 * @returns A `RegularChain<T, TResponseType>`
 */
export function startGenericChain<T>(): RegularChain<T, 'none'>;
export function startGenericChain<T>(options: { responseType: 'http' }): RegularChain<T, 'http'>;
export function startGenericChain<T>(options: { responseType: 'json' }): RegularChain<T, 'json'>;
export function startGenericChain<T>(options: { responseType: 'none' }): RegularChain<T, 'none'>;
export function startGenericChain<T>(options?: { responseType?: ResponseType }): RegularChain<T, ResponseType> {
  return new RegularChain<T, ResponseType>({ responseType: (options?.responseType ?? 'none') as ResponseType });
}
