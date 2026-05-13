import { InvocationContext } from '@azure/functions';
import { ZodType } from 'zod';
import { funcResult } from '../helpers';
import { defaultErrors, FunctionChain } from './function-chain';
import { isChainFailure } from './helpers';
import { BasicChainData, ChainFailure, ChainOptions, DataAccessor, LinkFunctor, ResponseType } from './types';

type ParsedChainData<TTriggerData = unknown, TData = unknown> = BasicChainData<TTriggerData> & { parsedData: TData };

export class ParsedDataChain<TTriggerData, TData, TResponseType extends ResponseType> extends FunctionChain<
  ParsedChainData<TTriggerData, TData>,
  TResponseType
> {
  constructor(
    options: ChainOptions<TResponseType>,
    private readonly sourceChain: FunctionChain<BasicChainData<TTriggerData>, TResponseType>,
    private readonly dataAccessor: DataAccessor<TTriggerData, TData>,
    private readonly zodSchema?: ZodType<TData> | LinkFunctor<BasicChainData<TTriggerData>, ZodType<TData>>,
  ) {
    super(options);
  }

  public override get linkCount(): number {
    return this.chainLinks.length + this.sourceChain.linkCount + 1;
  }

  protected override get indexOffset(): number {
    return this.sourceChain.linkCount + 1;
  }

  protected override async prepareChain(
    triggerData: TTriggerData,
    context: InvocationContext,
  ): Promise<ParsedChainData<TTriggerData, TData> | ChainFailure> {
    const sourceResult = await FunctionChain.executeChainInstance(this.sourceChain, triggerData, context);
    if (isChainFailure(sourceResult)) return sourceResult;

    const accessorIndex = this.sourceChain.linkCount;
    try {
      const rawData = await this.dataAccessor(sourceResult);

      let parsedData: TData;
      if (this.zodSchema) {
        const zodInstance = typeof this.zodSchema === 'function' ? this.zodSchema(sourceResult) : this.zodSchema;
        const parseResult = zodInstance.safeParse(rawData);
        if (!parseResult.success) {
          context.error('Invalid data', parseResult.error.issues);
          return { result: funcResult('BadRequest', parseResult.error.issues), linkIndex: accessorIndex, linkType: 'dataAccessor' };
        }
        parsedData = parseResult.data;
      } else {
        parsedData = rawData;
      }

      return { ...sourceResult, parsedData };
    } catch (error) {
      const linkError = defaultErrors.dataAccessor;
      context.error(`Link #${accessorIndex} (dataAccessor) failed. Result: ${JSON.stringify(linkError)} | Error: ${JSON.stringify(error, null, 2)}`);
      return { result: linkError, linkIndex: accessorIndex, linkType: 'dataAccessor' };
    }
  }
}
