import { BasicTriggerChain } from '../basic-trigger-chain';
import { ResponseType } from '../types';

/**
 * Initializes a fully generic chain for any trigger type.
 * Use the specific factory functions (`startHttpChain`, `startMessageChain`, etc.) when possible.
 * @param options - Optional chain options. `responseType` defaults to `'none'`.
 * @returns A `BasicTriggerChain<T, TResponseType>`
 */
export function startGenericChain<T>(): BasicTriggerChain<T>;
export function startGenericChain<T>(options: { responseType: 'http' }): BasicTriggerChain<T, 'http'>;
export function startGenericChain<T>(options: { responseType: 'json' }): BasicTriggerChain<T, 'json'>;
export function startGenericChain<T>(options: { responseType: 'none' }): BasicTriggerChain<T>;
export function startGenericChain<T>(options?: { responseType?: ResponseType }): BasicTriggerChain<T, ResponseType> {
  return new BasicTriggerChain<T, ResponseType>({ responseType: options?.responseType ?? 'none' });
}
