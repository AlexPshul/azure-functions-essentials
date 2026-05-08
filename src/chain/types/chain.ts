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
  linkType: 'guard' | 'inputBinding';
};

type HttpChainHandler<TTriggerData, TBody> = (
  triggerData: TTriggerData,
  context: InvocationContext,
) => FunctionResult<SpecificHttpResponseInit<TBody> | void | undefined>;
type JsonChainHandler<TTriggerData, TResultBody> = (triggerData: TTriggerData, context: InvocationContext) => FunctionResult<TResultBody>;
type NoneChainHandler<TTriggerData> = (triggerData: TTriggerData, context: InvocationContext) => FunctionResult<void>;

export type ChainHandlerFor<TResponseType extends ResponseType, TTriggerData, TResultBody> = TResponseType extends 'http'
  ? HttpChainHandler<TTriggerData, TResultBody>
  : TResponseType extends 'json'
    ? JsonChainHandler<TTriggerData, TResultBody>
    : NoneChainHandler<TTriggerData>;

export type ChainResultFor<TResponseType extends ResponseType, TResultBody = undefined> = TResponseType extends 'http'
  ? HttpResponseInit
  : TResponseType extends 'json'
    ? TResultBody | ChainFailure
    : void;

export type ChainWrapper<TTriggerData, TResponseType extends ResponseType, TResultBody = undefined> = (
  triggerData: TTriggerData,
  context: InvocationContext,
) => Promise<ChainResultFor<TResponseType, TResultBody>>;
