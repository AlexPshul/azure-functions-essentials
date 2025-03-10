import { FunctionInput, InvocationContext } from '@azure/functions';

/**
 * Retrieves a typed input from the context's extraInputs
 *
 * @template T - The expected type of the input.
 * @param {InvocationContext} context - The invocation context containing the extra inputs.
 * @param {string | FunctionInput} name - The name of the input to retrieve.
 * @returns {T} - The input cast to the expected type.
 */
export const getInput = <T>(context: InvocationContext, name: string | FunctionInput): T => context.extraInputs.get(name) as T;

/**
 * Retrieves an item from an array input in the context's extraInputs by name and index.
 *
 *
 * @template T - The expected type of the input item.
 * @param {InvocationContext} context - The invocation context containing the extra inputs.
 * @param {string | FunctionInput} name - The name of the input array to retrieve the item from.
 * @param {number} [index=0] - The index of the item to retrieve from the input array. Defaults to 0.
 * @returns {T} - The input item cast to the expected type.
 *
 * @example
 * const context = {
 *   extraInputs: new Map([
 *     ['numbers', [1, 2, 3]],
 *     ['strings', ['a', 'b', 'c']]
 *   ])
 * } as InvocationContext;
 *
 * const firstNumber = getInputItem<number>(context, 'numbers'); // 1
 * const secondString = getInputItem<string>(context, 'strings', 1); // 'b'
 */
export const getInputItem = <T>(context: InvocationContext, name: string | FunctionInput, index = 0): T => getInput<T[]>(context, name)[index];
