import { InvocationContext } from '@azure/functions';
import { ZodType } from 'zod';
import { funcResult } from '../helpers';
import { FunctionChain } from './function-chain';
import { ParsedDataChain } from './parsed-data-chain';
import { BasicChainData, ChainFailure, ChainOptions, DataAccessor, LinkFunctor, ResponseType } from './types';

type AdditionalOptions<TTriggerData> = { zodSchema?: ZodType<TTriggerData> };

export class BasicTriggerChain<TTriggerData = unknown, TResponseType extends ResponseType = 'none'> extends FunctionChain<
  BasicChainData<TTriggerData>,
  TResponseType
> {
  constructor(protected readonly options: ChainOptions<TResponseType> & AdditionalOptions<TTriggerData>) {
    super(options);
  }

  public parseData<TData>(
    accessor: DataAccessor<TTriggerData, TData>,
    zodSchema?: ZodType<TData> | LinkFunctor<BasicChainData<TTriggerData>, ZodType<TData>>,
  ) {
    return new ParsedDataChain<TTriggerData, TData, TResponseType>(this.options, this, accessor, zodSchema);
  }

  protected prepareChain(triggerData: TTriggerData, context: InvocationContext): BasicChainData<TTriggerData> | ChainFailure {
    if (this.options.zodSchema) {
      const result = this.options.zodSchema.safeParse(triggerData);
      if (!result.success) return { result: funcResult('BadRequest', result.error.issues), linkIndex: -1, linkType: 'validation' };
    }

    return { triggerData, context };
  }
}
