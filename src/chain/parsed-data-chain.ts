import { InvocationContext } from '@azure/functions';
import { ZodType } from 'zod';
import { funcResult } from '../helpers';
import { defaultErrors, FunctionChain, isChainFailure } from './function-chain';
import { BasicChainData, ChainFailure, ChainHandlerFor, ChainOptions, ChainWrapper, DataAccessor, ResponseType } from './types';

type ParsedChainData<TTriggerData = unknown, TData = unknown> = BasicChainData<TTriggerData> & { parsedData: TData };

export class ParsedDataChain<
  TTriggerData,
  TData,
  TResponseType extends ResponseType,
> extends FunctionChain<ParsedChainData<TTriggerData, TData>, TResponseType> {
  constructor(
    options: ChainOptions<TResponseType>,
    private readonly sourceChain: FunctionChain<BasicChainData<TTriggerData>, TResponseType>,
    private readonly dataAccessor: DataAccessor<TTriggerData, TData>,
    private readonly zodSchema?: ZodType<TData>,
  ) {
    super(options);
  }

  public override get linkCount(): number {
    return this.chainLinks.length + this.sourceChain.linkCount + 1;
  }

  protected override get indexOffset(): number {
    return this.sourceChain.linkCount + 1;
  }

  public override handle<TResultBody = undefined>(
    handler: ChainHandlerFor<TResponseType, ParsedChainData<TTriggerData, TData>, TResultBody>,
  ): ChainWrapper<TTriggerData, TResponseType, TResultBody> {
    return (async (triggerData: TTriggerData, context: InvocationContext) => {
      const chainResult = await this.runFullChain({ triggerData, context });

      if (isChainFailure(chainResult)) return this.handleFailure(chainResult);

      const result = await handler(chainResult);
      return this.handleResult(result);
    }) as ChainWrapper<TTriggerData, TResponseType, TResultBody>;
  }

  private async runFullChain(chainData: BasicChainData<TTriggerData>): Promise<ParsedChainData<TTriggerData, TData> | ChainFailure> {
    const sourceResult = await this.sourceChain.executeChain(chainData);
    if (isChainFailure(sourceResult)) return sourceResult;

    const accessorIndex = this.sourceChain.linkCount;
    try {
      const rawData = await this.dataAccessor(sourceResult);

      let parsedData: TData;
      if (this.zodSchema) {
        const parseResult = this.zodSchema.safeParse(rawData);
        if (!parseResult.success) {
          chainData.context.error('Invalid data', parseResult.error.issues);
          return { result: funcResult('BadRequest', parseResult.error.issues), linkIndex: accessorIndex, linkType: 'dataAccessor' };
        }
        parsedData = parseResult.data;
      } else {
        parsedData = rawData;
      }

      return super.executeChain({ ...sourceResult, parsedData });
    } catch (error) {
      const linkError = defaultErrors.dataAccessor;
      chainData.context.error(
        `Link #${accessorIndex} (dataAccessor) failed. Result: ${JSON.stringify(linkError)} | Error: ${JSON.stringify(error, null, 2)}`,
      );
      return { result: linkError, linkIndex: accessorIndex, linkType: 'dataAccessor' };
    }
  }
}
