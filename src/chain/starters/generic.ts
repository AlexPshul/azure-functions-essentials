import { FunctionChain } from '../function-chain';
import { ResponseType } from '../types';

/**
 * Initializes a fully generic chain for any trigger type.
 * Use the specific factory functions (`startHttpChain`, `startMessageChain`, etc.) when possible.
 * @param options - Optional chain options. `responseType` defaults to `'none'`.
 * @returns A `FunctionChain<T, TResponseType>`
 */
export function startGenericChain<T>(): FunctionChain<T>;
export function startGenericChain<T>(options: { responseType: 'http' }): FunctionChain<T, 'http'>;
export function startGenericChain<T>(options: { responseType: 'json' }): FunctionChain<T, 'json'>;
export function startGenericChain<T>(options: { responseType: 'none' }): FunctionChain<T>;
export function startGenericChain<T>(options?: { responseType?: ResponseType }): FunctionChain<T, ResponseType> {
  return new FunctionChain<T, ResponseType>({ responseType: options?.responseType ?? 'none' });
}
