import { Timer } from '@azure/functions';
import { BasicTriggerChain } from '../basic-trigger-chain';

/**
 * Initializes a new timer chain for Azure Functions timer triggers.
 * @returns A `BasicTriggerChain<Timer>`
 */
export const startTimerChain = () => new BasicTriggerChain<Timer>({ responseType: 'none' });
