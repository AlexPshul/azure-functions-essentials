import { HttpResponseInit, InvocationContext } from '@azure/functions';
import { Promisable } from '../../helpers';
import { Guard } from './guard';
import { InputBindingSetter } from './input-binding-setter';

export type ResponseType = 'http' | 'none';
export type BasicChainData<T = unknown> = { triggerData: T; context: InvocationContext };
export type LinkFunctor<TChainData extends BasicChainData, TResult> = (chainData: TChainData) => TResult;

export type ChainLink<TChainData extends BasicChainData> =
  | {
      type: 'guard';
      functor: LinkFunctor<TChainData, Guard<TChainData['triggerData']>>;
    }
  | {
      type: 'inputBinding';
      functor: LinkFunctor<TChainData, InputBindingSetter>;
    };

export type ChainLinkResult = Promisable<HttpResponseInit | boolean>;
