import { HttpRequest } from '@azure/functions';

/**
 * Retrieves the value of a header from an HTTP request.
 *
 * @param request - The HTTP request object.
 * @param key - The key of the header to retrieve.
 * @param optional - Whether the header is optional. Defaults to `false`.
 *
 * @returns The value of the header as a string. If the header is optional and not present, returns `null`.
 *
 * @throws Will throw an error if the header is required and not present.
 * @example
 * const value = getHeader(request, 'Content-Type'); // Content-Type is required and will throw exception if not present
 * const optionalValue = getHeader(request, 'Authorization', true); // Authorization is optional and will return null if not present
 */
export function getHeader(request: HttpRequest, key: string, optional?: false | undefined): string;
/**
 * Retrieves the value of a header from an HTTP request.
 *
 * @param request - The HTTP request object.
 * @param key - The key of the header to retrieve.
 * @param optional - Whether the header is optional. Defaults to `false`.
 *
 * @returns The value of the header as a string. If the header is optional and not present, returns `null`.
 *
 * @throws Will throw an error if the header is required and not present.
 * @example
 * const value = getHeader(request, 'Content-Type'); // Content-Type is required and will throw exception if not present
 * const optionalValue = getHeader(request, 'Authorization', true); // Authorization is optional and will return null if not present
 */
export function getHeader(request: HttpRequest, key: string, optional: true): string | null;
export function getHeader(request: HttpRequest, key: string, optional = false) {
  const rawValue = request.headers.get(key);
  if (rawValue !== null || optional) return rawValue;

  throw new Error(`[${key}] header is required`);
}

/**
 * Retrieves the flag value of a header from an HTTP request and converts it to a boolean.
 *
 * @param request - The HTTP request object.
 * @param key - The key of the header to retrieve.
 *
 * @returns The value of the header as a boolean. Returns `true` if the value is not null and not equal to 'false'.
 *
 * @example
 * const isEnabled = getHeaderFlag(request, 'x-feature-enabled'); // returns true if x-feature-enabled header is present and not 'false'
 */
export const getHeaderFlag = (request: HttpRequest, key: string) => {
  const value = getHeader(request, key, true);
  return value !== null && value.toLowerCase() !== 'false';
};

/**
 * Retrieves the value of a header from an HTTP request and splits it into an array.
 * If the header does not exist, an empty array is returned.
 *
 * @param request - The HTTP request object.
 * @param key - The key of the header to retrieve.
 * @param separator - The separator to use for splitting the header value. Defaults to ','.
 *
 * @returns An array of strings. If the header doesn't exist, returns an empty array.
 *
 * @example
 * const values = getHeaderArray(request, 'Accept'); // Splits on commas by default
 * const customSplit = getHeaderArray(request, 'Accept', ';'); // Uses semicolon as separator
 */
export const getHeaderArray = (request: HttpRequest, key: string, separator = ','): string[] => {
  const value = getHeader(request, key, true);
  if (value === null) return [];

  return value
    .split(separator)
    .map(item => item.trim())
    .filter(item => item.length > 0);
};
