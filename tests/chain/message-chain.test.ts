import { InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { startMessageChain, guard } from '../../src';

describe('startMessageChain', () => {
  let mockContext: InvocationContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = new InvocationContext();
    mockContext.error = jest.fn();
  });

  it('should call handler with valid trigger data when schema passes', async () => {
    const schema = z.object({ name: z.string(), value: z.number() });
    const triggerData = { name: 'test', value: 42 };
    const handlerFn = jest.fn();

    const handler = startMessageChain(schema).handle(handlerFn);
    await handler(triggerData, mockContext);

    expect(handlerFn).toHaveBeenCalledWith({ triggerData, context: mockContext });
  });

  it('should throw when trigger data fails schema validation', async () => {
    const schema = z.object({ name: z.string(), value: z.number() });
    const handlerFn = jest.fn();

    const handler = startMessageChain(schema).handle(handlerFn);
    const invalidData = { name: 123, value: 'not a number' } as unknown as { name: string; value: number };

    await expect(handler(invalidData, mockContext)).rejects.toThrow();
    expect(handlerFn).not.toHaveBeenCalled();
  });

  it('should work without schema and trust the type', async () => {
    const triggerData = { message: 'hello' };
    const handlerFn = jest.fn();

    const handler = startMessageChain<typeof triggerData>().handle(handlerFn);
    await handler(triggerData, mockContext);

    expect(handlerFn).toHaveBeenCalledWith({ triggerData, context: mockContext });
  });

  it('should validate before guards run', async () => {
    const schema = z.object({ name: z.string() });
    const invalidData = { name: 123 } as unknown as { name: string };
    const guardCheck = jest.fn().mockReturnValue(true);
    const handlerFn = jest.fn();

    const handler = startMessageChain(schema).useGuard(guard(guardCheck)).handle(handlerFn);

    await expect(handler(invalidData, mockContext)).rejects.toThrow();
    expect(guardCheck).not.toHaveBeenCalled();
  });
});
