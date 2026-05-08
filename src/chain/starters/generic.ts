import { RegularChain } from '../regular-chain';
import { ResponseType } from '../types';

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
  return new RegularChain<T, ResponseType>({ responseType: options?.responseType ?? 'none' });
}
