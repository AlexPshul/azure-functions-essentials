import { InvocationContext } from '@azure/functions';
import { ZodType } from 'zod';
import { FunctionChain, isChainFailure } from './function-chain';
import { ParsedDataChain } from './parsed-data-chain';
import { BasicChainData, ChainHandlerFor, ChainOptions, ChainWrapper, DataAccessor, ResponseType } from './types';

export class BasicTriggerChain<
  TTriggerData = unknown,
  TResponseType extends ResponseType = 'none',
> extends FunctionChain<BasicChainData<TTriggerData>, TResponseType> {
  constructor(options: ChainOptions<TResponseType>) {
    super(options);
  }

  public parseData<TData>(
    accessor: DataAccessor<TTriggerData, TData>,
  ): ParsedDataChain<TTriggerData, TData, TResponseType>;
  public parseData<TData>(
    accessor: DataAccessor<TTriggerData, TData>,
    zodSchema: ZodType<TData>,
  ): ParsedDataChain<TTriggerData, TData, TResponseType>;
  public parseData<TData>(accessor: DataAccessor<TTriggerData, TData>, zodSchema?: ZodType<TData>) {
    return new ParsedDataChain<TTriggerData, TData, TResponseType>(this.options, this, accessor, zodSchema);
  }

  public override handle<TResultBody = undefined>(
    handler: ChainHandlerFor<TResponseType, BasicChainData<TTriggerData>, TResultBody>,
  ): ChainWrapper<TTriggerData, TResponseType, TResultBody> {
    return (async (triggerData: TTriggerData, context: InvocationContext) => {
      const chainResult = await this.executeChain({ triggerData, context });

      if (isChainFailure(chainResult)) return this.handleFailure(chainResult);

      const result = await handler(chainResult);
      return this.handleResult(result);
    }) as ChainWrapper<TTriggerData, TResponseType, TResultBody>;
  }
}
