import { InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { startMcpChain, ChainFailure, guard, funcResult } from '../../src';

describe('startMcpChain', () => {
  let mockContext: InvocationContext;

  const createMcpContext = (args: unknown) => {
    const context = new InvocationContext();
    context.error = jest.fn();
    (context as unknown as { triggerMetadata: Record<string, unknown> }).triggerMetadata = { mcptoolargs: args };
    return context;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = new InvocationContext();
    mockContext.error = jest.fn();
  });

  it('should parse args from context.triggerMetadata.mcptoolargs', async () => {
    const args = { name: 'test-tool', value: 42 };
    const context = createMcpContext(args);
    const handlerFn = jest.fn().mockReturnValue({ result: 'done' });

    const handler = startMcpChain<typeof args>().handle(handlerFn);
    const result = await handler(undefined as unknown, context);

    expect(handlerFn).toHaveBeenCalledWith(undefined, args, context);
    expect(result).toEqual({ result: 'done' });
  });

  it('should validate args with Zod schema', async () => {
    const schema = z.object({ name: z.string(), value: z.number() });
    const args = { name: 'test', value: 42 };
    const context = createMcpContext(args);
    const handlerFn = jest.fn().mockReturnValue({ result: 'validated' });

    const handler = startMcpChain(schema).handle(handlerFn);
    const result = await handler(undefined as unknown, context);

    expect(handlerFn).toHaveBeenCalledWith(undefined, args, context);
    expect(result).toEqual({ result: 'validated' });
  });

  it('should return ZodError when args fail validation', async () => {
    const schema = z.object({ name: z.string(), value: z.number() });
    const invalidArgs = { name: 123, value: 'not a number' };
    const context = createMcpContext(invalidArgs);
    const handlerFn = jest.fn();

    const handler = startMcpChain(schema).handle(handlerFn);
    const result = await handler(undefined as unknown, context);

    expect(result).toBeDefined();
    expect(handlerFn).not.toHaveBeenCalled();
  });

  it('should return ChainFailure when guard fails', async () => {
    const args = { name: 'test' };
    const context = createMcpContext(args);
    const failingGuard = guard(() => false);
    const handlerFn = jest.fn();

    const handler = startMcpChain<typeof args>().useGuard(failingGuard).handle(handlerFn);
    const result = await handler(undefined as unknown, context);

    expect(result).toHaveProperty('linkType', 'guard');
    expect(handlerFn).not.toHaveBeenCalled();
  });

  it('should return ChainFailure with custom response when guard returns HttpResponseInit', async () => {
    const args = { name: 'test' };
    const context = createMcpContext(args);
    const customResponse = funcResult('Forbidden', 'Not authorized');
    const failingGuard = guard(() => customResponse);
    const handlerFn = jest.fn();

    const handler = startMcpChain<typeof args>().useGuard(failingGuard).handle(handlerFn);
    const result = await handler(undefined as unknown, context);

    expect((result as ChainFailure).result).toEqual(customResponse);
  });

  it('should return handler result as JSON passthrough', async () => {
    const args = { query: 'hello' };
    const context = createMcpContext(args);

    const handler = startMcpChain<typeof args>().handle((_triggerData, parsedData) => {
      return { answer: `You said: ${parsedData.query}` };
    });
    const result = await handler(undefined as unknown, context);

    expect(result).toEqual({ answer: 'You said: hello' });
  });

  it('should support guards that access parsed args', async () => {
    const args = { name: 'admin-tool', secret: 'correct' };
    const context = createMcpContext(args);
    const guardCheck = jest.fn().mockReturnValue(true);
    const handlerFn = jest.fn().mockReturnValue({ ok: true });

    const handler = startMcpChain<typeof args>()
      .useGuard(guard(guardCheck))
      .handle(handlerFn);
    await handler(undefined as unknown, context);

    expect(guardCheck).toHaveBeenCalled();
    expect(handlerFn).toHaveBeenCalled();
  });

  it('should serialize guard error to JSON', async () => {
    const args = { name: 'test' };
    const context = createMcpContext(args);
    const failingGuard = guard(() => funcResult('Forbidden', 'Denied'));
    const handlerFn = jest.fn();

    const handler = startMcpChain<typeof args>().useGuard(failingGuard).handle(handlerFn);
    const result = await handler(undefined as unknown, context);

    const serialized = JSON.parse(JSON.stringify(result));
    expect(serialized.result).toBeDefined();
    expect(serialized.linkType).toBe('guard');
  });
});
