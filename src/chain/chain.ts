import { RegularChain } from './regular-chain';

/**
 * Initializes a new instance of an Azure function chain.
 * This allows to add guards and custom bindings and finish it with a handler.
 * @example
 * ```ts
 * app.post('knock-knock', {
 *   handler: startChain()
 *    .useGuard(new MyGuard())
 *    .useInputBinding(new MyInputBinding())
 *    .handle((request, context) => {
 *      // Do your magic here
 *      return funcResult('Ok', 'Follow the white rabbit'); // Optional
 *    });
 * };
 */
export const startChain = () => new RegularChain();
