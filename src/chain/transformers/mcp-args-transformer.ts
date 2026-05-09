import { ZodType } from 'zod';
import { funcResult } from '../../helpers';
import { BasicChainData, Transformer, TransformerResult } from '../types';

export const mcpArgsTransformer = <TArgs>(
  zodSchema?: ZodType<TArgs>,
): Transformer<BasicChainData, BasicChainData & { parsedData: TArgs }> => ({
  transform: (chainData): TransformerResult<BasicChainData & { parsedData: TArgs }> => {
    const rawArgs = chainData.context.triggerMetadata?.mcptoolargs as TArgs;

    if (!zodSchema) return { ...chainData, parsedData: rawArgs };

    const parseResult = zodSchema.safeParse(rawArgs);
    if (!parseResult.success) {
      chainData.context.error('Invalid MCP args', parseResult.error.issues);
      return { error: funcResult('BadRequest', parseResult.error.issues) };
    }

    return { ...chainData, parsedData: parseResult.data };
  },
});
