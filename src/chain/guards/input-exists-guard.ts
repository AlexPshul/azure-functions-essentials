import { FunctionInput } from '@azure/functions';
import { funcResult } from '../../helpers';
import { guard } from './guard';

const notFoundError = (input: string | FunctionInput) => {
  const inputName = typeof input === 'string' ? input : input.name;
  return funcResult('NotFound', `No data found for [${inputName}].`);
};

/**
 * Validates the existence of a value in an Azure Functions input binding that was passed as an extra input.
 * Only undefined and null are considered non-existent. A flag can be passed to also check if the value is an empty array.
 * @param input - The name of the input to check for existence.
 * @param failOnEmptyArray - A flag indicating whether to consider an empty array as non-existent.
 * @returns A boolean indicating whether the input exists.
 */
export const validateInputExistsGuard = (input: string | FunctionInput, failOnEmptyArray = true) =>
  guard((_, context) => {
    const inputResult = context.extraInputs.get(input);

    if (inputResult === undefined || inputResult === null) return notFoundError(input);
    if (failOnEmptyArray && Array.isArray(inputResult) && inputResult.length === 0) return notFoundError(input);

    return true;
  });
