import { getHeaderArray } from '../../helpers';
import { guard } from './guard';

/**
 * Checks if all specified values are present in the given header.
 * @param header - The name of the header to check
 * @param values - The values to check for in the header
 * @param separator - The separator used to split the header values
 * @returns A guard function that validates the presence of values in the header
 */
export const headerAllValuesGuard = (header: string, values: string[], separator = ',') =>
  guard(req => {
    const headerArray = getHeaderArray(req, header, separator);

    return values.every(value => headerArray.includes(value));
  });
