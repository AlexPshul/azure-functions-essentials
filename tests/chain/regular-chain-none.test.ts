import { InvocationContext } from '@azure/functions';
import { RegularChain, ChainGuardError, guard, funcResult } from '../../src';

describe('RegularChain with responseType none', () => {
  let mockContext: InvocationContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = new InvocationContext();
    mockContext.error = jest.fn();
  });

  it('should call handler with triggerData and context', async () => {
    const triggerData = { message: 'hello' };
    const handlerFn = jest.fn();

    const chain = new RegularChain<typeof triggerData, 'none'>({ responseType: 'none' });
    const handler = chain.handle(handlerFn);
    await handler(triggerData, mockContext);

    expect(handlerFn).toHaveBeenCalledWith(triggerData, mockContext);
  });

  it('should throw ChainGuardError when guard fails', async () => {
    const triggerData = { message: 'hello' };
    const failingGuard = guard(() => false);
    const handlerFn = jest.fn();

    const chain = new RegularChain<typeof triggerData, 'none'>({ responseType: 'none' }).useGuard(failingGuard);
    const handler = chain.handle(handlerFn);

    await expect(handler(triggerData, mockContext)).rejects.toThrow(ChainGuardError);
    expect(handlerFn).not.toHaveBeenCalled();
  });

  it('should throw ChainGuardError with custom response when guard returns HttpResponseInit', async () => {
    const triggerData = { message: 'hello' };
    const customResponse = funcResult('Forbidden', 'Not allowed');
    const failingGuard = guard(() => customResponse);
    const handlerFn = jest.fn();

    const chain = new RegularChain<typeof triggerData, 'none'>({ responseType: 'none' }).useGuard(failingGuard);
    const handler = chain.handle(handlerFn);

    try {
      await handler(triggerData, mockContext);
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ChainGuardError);
      expect((error as ChainGuardError).guardResult).toEqual(customResponse);
    }
  });

  it('should return void when handler completes successfully', async () => {
    const triggerData = { message: 'hello' };
    const handlerFn = jest.fn();

    const chain = new RegularChain<typeof triggerData, 'none'>({ responseType: 'none' });
    const handler = chain.handle(handlerFn);
    const result = await handler(triggerData, mockContext);

    expect(result).toBeUndefined();
  });

  it('should execute guards with chainData pattern', async () => {
    const triggerData = { message: 'hello' };
    const guardCheck = jest.fn().mockReturnValue(true);
    const handlerFn = jest.fn();

    const chain = new RegularChain<typeof triggerData, 'none'>({ responseType: 'none' }).useGuard(guard(guardCheck));
    const handler = chain.handle(handlerFn);
    await handler(triggerData, mockContext);

    expect(guardCheck).toHaveBeenCalledWith({ triggerData, context: mockContext });
  });
});
