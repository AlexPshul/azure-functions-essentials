import { HttpResponseInit } from '@azure/functions';
import { Promisable } from '../../helpers';
import { BasicChainData } from './chain';

export type TransformerResult<TNewChainData extends BasicChainData> = TNewChainData | { error: HttpResponseInit };

export type Transformer<TChainData extends BasicChainData = BasicChainData, TNewChainData extends BasicChainData = TChainData> = {
  transform: (chainData: TChainData) => Promisable<TransformerResult<TNewChainData>>;
};
