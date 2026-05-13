import { Promisable } from '../../helpers';
import { BasicChainData } from './chain';

export type DataAccessor<TTriggerData, TData> = (chainData: BasicChainData<TTriggerData>) => Promisable<TData>;
