import { HttpRequest } from '@azure/functions';

/**
 * Retrieves the value of a query parameter from an HTTP request.
 *
 * @param request - The HTTP request object.
 * @param key - The key of the query parameter to retrieve.
 * @param optional - Whether the query parameter is optional. Defaults to `false`.
 *
 * @returns The value of the query parameter as a string. If the parameter is optional and not present, returns `null`.
 *
 * @throws Will throw an error if the query parameter is required and not present.
 * @example
 * const value = getQuery(request, 'paramName'); // paramName is required and will throw exception if not present
 * const optionalValue = getQuery(request, 'optionalParam', true); // optionalParam is optional and will return null if not present
 */
export function getQuery(request: HttpRequest, key: string, optional?: false | undefined): string;
/**
 * Retrieves the value of a query parameter from an HTTP request.
 *
 * @param request - The HTTP request object.
 * @param key - The key of the query parameter to retrieve.
 * @param optional - Whether the query parameter is optional. Defaults to `false`.
 *
 * @returns The value of the query parameter as a string. If the parameter is optional and not present, returns `null`.
 *
 * @throws Will throw an error if the query parameter is required and not present.
 * @example
 * const value = getQuery(request, 'paramName'); // paramName is required and will throw exception if not present
 * const optionalValue = getQuery(request, 'optionalParam', true); // optionalParam is optional and will return null if not present
 */
export function getQuery(request: HttpRequest, key: string, optional: true): string | null;
export function getQuery(request: HttpRequest, key: string, optional = false) {
  const rawValue = request.query.get(key);
  if (rawValue !== null || optional) return rawValue;

  throw new Error(`[${key}] query param is required`);
}

/**
 * Retrieves the flag value of a query parameter from an HTTP request and converts it to a boolean.
 *
 * @param request - The HTTP request object.
 * @param key - The key of the query parameter to retrieve.
 *
 * @returns The value of the query parameter as a boolean. Returns `true` if the value is not null and not equal to 'false'.
 *
 * @example
 * const isEnabled = getQueryFlag(request, 'enabled'); // returns true if enabled is present and not 'false'
 */
export const getQueryFlag = (request: HttpRequest, key: string) => {
  const value = getQuery(request, key, true);
  return value !== null && value.toLowerCase() !== 'false';
};
