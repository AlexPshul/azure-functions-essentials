import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Promisable } from '../../helpers';
import { Guard } from './guard';
import { InputBinding } from './input-binding';

export type BasicChainData = { request: HttpRequest; context: InvocationContext };
export type LinkFunctor<TChainData extends BasicChainData, TResult> = (chainData: TChainData) => TResult;

export type ChainLink<TChainData extends BasicChainData> =
  | {
      type: 'guard';
      functor: LinkFunctor<TChainData, Guard>;
    }
  | {
      type: 'inputBinding';
      functor: LinkFunctor<TChainData, InputBinding<unknown>>;
    };

export type ChainLinkResult = Promisable<HttpResponseInit | boolean>;
