import { BasicChainData, Transformer } from '../types';

export const transformer = <TChainData extends BasicChainData = BasicChainData, TNewChainData extends BasicChainData = TChainData>(
  transform: Transformer<TChainData, TNewChainData>['transform'],
): Transformer<TChainData, TNewChainData> => ({ transform });
