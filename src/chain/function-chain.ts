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
  TransformerResult,
} from './types';

const defaultErrors: Record<ChainLink<BasicChainData>['type'] | 'transformer', HttpResponseInit> = {
  guard: funcResult('Forbidden', "I'm sorry, kiddo. I really am."),
  inputBinding: funcResult('InternalServerError', 'There is no spoon'),
  transformer: funcResult('InternalServerError', 'Transformation failed'),
};

const isArrayOfGuards = <TChainData extends BasicChainData = BasicChainData>(
  guards: Guard<TChainData['triggerData']>[] | [LinkFunctor<TChainData, Guard<TChainData['triggerData']>[]>],
): guards is Guard<TChainData['triggerData']>[] => typeof guards[0] !== 'function';

const isTransformerSuccess = <TChainData extends BasicChainData>(result: TransformerResult<TChainData>): result is TChainData =>
  'triggerData' in result;

const isChainFailure = (result: BasicChainData | ChainFailure): result is ChainFailure => !('triggerData' in result);

export class FunctionChain<TTriggerData = unknown, TResponseType extends ResponseType = 'none'> {
  protected chainLinks: ChainLink<BasicChainData<TTriggerData>>[] = [];

  constructor(protected readonly options: ChainOptions<TResponseType>) {}

  public get linkCount(): number {
    return this.chainLinks.length;
  }

  protected get indexOffset(): number {
    return 0;
  }

  public useGuard(guard: Guard<TTriggerData>): this;
  public useGuard(guardFunc: LinkFunctor<BasicChainData<TTriggerData>, Guard<TTriggerData>>): this;
  public useGuard(guard: Guard<TTriggerData> | LinkFunctor<BasicChainData<TTriggerData>, Guard<TTriggerData>>): this {
    const guardFunctor = typeof guard === 'function' ? guard : () => guard;
    this.chainLinks.push({ type: 'guard', functor: guardFunctor });
    return this;
  }

  public useAnyGuard(...guards: [Guard<TTriggerData>, ...Guard<TTriggerData>[]]): this;
  public useAnyGuard(guardsFunctor: LinkFunctor<BasicChainData<TTriggerData>, Guard<TTriggerData>[]>): this;
  public useAnyGuard(...guards: Guard<TTriggerData>[] | [LinkFunctor<BasicChainData<TTriggerData>, Guard<TTriggerData>[]>]) {
    if (isArrayOfGuards<BasicChainData<TTriggerData>>(guards)) this.chainLinks.push({ type: 'guard', functor: () => anyGuard(...guards) });
    else this.chainLinks.push({ type: 'guard', functor: data => anyGuard(...guards[0](data)) });

    return this;
  }

  public useGuardIf<TCheckedValue>(
    checkValueExtractor: LinkFunctor<BasicChainData<TTriggerData>, TCheckedValue | undefined | null>,
    guardFunctor: LinkFunctor<BasicChainData<TTriggerData> & { checkedValue: TCheckedValue }, Guard<TTriggerData>>,
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
  public useInputBinding(input: LinkFunctor<BasicChainData<TTriggerData>, InputBindingSetter>): this;
  public useInputBinding(input: InputBindingSetter | LinkFunctor<BasicChainData<TTriggerData>, InputBindingSetter>) {
    const inputFunctor = typeof input === 'function' ? input : () => input;
    this.chainLinks.push({ type: 'inputBinding', functor: inputFunctor });
    return this;
  }

  public useTransformer<TNewChainData extends BasicChainData<TTriggerData>>(
    transformer: Transformer<BasicChainData<TTriggerData>, TNewChainData>,
  ): TransformedChain<TResponseType, TNewChainData, BasicChainData<TTriggerData>> {
    return new TransformedChain<TResponseType, TNewChainData, BasicChainData<TTriggerData>>(this.options, this, transformer);
  }

  public handle<TResultBody = undefined>(
    handler: ChainHandlerFor<TResponseType, BasicChainData<TTriggerData>, TResultBody>,
  ): ChainWrapper<TTriggerData, TResponseType, TResultBody> {
    return (async (triggerData: TTriggerData, context: InvocationContext) => {
      const chainResult = await this.executeChain({ triggerData, context });

      if (isChainFailure(chainResult)) return this.handleFailure(chainResult);

      const result = await handler(chainResult);
      return this.handleResult(result);
    }) as ChainWrapper<TTriggerData, TResponseType, TResultBody>;
  }

  public async executeChain(chainData: BasicChainData<TTriggerData>): Promise<BasicChainData<TTriggerData> | ChainFailure> {
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

export class TransformedChain<
  TResponseType extends ResponseType,
  TChainData extends BasicChainData,
  TPreviousChainData extends BasicChainData = BasicChainData,
> extends FunctionChain<TChainData['triggerData'], TResponseType> {
  private transformedDataCache?: TransformerResult<TChainData>;

  constructor(
    options: ChainOptions<TResponseType>,
    private readonly previousChain: FunctionChain<TChainData['triggerData'], TResponseType> | TransformedChain<TResponseType, TPreviousChainData>,
    private readonly transformer: Transformer<BasicChainData<TChainData['triggerData']>, TChainData>,
  ) {
    super(options);
  }

  public override get linkCount(): number {
    return this.chainLinks.length + this.previousChain.linkCount + 1;
  }

  protected override get indexOffset(): number {
    return this.previousChain.linkCount + 1;
  }

  private async transform(previousData: BasicChainData<TChainData['triggerData']>): Promise<TransformerResult<TChainData>> {
    if (this.transformedDataCache) return this.transformedDataCache;

    const previousDataToUse = this.previousChain instanceof TransformedChain ? await this.previousChain.transform(previousData) : previousData;
    this.transformedDataCache = await this.transformer.transform(previousDataToUse);
    return this.transformedDataCache;
  }

  public override async executeChain(
    chainData: BasicChainData<TChainData['triggerData']>,
  ): Promise<BasicChainData<TChainData['triggerData']> | ChainFailure> {
    const previousChainResult = await this.previousChain.executeChain(chainData);
    if (isChainFailure(previousChainResult)) return previousChainResult;

    const transformerIndex = this.previousChain.linkCount;
    try {
      const transformResult = await this.transform(previousChainResult);
      if (!isTransformerSuccess(transformResult)) {
        chainData.context.error(`Link #${transformerIndex} (transformer) stopped the chain. Result: ${JSON.stringify(transformResult.error)}`);
        return { result: transformResult.error, linkIndex: transformerIndex, linkType: 'transformer' };
      }

      return super.executeChain(transformResult);
    } catch (error) {
      const linkError = defaultErrors.transformer;
      chainData.context.error(
        `Link #${transformerIndex} (transformer) failed. Result: ${JSON.stringify(linkError)} | Error: ${JSON.stringify(error, null, 2)}`,
      );
      return { result: linkError, linkIndex: transformerIndex, linkType: 'transformer' };
    }
  }
}
