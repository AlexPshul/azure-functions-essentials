import { InvocationContext } from '@azure/functions';
import { ZodType } from 'zod';
import { FunctionChain } from './function-chain';
import { ParsedDataChain } from './parsed-data-chain';
import { BasicChainData, ChainOptions, DataAccessor, LinkFunctor, ResponseType } from './types';

export class BasicTriggerChain<TTriggerData = unknown, TResponseType extends ResponseType = 'none'> extends FunctionChain<
  BasicChainData<TTriggerData>,
  TResponseType
> {
  constructor(options: ChainOptions<TResponseType>) {
    super(options);
  }

  public parseData<TData>(
    accessor: DataAccessor<TTriggerData, TData>,
    zodSchema?: ZodType<TData> | LinkFunctor<BasicChainData<TTriggerData>, ZodType<TData>>,
  ) {
    return new ParsedDataChain<TTriggerData, TData, TResponseType>(this.options, this, accessor, zodSchema);
  }

  protected prepareChain(triggerData: TTriggerData, context: InvocationContext): BasicChainData<TTriggerData> {
    return { triggerData, context };
  }
}
