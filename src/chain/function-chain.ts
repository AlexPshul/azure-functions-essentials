import { InvocationContext } from '@azure/functions';
import { funcResult } from '../helpers';
import { executeLinks, executeTransformer, isChainFailure } from './execute-chain';
import { anyGuard, guard as guardFactory } from './guards';
import {
  BasicChainData,
  ChainFailure,
  ChainHandlerFor,
  ChainLink,
  ChainOptions,
  ChainWrapper,
  Guard,
  InputBindingSetter,
  LinkFunctor,
  ResponseType,
  Transformer,
} from './types';

const isArrayOfGuards = <TChainData extends BasicChainData = BasicChainData>(
  guards: Guard<TChainData['triggerData']>[] | [LinkFunctor<TChainData, Guard<TChainData['triggerData']>[]>],
): guards is Guard<TChainData['triggerData']>[] => typeof guards[0] !== 'function';

type ChainSource<
  TTriggerData,
  TResponseType extends ResponseType,
  TPreviousChainData extends BasicChainData<TTriggerData>,
  TChainData extends BasicChainData<TTriggerData>,
> = {
  chain: FunctionChain<TTriggerData, TResponseType, TPreviousChainData>;
  transformer: Transformer<TPreviousChainData, TChainData>;
};

export class FunctionChain<
  TTriggerData = unknown,
  TResponseType extends ResponseType = 'none',
  TChainData extends BasicChainData<TTriggerData> = BasicChainData<TTriggerData>,
  TPreviousChainData extends BasicChainData<TTriggerData> = never,
> {
  protected chainLinks: ChainLink<TChainData>[] = [];

  constructor(
    protected readonly options: ChainOptions<TResponseType>,
    private readonly source?: ChainSource<TTriggerData, TResponseType, TPreviousChainData, TChainData>,
  ) {}

  public get linkCount(): number {
    const sourceCount = this.source ? this.source.chain.linkCount + 1 : 0;
    return this.chainLinks.length + sourceCount;
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

  public useTransformer<TNewChainData extends BasicChainData<TTriggerData>>(
    transformerInstance: Transformer<TChainData, TNewChainData>,
  ): FunctionChain<TTriggerData, TResponseType, TNewChainData, TChainData> {
    return new FunctionChain<TTriggerData, TResponseType, TNewChainData, TChainData>(this.options, {
      chain: this,
      transformer: transformerInstance,
    });
  }

  public handle<TResultBody = undefined>(
    handler: ChainHandlerFor<TResponseType, TChainData, TResultBody>,
  ): ChainWrapper<TTriggerData, TResponseType, TResultBody> {
    return (async (triggerData: TTriggerData, context: InvocationContext) => {
      const initialChainData = { triggerData, context };
      const chainResult = await this.executeChain(initialChainData);

      if (isChainFailure(chainResult)) return this.handleFailure(chainResult);

      const result = await handler(chainResult);
      return this.handleResult(result);
    }) as ChainWrapper<TTriggerData, TResponseType, TResultBody>;
  }

  protected async executeChain(chainData: BasicChainData<TTriggerData>): Promise<TChainData | ChainFailure> {
    let currentData: TChainData;

    if (this.source) {
      const previousResult = await this.source.chain.executeChain(chainData);
      if (isChainFailure(previousResult)) return previousResult;

      const transformerResult = await executeTransformer(this.source.transformer, previousResult, this.source.chain.linkCount, chainData.context);
      if (isChainFailure(transformerResult)) return transformerResult;

      currentData = transformerResult;
    } else {
      currentData = chainData as TChainData;
    }

    const indexOffset = this.source ? this.source.chain.linkCount + 1 : 0;
    return executeLinks(this.chainLinks, currentData, indexOffset);
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
