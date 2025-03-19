import { funcResult } from '../../helpers';
import { getHeader } from '../../helpers/get-header';
import { guard } from './guard';

/**
 * Creates a guard that checks if a specific header exists with the expected string value.
 *
 * @param headerName - The name of the header to check
 * @param expectedValue - The expected string value of the header
 * @returns A guard that checks if the header exists and has the expected value
 *
 * @example
 * // Check if Content-Type header is 'application/json'
 * const jsonContentGuard = headerGuard('Content-Type', 'application/json');
 */
export const headerGuard = (headerName: string, expectedValue: string) =>
  guard((req, ctx) => {
    try {
      const headerValue = getHeader(req, headerName, true);

      if (headerValue === expectedValue) return true;

      ctx.log(`Header [${headerName}] has unexpected value. Expected: ${expectedValue}, Actual: ${headerValue}`);

      return funcResult('Forbidden', 'Missing or invalid header');
    } catch (error) {
      return error instanceof Error
        ? funcResult('Forbidden', error.message)
        : funcResult('Forbidden', 'Header validation failed for an unknown reason.');
    }
  });
