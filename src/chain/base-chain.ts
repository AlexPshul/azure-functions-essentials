import { HttpResponseInit } from '@azure/functions';
import { funcResult } from '../helpers';
import { BasicChainData, ChainLink, ChainLinkResult, Guard, InputBinding, LinkFunctor } from './types';

const defaultErrors: Record<ChainLink<BasicChainData>['type'], HttpResponseInit> = {
  guard: funcResult('Forbidden', "I'm sorry, kiddo. I really am."),
  inputBinding: funcResult('InternalServerError', 'There is no spoon'),
};

export abstract class BaseChain<TChainData extends BasicChainData = BasicChainData> {
  protected chainLink: ChainLink<TChainData>[] = [];

  /**
   * Registers a guard in the execution chain.
   * The guard is used to check conditions on the request before further processing.
   * @param guard A guard instance
   * @returns The current chain instance
   */
  public useGuard(guard: Guard): this;
  /**
   * Registers a guard in the execution chain.
   * The guard is used to check conditions on the request before further processing.
   * @param guardFunc A function that returns a guard
   * @returns The current chain instance
   */
  public useGuard(guardFunc: LinkFunctor<TChainData, Guard>): this;
  public useGuard(guard: Guard | LinkFunctor<TChainData, Guard>): this {
    const guardFunctor = typeof guard === 'function' ? guard : () => guard;
    this.chainLink.push({ type: 'guard', functor: guardFunctor });
    return this;
  }

  /**
   * Registers an input binding in the execution chain.
   * The input binding is used to set data in the context before further processing.
   * @param input An input binding instance
   * @returns The current chain instance
   */
  public useInputBinding<TResult>(input: InputBinding<TResult>): this;
  /**
   * Registers an input binding in the execution chain.
   * The input binding is used to set data in the context before further processing.
   * @param inputFunc A function that returns an input binding
   * @returns The current chain instance
   */
  public useInputBinding<TResult>(input: LinkFunctor<TChainData, InputBinding<TResult>>): this;
  public useInputBinding<TResult>(input: InputBinding<TResult> | LinkFunctor<TChainData, InputBinding<TResult>>) {
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
      // This switch case is to keep the same typing scheme for the resulted chain
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

  protected async executeChain(chainData: TChainData) {
    const { request, context } = chainData;
    for (const [index, link] of this.chainLink.entries()) {
      let linkResult: ChainLinkResult;
      switch (link.type) {
        case 'guard':
          linkResult = await link.functor(chainData).check(request, context);
          break;
        case 'inputBinding':
          linkResult = await link.functor(chainData).set(context);
          break;
      }

      if (linkResult !== true) {
        const linkError = !linkResult ? defaultErrors[link.type] : linkResult;
        context.error(`Link #${index} stopped the chain. Url: ${request.url} | Result: ${JSON.stringify(linkError)}`);
        return linkError;
      }
    }

    return undefined;
  }
}
