import { InvocationContext } from '@azure/functions';
import { RegularChain, ChainGuardError, guard, funcResult } from '../../src';

describe('RegularChain with responseType json', () => {
  let mockContext: InvocationContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = new InvocationContext();
    mockContext.error = jest.fn();
  });

  it('should call handler and return its result', async () => {
    const triggerData = { message: 'hello' };
    const handlerFn = jest.fn().mockReturnValue({ result: 'success' });

    const chain = new RegularChain<typeof triggerData, 'json'>('json');
    const handler = chain.handle(handlerFn);
    const result = await handler(triggerData, mockContext);

    expect(handlerFn).toHaveBeenCalledWith(triggerData, mockContext);
    expect(result).toEqual({ result: 'success' });
  });

  it('should return ChainGuardError when guard fails', async () => {
    const triggerData = { message: 'hello' };
    const failingGuard = guard(() => false);
    const handlerFn = jest.fn();

    const chain = new RegularChain<typeof triggerData, 'json'>('json').useGuard(failingGuard);
    const handler = chain.handle(handlerFn);
    const result = await handler(triggerData, mockContext);

    expect(result).toBeInstanceOf(ChainGuardError);
    expect(handlerFn).not.toHaveBeenCalled();
  });

  it('should return ChainGuardError with custom response when guard returns HttpResponseInit', async () => {
    const triggerData = { message: 'hello' };
    const customResponse = funcResult('Forbidden', 'Not allowed');
    const failingGuard = guard(() => customResponse);
    const handlerFn = jest.fn();

    const chain = new RegularChain<typeof triggerData, 'json'>('json').useGuard(failingGuard);
    const handler = chain.handle(handlerFn);
    const result = await handler(triggerData, mockContext);

    expect(result).toBeInstanceOf(ChainGuardError);
    expect((result as ChainGuardError).guardResult).toEqual(customResponse);
  });

  it('should return handler result directly without wrapping', async () => {
    const triggerData = { message: 'hello' };
    const handlerFn = jest.fn().mockReturnValue('plain string result');

    const chain = new RegularChain<typeof triggerData, 'json'>('json');
    const handler = chain.handle(handlerFn);
    const result = await handler(triggerData, mockContext);

    expect(result).toBe('plain string result');
  });

  it('should return undefined when handler returns nothing', async () => {
    const triggerData = { message: 'hello' };
    const handlerFn = jest.fn();

    const chain = new RegularChain<typeof triggerData, 'json'>('json');
    const handler = chain.handle(handlerFn);
    const result = await handler(triggerData, mockContext);

    expect(result).toBeUndefined();
  });

  it('should execute guards with chainData pattern', async () => {
    const triggerData = { message: 'hello' };
    const guardCheck = jest.fn().mockReturnValue(true);
    const handlerFn = jest.fn().mockReturnValue({ ok: true });

    const chain = new RegularChain<typeof triggerData, 'json'>('json').useGuard(guard(guardCheck));
    const handler = chain.handle(handlerFn);
    await handler(triggerData, mockContext);

    expect(guardCheck).toHaveBeenCalledWith({ triggerData, context: mockContext });
  });

  it('should serialize ChainGuardError to JSON with toJSON', async () => {
    const triggerData = { message: 'hello' };
    const customResponse = funcResult('Forbidden', 'Access denied');
    const failingGuard = guard(() => customResponse);
    const handlerFn = jest.fn();

    const chain = new RegularChain<typeof triggerData, 'json'>('json').useGuard(failingGuard);
    const handler = chain.handle(handlerFn);
    const result = await handler(triggerData, mockContext);

    const serialized = JSON.parse(JSON.stringify(result));
    expect(serialized.error).toBe('ChainGuardError');
    expect(serialized.guardResult).toEqual(customResponse);
    expect(serialized.linkType).toBe('guard');
    expect(serialized.linkIndex).toBe(0);
  });
});
