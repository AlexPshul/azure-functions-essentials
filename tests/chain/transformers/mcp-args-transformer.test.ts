import { InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { mcpArgsTransformer } from '../../../src/chain/transformers';

describe('mcpArgsTransformer', () => {
  const createMcpChainData = (args: unknown) => {
    const context = new InvocationContext();
    context.error = jest.fn();
    (context as unknown as { triggerMetadata: Record<string, unknown> }).triggerMetadata = { mcptoolargs: args };
    return { triggerData: undefined as unknown, context };
  };

  it('should extract args from context.triggerMetadata.mcptoolargs', () => {
    const args = { name: 'test-tool', value: 42 };
    const chainData = createMcpChainData(args);
    const t = mcpArgsTransformer<typeof args>();

    const result = t.transform(chainData);

    expect(result).toEqual(expect.objectContaining({ parsedData: args }));
  });

  it('should validate args with Zod schema', () => {
    const schema = z.object({ name: z.string(), value: z.number() });
    const args = { name: 'test', value: 42 };
    const chainData = createMcpChainData(args);
    const t = mcpArgsTransformer(schema);

    const result = t.transform(chainData);

    expect(result).toEqual(expect.objectContaining({ parsedData: args }));
  });

  it('should return error when args fail Zod validation', () => {
    const schema = z.object({ name: z.string(), value: z.number() });
    const invalidArgs = { name: 123, value: 'not a number' };
    const chainData = createMcpChainData(invalidArgs);
    const t = mcpArgsTransformer(schema);

    const result = t.transform(chainData);

    expect(result).toHaveProperty('error');
    expect((result as { error: { status: number } }).error.status).toBe(400);
    expect(chainData.context.error).toHaveBeenCalled();
  });
});
