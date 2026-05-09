import { ZodType } from 'zod';
import { funcResult } from '../../helpers';
import { BasicChainData, LinkFunctor, Transformer, TransformerResult } from '../types';

export const zodTransformer = <TData, TChainData extends BasicChainData = BasicChainData>(
  zodType: ZodType<TData> | LinkFunctor<TChainData, ZodType<TData>>,
): Transformer<TChainData, TChainData & { parsedData: TData }> => ({
  transform: (chainData): TransformerResult<TChainData & { parsedData: TData }> => {
    const zodInstance = typeof zodType === 'function' ? zodType(chainData) : zodType;
    const parseResult = zodInstance.safeParse(chainData.triggerData);

    if (!parseResult.success) {
      chainData.context.error('Invalid data', parseResult.error.issues);
      return { error: funcResult('BadRequest', parseResult.error.issues) };
    }

    return { ...chainData, parsedData: parseResult.data };
  },
});
