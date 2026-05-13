import { BasicChainData, ChainFailure } from './types';

export const isChainFailure = (result: BasicChainData | ChainFailure): result is ChainFailure => !('triggerData' in result);
