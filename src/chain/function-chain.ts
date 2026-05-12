import { HttpResponseInit, InvocationContext } from '@azure/functions';
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
  Transformer,
} from './types';

const defaultErrors: Record<ChainLink<BasicChainData>['type'], HttpResponseInit> = {
  guard: funcResult('Forbidden', "I'm sorry, kiddo. I really am."),
  inputBinding: funcResult('InternalServerError', 'There is no spoon'),
  transformer: funcResult('InternalServerError', 'Transformation failed'),
};

const isArrayOfGuards = <TChainData extends BasicChainData = BasicChainData>(
  guards: Guard<TChainData['triggerData']>[] | [LinkFunctor<TChainData, Guard<TChainData['triggerData']>[]>],
): guards is Guard<TChainData['triggerData']>[] => typeof guards[0] !== 'function';

const isTransformerSuccess = (result: unknown): result is BasicChainData =>
  typeof result === 'object' && result !== null && 'triggerData' in result;

export class FunctionChain<
  TTriggerData = unknown,
  TResponseType extends ResponseType = 'none',
  TChainData extends BasicChainData<TTriggerData> = BasicChainData<TTriggerData>,
> {
  protected chainLinks: ChainLink<TChainData>[] = [];

  constructor(protected readonly options: ChainOptions<TResponseType>) {}

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

  public useTransformer<TNewChainData extends BasicChainData<TTriggerData>>(
    transformerInstance: Transformer<TChainData, TNewChainData>,
  ): FunctionChain<TTriggerData, TResponseType, TNewChainData> {
    const newChain = new FunctionChain<TTriggerData, TResponseType, TNewChainData>(this.options);
    newChain.pushMappedLinks(this.chainLinks, data => data as unknown as TChainData);
    newChain.chainLinks.push({
      type: 'transformer',
      functor: data => transformerInstance.transform(data as unknown as TChainData),
    });
    return newChain;
  }

  public copyFromChain<TSourceData extends BasicChainData>(
    sourceChain: FunctionChain<TSourceData['triggerData'], ResponseType, TSourceData>,
    mapFunc: (data: TChainData) => TSourceData,
  ) {
    this.pushMappedLinks(sourceChain.chainLinks, mapFunc);
    return this;
  }

  public handle<TResultBody = undefined>(
    handler: ChainHandlerFor<TResponseType, TChainData, TResultBody>,
  ): ChainWrapper<TTriggerData, TResponseType, TResultBody> {
    return (async (triggerData: TTriggerData, context: InvocationContext) => {
      const initialChainData = { triggerData, context } as TChainData;
      const chainResult = await this.executeChain(initialChainData);

      if (!('triggerData' in chainResult)) return this.handleFailure(chainResult as ChainFailure);

      const result = await handler(chainResult);
      return this.handleResult(result);
    }) as ChainWrapper<TTriggerData, TResponseType, TResultBody>;
  }

  protected async executeChain(chainData: TChainData): Promise<TChainData | ChainFailure> {
    let currentData = chainData;
    const { context } = chainData;

    for (const [index, link] of this.chainLinks.entries()) {
      try {
        switch (link.type) {
          case 'guard': {
            const linkResult: ChainLinkResult = await link.functor(currentData).check(currentData);
            if (linkResult !== true) {
              const linkError = !linkResult ? defaultErrors[link.type] : linkResult;
              context.error(`Link #${index} (${link.type}) stopped the chain. Result: ${JSON.stringify(linkError)}`);
              return { result: linkError, linkIndex: index, linkType: link.type };
            }
            break;
          }
          case 'inputBinding': {
            const linkResult: ChainLinkResult = await link.functor(currentData).set(context);
            if (linkResult !== true) {
              const linkError = !linkResult ? defaultErrors[link.type] : linkResult;
              context.error(`Link #${index} (${link.type}) stopped the chain. Result: ${JSON.stringify(linkError)}`);
              return { result: linkError, linkIndex: index, linkType: link.type };
            }
            break;
          }
          case 'transformer': {
            const transformResult = await link.functor(currentData);
            if (!isTransformerSuccess(transformResult)) {
              context.error(`Link #${index} (${link.type}) stopped the chain. Result: ${JSON.stringify(transformResult.error)}`);
              return { result: transformResult.error, linkIndex: index, linkType: link.type };
            }
            currentData = transformResult as TChainData;
            break;
          }
        }
      } catch (error) {
        const linkError = defaultErrors[link.type];
        context.error(`Link #${index} (${link.type}) failed. Result: ${JSON.stringify(linkError)} | Error: ${JSON.stringify(error, null, 2)}`);
        return { result: linkError, linkIndex: index, linkType: link.type };
      }
    }

    return currentData;
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

  private pushMappedLinks<TSourceData extends BasicChainData>(sourceLinks: ChainLink<TSourceData>[], mapFunc: (data: TChainData) => TSourceData) {
    const alteredSource = sourceLinks.map(link => ({
      ...link,
      functor: (data: TChainData) => link.functor(mapFunc(data)),
    }));

    this.chainLinks.push(...(alteredSource as ChainLink<TChainData>[]));
  }
}
