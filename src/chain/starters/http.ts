import { HttpTriggerChain } from '../specialized';

/**
 * Initializes a new HTTP chain for Azure Functions HTTP triggers.
 * @returns An `HttpTriggerChain` with `parseBody()` support
 * @example
 * ```ts
 * app.post('knock-knock', {
 *   handler: startHttpChain()
 *    .useGuard(new MyGuard())
 *    .parseBody(myZodSchema)
 *    .handle(({ triggerData, parsedData, context }) => {
 *      return funcResult('Ok', 'Follow the white rabbit');
 *    });
 * });
 * ```
 */
export const startHttpChain = () => new HttpTriggerChain();
