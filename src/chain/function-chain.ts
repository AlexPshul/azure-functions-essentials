import { HttpResponseInit } from '@azure/functions';
import { funcResult } from '../helpers';
import { anyGuard, guard as guardFactory } from './guards';
import {
  BasicChainData,
  ChainFailure,
  ChainHandlerFor,
  ChainLink,
  ChainLinkResult,
  ChainOptions,
  ChainWrapper,
  Guard,
  InputBindingSetter,
  LinkFunctor,
  ResponseType,
} from './types';

const defaultErrors: Record<ChainLink<BasicChainData>['type'] | 'dataAccessor', HttpResponseInit> = {
  guard: funcResult('Forbidden', "I'm sorry, kiddo. I really am."),
  inputBinding: funcResult('InternalServerError', 'There is no spoon'),
  dataAccessor: funcResult('BadRequest', 'Data access failed'),
};

const isArrayOfGuards = <TChainData extends BasicChainData = BasicChainData>(
  guards: Guard<TChainData['triggerData']>[] | [LinkFunctor<TChainData, Guard<TChainData['triggerData']>[]>],
): guards is Guard<TChainData['triggerData']>[] => typeof guards[0] !== 'function';

export const isChainFailure = (result: BasicChainData | ChainFailure): result is ChainFailure => !('triggerData' in result);

export { defaultErrors };

export abstract class FunctionChain<
  TChainData extends BasicChainData = BasicChainData,
  TResponseType extends ResponseType = 'none',
> {
  protected chainLinks: ChainLink<TChainData>[] = [];

  constructor(protected readonly options: ChainOptions<TResponseType>) {}

  public get linkCount(): number {
    return this.chainLinks.length;
  }

  protected get indexOffset(): number {
    return 0;
  }

  public useGuard(guard: Guard<TChainData['triggerData']>): this;
  public useGuard(guardFunc: LinkFunctor<TChainData, Guard<TChainData['triggerData']>>): this;
  public useGuard(guard: Guard<TChainData['triggerData']> | LinkFunctor<TChainData, Guard<TChainData['triggerData']>>): this {
    const guardFunctor = typeof guard === 'function' ? guard : () => guard;
    this.chainLinks.push({ type: 'guard', functor: guardFunctor });
    return this;
  }

  public useAnyGuard(...guards: [Guard<TChainData['triggerData']>, ...Guard<TChainData['triggerData']>[]]): this;
  public useAnyGuard(guardsFunctor: LinkFunctor<TChainData, Guard<TChainData['triggerData']>[]>): this;
  public useAnyGuard(...guards: Guard<TChainData['triggerData']>[] | [LinkFunctor<TChainData, Guard<TChainData['triggerData']>[]>]) {
    if (isArrayOfGuards<TChainData>(guards)) this.chainLinks.push({ type: 'guard', functor: () => anyGuard(...guards) });
    else this.chainLinks.push({ type: 'guard', functor: data => anyGuard(...guards[0](data)) });

    return this;
  }

  public useGuardIf<TCheckedValue>(
    checkValueExtractor: LinkFunctor<TChainData, TCheckedValue | undefined | null>,
    guardFunctor: LinkFunctor<TChainData & { checkedValue: TCheckedValue }, Guard<TChainData['triggerData']>>,
  ): this {
    this.chainLinks.push({
      type: 'guard',
      functor: data => {
        const checkedValue = checkValueExtractor(data);
        return checkedValue ? guardFunctor({ ...data, checkedValue }) : guardFactory(() => true);
      },
    });

    return this;
  }

  public useInputBinding(input: InputBindingSetter): this;
  public useInputBinding(input: LinkFunctor<TChainData, InputBindingSetter>): this;
  public useInputBinding(input: InputBindingSetter | LinkFunctor<TChainData, InputBindingSetter>) {
    const inputFunctor = typeof input === 'function' ? input : () => input;
    this.chainLinks.push({ type: 'inputBinding', functor: inputFunctor });
    return this;
  }

  public abstract handle<TResultBody = undefined>(
    handler: ChainHandlerFor<TResponseType, TChainData, TResultBody>,
  ): ChainWrapper<TChainData['triggerData'], TResponseType, TResultBody>;

  public async executeChain(chainData: TChainData): Promise<TChainData | ChainFailure> {
    const { context } = chainData;

    for (const [index, link] of this.chainLinks.entries()) {
      const globalIndex = this.indexOffset + index;
      try {
        switch (link.type) {
          case 'guard': {
            const linkResult: ChainLinkResult = await link.functor(chainData).check(chainData);
            if (linkResult !== true) {
              const linkError = !linkResult ? defaultErrors[link.type] : linkResult;
              context.error(`Link #${globalIndex} (${link.type}) stopped the chain. Result: ${JSON.stringify(linkError)}`);
              return { result: linkError, linkIndex: globalIndex, linkType: link.type };
            }
            break;
          }
          case 'inputBinding': {
            const linkResult: ChainLinkResult = await link.functor(chainData).set(context);
            if (linkResult !== true) {
              const linkError = !linkResult ? defaultErrors[link.type] : linkResult;
              context.error(`Link #${globalIndex} (${link.type}) stopped the chain. Result: ${JSON.stringify(linkError)}`);
              return { result: linkError, linkIndex: globalIndex, linkType: link.type };
            }
            break;
          }
        }
      } catch (error) {
        const linkError = defaultErrors[link.type];
        context.error(`Link #${globalIndex} (${link.type}) failed. Result: ${JSON.stringify(linkError)} | Error: ${JSON.stringify(error, null, 2)}`);
        return { result: linkError, linkIndex: globalIndex, linkType: link.type };
      }
    }

    return chainData;
  }

  protected handleFailure(failure: ChainFailure) {
    switch (this.options.responseType) {
      case 'http':
        return failure.result;
      case 'json':
        return failure;
      case 'none':
        throw new Error(`Chain ${failure.linkType} #${failure.linkIndex} failed.`);
    }
  }

  protected handleResult<TResult>(result: TResult) {
    switch (this.options.responseType) {
      case 'http':
        return result || funcResult('OK');
      case 'json':
        return result;
      case 'none':
        return undefined;
    }
  }
}
