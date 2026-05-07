import { HttpResponseInit } from '@azure/functions';
import { funcResult } from '../helpers';
import { ChainGuardError } from './chain-guard-error';
import { anyGuard, guard as guardFactory } from './guards';
import { BasicChainData, ChainLink, ChainLinkResult, ChainOptions, Guard, InputBindingSetter, LinkFunctor, ResponseType } from './types';

export type ChainFailure = {
  result: HttpResponseInit;
  linkIndex: number;
  linkType: 'guard' | 'inputBinding';
};

const defaultErrors: Record<ChainLink<BasicChainData>['type'], HttpResponseInit> = {
  guard: funcResult('Forbidden', "I'm sorry, kiddo. I really am."),
  inputBinding: funcResult('InternalServerError', 'There is no spoon'),
};

const isArrayOfGuards = <TChainData extends BasicChainData = BasicChainData>(
  guards: Guard<TChainData['triggerData']>[] | [LinkFunctor<TChainData, Guard<TChainData['triggerData']>[]>],
): guards is Guard<TChainData['triggerData']>[] => typeof guards[0] !== 'function';

export abstract class BaseChain<TChainData extends BasicChainData = BasicChainData, TResponseType extends ResponseType = ResponseType> {
  protected chainLink: ChainLink<TChainData>[] = [];

  constructor(protected readonly options: ChainOptions<TResponseType> = { responseType: 'none' as TResponseType }) {}

  protected get responseType(): TResponseType {
    return this.options.responseType;
  }

  /**
   * Registers a guard in the execution chain.
   * The guard is used to check conditions on the trigger data before further processing.
   * @param guard A guard instance
   * @returns The current chain instance
   */
  public useGuard(guard: Guard<TChainData['triggerData']>): this;
  /**
   * Registers a guard in the execution chain.
   * The guard is used to check conditions on the trigger data before further processing.
   * @param guardFunc A function that returns a guard
   * @returns The current chain instance
   */
  public useGuard(guardFunc: LinkFunctor<TChainData, Guard<TChainData['triggerData']>>): this;
  public useGuard(guard: Guard<TChainData['triggerData']> | LinkFunctor<TChainData, Guard<TChainData['triggerData']>>): this {
    const guardFunctor = typeof guard === 'function' ? guard : () => guard;
    this.chainLink.push({ type: 'guard', functor: guardFunctor });
    return this;
  }

  /**
   * Registers a guard link with a list of guards.
   * Only **one** of these guards must pass for the entire link to pass.
   * @param guards A list of guards to be used as a single link in the chain.
   * @returns The current chain instance
   */
  public useAnyGuard(...guards: [Guard<TChainData['triggerData']>, ...Guard<TChainData['triggerData']>[]]): this;
  /**
   * Registers a guard link with a list of guards.
   * Only **one** of these guards must pass for the entire link to pass.
   * @param guards A function that returns a list of guards to be used as a single link in the chain.
   * @returns The current chain instance
   */
  public useAnyGuard(guardsFunctor: LinkFunctor<TChainData, Guard<TChainData['triggerData']>[]>): this;
  public useAnyGuard(...guards: Guard<TChainData['triggerData']>[] | [LinkFunctor<TChainData, Guard<TChainData['triggerData']>[]>]) {
    if (isArrayOfGuards<TChainData>(guards)) this.chainLink.push({ type: 'guard', functor: () => anyGuard(...guards) });
    else this.chainLink.push({ type: 'guard', functor: data => anyGuard(...guards[0](data)) });

    return this;
  }

  /**
   * Registers a guard in the execution chain ONLY if the `checkValueExtractor` returns a truthy value.
   * The extracted value is then accessible to the guard function as `checkedValue`.
   * The guard is used to check conditions on the trigger data before further processing.
   * @param checkValueExtractor A function that extracts a value from the chain data to check
   * @param guard A guard instance or a function that returns a guard
   * @returns The current chain instance
   */
  public useGuardIf<TCheckedValue>(
    checkValueExtractor: LinkFunctor<TChainData, TCheckedValue | undefined | null>,
    guardFunctor: LinkFunctor<TChainData & { checkedValue: TCheckedValue }, Guard<TChainData['triggerData']>>,
  ): this {
    this.chainLink.push({
      type: 'guard',
      functor: data => {
        const checkedValue = checkValueExtractor(data);
        return checkedValue ? guardFunctor({ ...data, checkedValue }) : guardFactory(() => true);
      },
    });

    return this;
  }

  /**
   * Registers an input binding in the execution chain.
   * The input binding is used to set data in the context before further processing.
   * @param input An input binding instance
   * @returns The current chain instance
   */
  public useInputBinding(input: InputBindingSetter): this;
  /**
   * Registers an input binding in the execution chain.
   * The input binding is used to set data in the context before further processing.
   * @param inputFunc A function that returns an input binding
   * @returns The current chain instance
   */
  public useInputBinding(input: LinkFunctor<TChainData, InputBindingSetter>): this;
  public useInputBinding(input: InputBindingSetter | LinkFunctor<TChainData, InputBindingSetter>) {
    const inputFunctor = typeof input === 'function' ? input : () => input;
    this.chainLink.push({ type: 'inputBinding', functor: inputFunctor });
    return this;
  }

  /**
   * Copies all the chain links from another chain instance and allows to map the data from the source chain to the current chain.
   * @param link A chain link instance to copy
   * @param mapFunc A function that maps the data from the source chain to the current chain
   * @returns The current chain instance
   */
  public copyFromChain<TSourceData extends BasicChainData>(sourceChain: BaseChain<TSourceData>, mapFunc: (data: TChainData) => TSourceData) {
    const alteredSource = sourceChain.chainLink.map(link => {
      switch (link.type) {
        case 'guard':
          return { ...link, functor: (data: TChainData) => link.functor(mapFunc(data)) };
        case 'inputBinding':
          return { ...link, functor: (data: TChainData) => link.functor(mapFunc(data)) };
      }
    });

    this.chainLink.push(...alteredSource);
    return this;
  }

  protected async executeChain(chainData: TChainData): Promise<ChainFailure | undefined> {
    const { context } = chainData;
    for (const [index, link] of this.chainLink.entries()) {
      try {
        let linkResult: ChainLinkResult;
        switch (link.type) {
          case 'guard':
            linkResult = await link.functor(chainData).check(chainData);
            break;
          case 'inputBinding':
            linkResult = await link.functor(chainData).set(context);
            break;
        }

        if (linkResult !== true) {
          const linkError = !linkResult ? defaultErrors[link.type] : linkResult;
          context.error(`Link #${index} (${link.type}) stopped the chain. Result: ${JSON.stringify(linkError)}`);
          return { result: linkError, linkIndex: index, linkType: link.type };
        }
      } catch (error) {
        const linkError = defaultErrors[link.type];
        context.error(`Link #${index} (${link.type}) failed. Result: ${JSON.stringify(linkError)} | Error: ${JSON.stringify(error, null, 2)}`);
        return { result: linkError, linkIndex: index, linkType: link.type };
      }
    }

    return undefined;
  }

  protected handleFailure(failure: ChainFailure) {
    const guardError = new ChainGuardError(failure.result, failure.linkIndex, failure.linkType);
    switch (this.responseType) {
      case 'http':
        return failure.result;
      case 'json':
        return guardError;
      case 'none':
        throw guardError;
    }
  }

  protected handleResult<TResult>(result: TResult) {
    switch (this.responseType) {
      case 'http':
        return result || funcResult('OK');
      case 'json':
        return result;
      case 'none':
        return undefined;
    }
  }
}
