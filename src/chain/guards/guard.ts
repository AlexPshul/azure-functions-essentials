import { Guard } from '../types';

/**
 * Creates a guard instance with a check function.
 * The check function should return a boolean or a HttpResponseInit object.
 *
 * If the check fails, it should return a HttpResponseInit object or false.
 * If the check passes, return true.
 * @param check - The guard check function to check conditions on the trigger data and/or the context
 * @returns A guard instance
 */
export const guard = <T = unknown>(check: Guard<T>['check']) => ({ check });
