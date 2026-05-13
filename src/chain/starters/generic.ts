import { BasicTriggerChain } from '../basic-trigger-chain';
import { ResponseType } from '../types';

/**
 * Initializes a fully generic chain for any trigger type.
 * Use the specific factory functions (`startHttpChain`, `startMessageChain`, etc.) when possible.
 * @param options - Optional chain options. `responseType` defaults to `'none'`.
 * @returns A `BasicTriggerChain<TTriggerData, TResponseType>`
 */
export function startGenericChain<TTriggerData>(): BasicTriggerChain<TTriggerData>;
export function startGenericChain<TTriggerData>(options: { responseType: 'http' }): BasicTriggerChain<TTriggerData, 'http'>;
export function startGenericChain<TTriggerData>(options: { responseType: 'json' }): BasicTriggerChain<TTriggerData, 'json'>;
export function startGenericChain<TTriggerData>(options: { responseType: 'none' }): BasicTriggerChain<TTriggerData>;
export function startGenericChain<TTriggerData>(options?: { responseType?: ResponseType }): BasicTriggerChain<TTriggerData, ResponseType> {
  return new BasicTriggerChain<TTriggerData, ResponseType>({ responseType: options?.responseType ?? 'none' });
}
