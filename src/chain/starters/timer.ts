import { Timer } from '@azure/functions';
import { RegularChain } from '../regular-chain';

/**
 * Initializes a new timer chain for Azure Functions timer triggers.
 * @returns A `RegularChain<Timer, 'none'>`
 */
export const startTimerChain = () => new RegularChain<Timer, 'none'>({ responseType: 'none' });
