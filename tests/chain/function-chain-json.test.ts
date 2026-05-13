import { InvocationContext } from '@azure/functions';
import { BasicTriggerChain, ChainFailure, guard, funcResult } from '../../src';

describe('BasicTriggerChain with responseType json', () => {
  let mockContext: InvocationContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = new InvocationContext();
    mockContext.error = jest.fn();
  });

  it('should call handler and return its result', async () => {
    const triggerData = { message: 'hello' };
    const handlerFn = jest.fn().mockReturnValue({ result: 'success' });

    const chain = new BasicTriggerChain<typeof triggerData, 'json'>({ responseType: 'json' });
    const handler = chain.handle(handlerFn);
    const result = await handler(triggerData, mockContext);

    expect(handlerFn).toHaveBeenCalledWith({ triggerData, context: mockContext });
    expect(result).toEqual({ result: 'success' });
  });

  it('should return ChainFailure when guard fails', async () => {
    const triggerData = { message: 'hello' };
    const failingGuard = guard(() => false);
    const handlerFn = jest.fn();

    const chain = new BasicTriggerChain<typeof triggerData, 'json'>({ responseType: 'json' }).useGuard(failingGuard);
    const handler = chain.handle(handlerFn);
    const result = await handler(triggerData, mockContext);

    expect(result).toHaveProperty('linkType', 'guard');
    expect(result).toHaveProperty('linkIndex', 0);
    expect(handlerFn).not.toHaveBeenCalled();
  });

  it('should return ChainFailure with custom response when guard returns HttpResponseInit', async () => {
    const triggerData = { message: 'hello' };
    const customResponse = funcResult('Forbidden', 'Not allowed');
    const failingGuard = guard(() => customResponse);
    const handlerFn = jest.fn();

    const chain = new BasicTriggerChain<typeof triggerData, 'json'>({ responseType: 'json' }).useGuard(failingGuard);
    const handler = chain.handle(handlerFn);
    const result = await handler(triggerData, mockContext);

    expect((result as ChainFailure).result).toEqual(customResponse);
    expect((result as ChainFailure).linkType).toBe('guard');
  });

  it('should return handler result directly without wrapping', async () => {
    const triggerData = { message: 'hello' };
    const handlerFn = jest.fn().mockReturnValue('plain string result');

    const chain = new BasicTriggerChain<typeof triggerData, 'json'>({ responseType: 'json' });
    const handler = chain.handle(handlerFn);
    const result = await handler(triggerData, mockContext);

    expect(result).toBe('plain string result');
  });

  it('should return undefined when handler returns nothing', async () => {
    const triggerData = { message: 'hello' };
    const handlerFn = jest.fn();

    const chain = new BasicTriggerChain<typeof triggerData, 'json'>({ responseType: 'json' });
    const handler = chain.handle(handlerFn);
    const result = await handler(triggerData, mockContext);

    expect(result).toBeUndefined();
  });

  it('should execute guards with chainData pattern', async () => {
    const triggerData = { message: 'hello' };
    const guardCheck = jest.fn().mockReturnValue(true);
    const handlerFn = jest.fn().mockReturnValue({ ok: true });

    const chain = new BasicTriggerChain<typeof triggerData, 'json'>({ responseType: 'json' }).useGuard(guard(guardCheck));
    const handler = chain.handle(handlerFn);
    await handler(triggerData, mockContext);

    expect(guardCheck).toHaveBeenCalledWith({ triggerData, context: mockContext });
  });

  it('should serialize ChainFailure to JSON', async () => {
    const triggerData = { message: 'hello' };
    const customResponse = funcResult('Forbidden', 'Access denied');
    const failingGuard = guard(() => customResponse);
    const handlerFn = jest.fn();

    const chain = new BasicTriggerChain<typeof triggerData, 'json'>({ responseType: 'json' }).useGuard(failingGuard);
    const handler = chain.handle(handlerFn);
    const result = await handler(triggerData, mockContext);

    const serialized = JSON.parse(JSON.stringify(result));
    expect(serialized.result).toEqual(customResponse);
    expect(serialized.linkType).toBe('guard');
    expect(serialized.linkIndex).toBe(0);
  });
});
