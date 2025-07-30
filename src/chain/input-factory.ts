import { InvocationContext } from '@azure/functions';
import { InputBindingSetter } from './types';

type Getters<TResult> = {
  /**
   * Gets the input data from the context.
   * @param context - The invocation context
   * @returns The input data from the binding
   */
  get: (context: InvocationContext) => TResult;
  /**
   * Gets the input data from the context using a specific name.
   * @param context - The invocation context
   * @param name - The name of the input binding to differentiate it in the context from same typed bindings
   * @returns The input data from the binding
   */
  getNamed: (context: InvocationContext, name: string) => TResult;
};
type Creators<TArgs> = {
  /**
   * Creates a new input binding instance with the provided arguments.
   * @param args - The arguments to create the input binding
   * @returns An InputBindingSetter that can be used to set data in the context. Can be passed in the chain inside `useInputBinding`.
   */
  create: (args: TArgs) => InputBindingSetter;
  /**
   * Creates a named input binding instance with the provided arguments.
   * @param args - The arguments to create the input binding
   * @param name - The name of the input binding to differentiate it in the context from same typed bindings
   * @returns An InputBindingSetter that can be used to set data in the context. Can be passed in the chain inside `useInputBinding`.
   */
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
 * // Or a named input binding that allows for same binding with different params
 * app.get('/to-upper-case-named', {
 *  handler: startChain()
 *    .useInputBinding(({ request }) => upperCaseInput.createNamed(getQuery(request, 'firstName'), 'nameA'))
 *    .useInputBinding(({ request }) => upperCaseInput.createNamed(getQuery(request, 'lastName'), 'nameB'))
 *    .handle((_, context) => {
 *      const upperCaseFirstName = upperCaseInput.getNamed(context, 'nameA');
 *      const upperCaseLastName = upperCaseInput.getNamed(context, 'nameB');
 *      return funcResult('Ok', { upperCaseFirstName, upperCaseLastName });
 *    });
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
