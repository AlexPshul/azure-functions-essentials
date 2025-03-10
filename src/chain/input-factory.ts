import { InvocationContext } from '@azure/functions';
import { InputBinding } from './types';

const get = <TResult>(key: string, context: InvocationContext) => context.extraInputs.get(key) as TResult;

type InputBindingFactory<TArgs, TResult> = Pick<InputBinding<TResult>, 'get'> & { create: (args: TArgs) => InputBinding<TResult> };
/**
 * Creates an input binding that can be used inside an Azure function chain.
 * @param key - The chain unique key to store the data in the context
 * @param dataFetch - A function that fetches data for the input binding
 * @returns An InputBindingFactory that allows creating a new binding instance but also getting the input binding data from the context
 *
 * @example
 * ```ts
 * const upperCaseInput = inputFactory<string, string>('upperCase', async from => from.toUpperCase());
 *
 * app.get('/to-upper-case', {
 *   handler: startChain()
 *     .useInputBinding(({ request }) => upperCaseInput.create(getQuery(request, 'text')))
 *     .handle((_, context) => funcResult('Ok', upperCaseInput.get(context)));
 * });
 *
 * // GET: http://localhost:7071/api/to-upper-case?text=hello
 * // RESPONSE: { status: 200, body: 'HELLO' }
 */
export const inputFactory = <TArgs, TResult>(key: string, dataFetch: (args: TArgs) => Promise<TResult>): InputBindingFactory<TArgs, TResult> => ({
  get: context => get<TResult>(key, context),
  create: args => ({
    get: context => get<TResult>(key, context),
    set: async context => {
      const data = await dataFetch(args);
      context.extraInputs.set(key, data);
      return true;
    },
  }),
});
