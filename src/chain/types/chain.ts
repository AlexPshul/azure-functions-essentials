import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Promisable } from '../../helpers';
import { Guard } from './guard';
import { InputBindingSetter } from './input-binding-setter';

export type BasicChainData = { request: HttpRequest; context: InvocationContext };
export type LinkFunctor<TChainData extends BasicChainData, TResult> = (chainData: TChainData) => TResult;

export type ChainLink<TChainData extends BasicChainData> =
  | {
      type: 'guard';
      functor: LinkFunctor<TChainData, Guard>;
    }
  | {
      type: 'inputBinding';
      functor: LinkFunctor<TChainData, InputBindingSetter>;
    };

export type ChainLinkResult = Promisable<HttpResponseInit | boolean>;
