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

export class FunctionChain<
  TTriggerData = unknown,
  TResponseType extends ResponseType = 'none',
  TChainData extends BasicChainData<TTriggerData> = BasicChainData<TTriggerData>,
> {
  protected chainLinks: ChainLink<TChainData>[] = [];

  constructor(protected readonly options: ChainOptions<TResponseType>) {}

  public get linkCount(): number {
    return this.chainLinks.length;
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
  ): TransformedChain<TTriggerData, TResponseType, TNewChainData, TChainData> {
    return new TransformedChain<TTriggerData, TResponseType, TNewChainData, TChainData>(this.options, this, transformerInstance);
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

  public async executeChain(chainData: BasicChainData<TTriggerData>, indexOffset = 0): Promise<TChainData | ChainFailure> {
    const currentData = chainData as TChainData;
    const { context } = currentData;

    for (const [index, link] of this.chainLinks.entries()) {
      const globalIndex = indexOffset + index;
      try {
        switch (link.type) {
          case 'guard': {
            const linkResult: ChainLinkResult = await link.functor(currentData).check(currentData);
            if (linkResult !== true) {
              const linkError = !linkResult ? defaultErrors[link.type] : linkResult;
              context.error(`Link #${globalIndex} (${link.type}) stopped the chain. Result: ${JSON.stringify(linkError)}`);
              return { result: linkError, linkIndex: globalIndex, linkType: link.type };
            }
            break;
          }
          case 'inputBinding': {
            const linkResult: ChainLinkResult = await link.functor(currentData).set(context);
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
        context.error(
          `Link #${globalIndex} (${link.type}) failed. Result: ${JSON.stringify(linkError)} | Error: ${JSON.stringify(error, null, 2)}`,
        );
        return { result: linkError, linkIndex: globalIndex, linkType: link.type };
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
}

export class TransformedChain<
  TTriggerData,
  TResponseType extends ResponseType,
  TChainData extends BasicChainData<TTriggerData>,
  TPreviousChainData extends BasicChainData<TTriggerData>,
> extends FunctionChain<TTriggerData, TResponseType, TChainData> {
  constructor(
    options: ChainOptions<TResponseType>,
    private readonly sourceChain: FunctionChain<TTriggerData, TResponseType, TPreviousChainData>,
    private readonly transformer: Transformer<TPreviousChainData, TChainData>,
  ) {
    super(options);
  }

  public override get linkCount(): number {
    return this.chainLinks.length + this.sourceChain.linkCount + 1;
  }

  public override async executeChain(chainData: BasicChainData<TTriggerData>, indexOffset = 0): Promise<TChainData | ChainFailure> {
    const previousResult = await this.sourceChain.executeChain(chainData);
    if (isChainFailure(previousResult)) return previousResult;

    const transformerIndex = indexOffset + this.sourceChain.linkCount;
    try {
      const transformResult = await this.transformer.transform(previousResult);
      if (!isTransformerSuccess(transformResult)) {
        chainData.context.error(`Link #${transformerIndex} (transformer) stopped the chain. Result: ${JSON.stringify(transformResult.error)}`);
        return { result: transformResult.error, linkIndex: transformerIndex, linkType: 'transformer' };
      }

      return super.executeChain(transformResult, this.sourceChain.linkCount + 1);
    } catch (error) {
      const linkError = defaultErrors.transformer;
      chainData.context.error(
        `Link #${transformerIndex} (transformer) failed. Result: ${JSON.stringify(linkError)} | Error: ${JSON.stringify(error, null, 2)}`,
      );
      return { result: linkError, linkIndex: transformerIndex, linkType: 'transformer' };
    }
  }
}
