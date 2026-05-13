import { FunctionResult, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Promisable } from '../../helpers';
import { Guard } from './guard';
import { InputBindingSetter } from './input-binding-setter';
import { SpecificHttpResponseInit } from './specific-http-response-init';

export type ResponseType = 'http' | 'json' | 'none';
export type ChainOptions<TResponseType extends ResponseType = 'none'> = { responseType: TResponseType };
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

export type ChainFailure = {
  result: HttpResponseInit;
  linkIndex: number;
  linkType: 'guard' | 'inputBinding' | 'dataAccessor';
};

type HttpChainHandler<TChainData extends BasicChainData, TBody> = (
  chainData: TChainData,
) => FunctionResult<SpecificHttpResponseInit<TBody> | void | undefined>;
type JsonChainHandler<TChainData extends BasicChainData, TResultBody> = (chainData: TChainData) => FunctionResult<TResultBody>;
type NoneChainHandler<TChainData extends BasicChainData> = (chainData: TChainData) => FunctionResult<void>;

export type ChainHandlerFor<TResponseType extends ResponseType, TChainData extends BasicChainData, TResultBody> = TResponseType extends 'http'
  ? HttpChainHandler<TChainData, TResultBody>
  : TResponseType extends 'json'
    ? JsonChainHandler<TChainData, TResultBody>
    : NoneChainHandler<TChainData>;

export type ChainResultFor<TResponseType extends ResponseType, TResultBody = undefined> = TResponseType extends 'http'
  ? HttpResponseInit
  : TResponseType extends 'json'
    ? TResultBody | ChainFailure
    : void;

export type ChainWrapper<TTriggerData, TResponseType extends ResponseType, TResultBody = undefined> = (
  triggerData: TTriggerData,
  context: InvocationContext,
) => Promise<ChainResultFor<TResponseType, TResultBody>>;
