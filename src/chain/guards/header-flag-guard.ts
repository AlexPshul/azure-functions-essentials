import { funcResult } from '../../helpers';
import { getHeaderFlag } from '../../helpers/get-header';
import { DEFAULT_WRONG_HEADER_RESPONSE } from './consts';
import { guard } from './guard';

/**
 * Creates a guard that checks if a specific header flag has the expected boolean value.
 *
 * @param headerName - The name of the header to check
 * @param expectedValue - The expected boolean value of the header flag
 * @returns A guard that checks if the header exists and has the expected boolean value
 *
 * @example
 * // Check if x-feature-enabled header is true
 * const featureEnabledGuard = headerFlagGuard('x-feature-enabled', true);
 */
export const headerFlagGuard = (headerName: string) =>
  guard((req, ctx) => {
    try {
      const headerValue = getHeaderFlag(req, headerName);

      if (headerValue) return true;

      // Log the actual values for debugging but don't expose in the response
      ctx.error(`Missing the flag [${headerName}] in the request headers.`);

      return DEFAULT_WRONG_HEADER_RESPONSE;
    } catch (error) {
      return error instanceof Error
        ? funcResult('Forbidden', error.message)
        : funcResult('Forbidden', 'Header validation failed for an unknown reason.');
    }
  });
