import { InvocationContext } from '@azure/functions';
import { FunctionChain, guard } from '../../src';

describe('FunctionChain with responseType none', () => {
  let mockContext: InvocationContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = new InvocationContext();
    mockContext.error = jest.fn();
  });

  it('should call handler with chainData', async () => {
    const triggerData = { message: 'hello' };
    const handlerFn = jest.fn();

    const chain = new FunctionChain<typeof triggerData>({ responseType: 'none' });
    const handler = chain.handle(handlerFn);
    await handler(triggerData, mockContext);

    expect(handlerFn).toHaveBeenCalledWith({ triggerData, context: mockContext });
  });

  it('should throw Error when guard fails', async () => {
    const triggerData = { message: 'hello' };
    const failingGuard = guard(() => false);
    const handlerFn = jest.fn();

    const chain = new FunctionChain<typeof triggerData>({ responseType: 'none' }).useGuard(failingGuard);
    const handler = chain.handle(handlerFn);

    await expect(handler(triggerData, mockContext)).rejects.toThrow(Error);
    expect(handlerFn).not.toHaveBeenCalled();
  });

  it('should throw Error with descriptive message when guard fails', async () => {
    const triggerData = { message: 'hello' };
    const failingGuard = guard(() => false);
    const handlerFn = jest.fn();

    const chain = new FunctionChain<typeof triggerData>({ responseType: 'none' }).useGuard(failingGuard);
    const handler = chain.handle(handlerFn);

    await expect(handler(triggerData, mockContext)).rejects.toThrow('Chain guard #0 failed.');
  });

  it('should return void when handler completes successfully', async () => {
    const triggerData = { message: 'hello' };
    const handlerFn = jest.fn();

    const chain = new FunctionChain<typeof triggerData>({ responseType: 'none' });
    const handler = chain.handle(handlerFn);
    const result = await handler(triggerData, mockContext);

    expect(result).toBeUndefined();
  });

  it('should execute guards with chainData pattern', async () => {
    const triggerData = { message: 'hello' };
    const guardCheck = jest.fn().mockReturnValue(true);
    const handlerFn = jest.fn();

    const chain = new FunctionChain<typeof triggerData>({ responseType: 'none' }).useGuard(guard(guardCheck));
    const handler = chain.handle(handlerFn);
    await handler(triggerData, mockContext);

    expect(guardCheck).toHaveBeenCalledWith({ triggerData, context: mockContext });
  });
});
