import { getHeaderArray } from '../../helpers';
import { DEFAULT_WRONG_HEADER_RESPONSE } from './consts';
import { guard } from './guard';

/**
 * Checks if all specified values are present in the given header.
 * @param header - The name of the header to check
 * @param values - The values to check for in the header
 * @param separator - The separator used to split the header values
 * @returns A guard function that validates the presence of values in the header
 */
export const allValuesHeaderGuard = (header: string, values: string[], separator = ',') =>
  guard((req, context) => {
    const headerArray = getHeaderArray(req, header, separator);

    if (values.every(value => headerArray.includes(value))) return true;

    context.error(`Header ${header} is missing required values: ${values.join(', ')}`);
    return DEFAULT_WRONG_HEADER_RESPONSE;
  });

/**
 * Checks if the header contains all specified values and no extra values. (Order is ignored)
 * @param header - The name of the header to check
 * @param values - The values to check for in the header
 * @param separator - The separator used to split the header values
 * @returns A guard function that validates the presence of values in the header
 */
export const exactValuesHeaderGuard = (header: string, values: string[], separator = ',') =>
  guard((req, context) => {
    const headerArray = getHeaderArray(req, header, separator);

    if (headerArray.length === values.length && values.every(value => headerArray.includes(value))) return true;

    context.error(`Header ${header} does not exactly match required values: ${values.join(', ')}`);
    return DEFAULT_WRONG_HEADER_RESPONSE;
  });

/**
 * Checks if at least one of the specified values is present in the given header.
 * @param header - The name of the header to check
 * @param values - The values to check for in the header
 * @param separator - The separator used to split the header values
 * @return A guard function that validates the presence of values in the header
 * */
export const atLeastOneHeaderGuard = (header: string, values: string[], separator = ',') =>
  guard((req, context) => {
    const headerArray = getHeaderArray(req, header, separator);

    if (values.some(value => headerArray.includes(value))) return true;

    context.error(`Header ${header} is missing at least one of the required values: ${values.join(', ')}`);
    return DEFAULT_WRONG_HEADER_RESPONSE;
  });
