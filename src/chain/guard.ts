import { Guard } from './types';

/**
 * Creates a guard instance with a check function.
 * The check function should return a boolean or a HttpResponseInit object.
 *
 * If the check fails, it should return a HttpResponseInit object or false.
 * If the check passes, return true.
 * @param check - The guard check function to check the request and/or the context of the function
 * @returns A guard instance
 */
export const guard = (check: Guard['check']): Guard => ({ check });
