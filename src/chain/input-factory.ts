import { InvocationContext } from '@azure/functions';
import { InputBindingSetter } from './types';

type Getters<TResult> = {
  get: (context: InvocationContext) => TResult;
  getNamed: (context: InvocationContext, name: string) => TResult;
};
type Creators<TArgs> = {
  create: (args: TArgs) => InputBindingSetter;
  createNamed: (args: TArgs, name: string) => InputBindingSetter;
};

type InputBinding<TArgs, TResult> = Getters<TResult> & Creators<TArgs>;
/**
 * Creates an input binding that can be used inside an Azure function chain.
 * @param key - The chain unique key to store the data in the context
 * @param dataFetch - A function that fetches data for the input binding
 * @returns An InputBinding that allows creating a new binding instance but also getting the input binding data from the context
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
export const inputFactory = <TArgs, TResult>(key: string, dataFetch: (args: TArgs) => Promise<TResult>): InputBinding<TArgs, TResult> => {
  const getNamed: Getters<TResult>['getNamed'] = (context, name) => context.extraInputs.get(`${key}-${name}`) as TResult;
  const createNamed: Creators<TArgs>['createNamed'] = (args, name) => ({
    set: async context => {
      const data = await dataFetch(args);
      context.extraInputs.set(`${key}-${name}`, data);
      return true;
    },
  });

  return {
    getNamed,
    get: context => getNamed(context, 'default'),
    createNamed,
    create: args => createNamed(args, 'default'),
  };
};
