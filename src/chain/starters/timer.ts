import { Timer } from '@azure/functions';
import { FunctionChain } from '../function-chain';

/**
 * Initializes a new timer chain for Azure Functions timer triggers.
 * @returns A `FunctionChain<Timer>`
 */
export const startTimerChain = () => new FunctionChain<Timer>({ responseType: 'none' });
