import { HttpRequest } from '@azure/functions';
import { funcResult } from '../../helpers';
import { getHeaderFlag } from '../../helpers/get-header';
import { DEFAULT_WRONG_HEADER_RESPONSE } from './consts';
import { guard } from './guard';

/**
 * Creates a guard that checks if a specific header exists with a truthful value.
 * The header is considered truthful if it is present and its value is not "false" (case-insensitive).
 *
 * @param headerName - The name of the header to check
 * @returns A guard that checks if the header exists and has a truthful value
 *
 * @example
 * // Check if x-feature-enabled header is truthful
 * const featureEnabledGuard = headerFlagGuard('x-feature-enabled');
 */
export const headerFlagGuard = (headerName: string) =>
  guard<HttpRequest>(({ triggerData, context }) => {
    try {
      const headerValue = getHeaderFlag(triggerData, headerName);

      if (headerValue) return true;

      // Log the actual values for debugging but don't expose in the response
      context.error(`Missing the flag [${headerName}] in the request headers.`);

      return DEFAULT_WRONG_HEADER_RESPONSE;
    } catch (error) {
      return error instanceof Error
        ? funcResult('Forbidden', error.message)
        : funcResult('Forbidden', 'Header validation failed for an unknown reason.');
    }
  });
