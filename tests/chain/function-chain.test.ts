import { HttpRequest, InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { BasicTriggerChain, funcResult, guard, inputFactory } from '../../src';

describe('BasicTriggerChain', () => {
  const mockTriggerData = {} as HttpRequest;
  let mockContext: InvocationContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = new InvocationContext();
    mockContext.error = jest.fn();
  });

  describe('useGuard', () => {
    it('should add a guard to the chain', () => {
      const testGuard = guard(() => true);
      const chain = new BasicTriggerChain<HttpRequest, 'http'>({ responseType: 'http' });

      const result = chain.useGuard(testGuard);

      expect(result).toBe(chain);
    });

    it('should add a guard function to the chain', () => {
      const guardFn = jest.fn(() => guard(() => true));
      const chain = new BasicTriggerChain<HttpRequest, 'http'>({ responseType: 'http' });

      const result = chain.useGuard(guardFn);

      expect(result).toBe(chain);
    });
  });

  describe('useInputBinding', () => {
    it('should add an input binding to the chain', () => {
      const testInput = inputFactory<string, string>('test', async data => data.toUpperCase());
      const binding = testInput.create('test-data');
      const chain = new BasicTriggerChain<HttpRequest, 'http'>({ responseType: 'http' });

      const result = chain.useInputBinding(binding);

      expect(result).toBe(chain);
    });

    it('should add an input binding function to the chain', () => {
      const testInput = inputFactory<string, string>('test', async data => data.toUpperCase());
      const bindingFn = jest.fn(() => testInput.create('test-data'));
      const chain = new BasicTriggerChain<HttpRequest, 'http'>({ responseType: 'http' });

      const result = chain.useInputBinding(bindingFn);

      expect(result).toBe(chain);
    });
  });

  describe('handle (chain execution)', () => {
    it('should execute all chain links successfully', async () => {
      const testGuard = guard(() => true);
      const testInput = inputFactory<string, string>('test', async data => data.toUpperCase());
      const binding = testInput.create('test-data');
      const handlerFn = jest.fn().mockReturnValue(funcResult('OK', 'Success'));

      const chain = new BasicTriggerChain<HttpRequest, 'http'>({ responseType: 'http' }).useGuard(testGuard).useInputBinding(binding);

      const handler = chain.handle(handlerFn);
      const result = await handler(mockTriggerData, mockContext);

      expect(result).toEqual(funcResult('OK', 'Success'));
      expect(testInput.get(mockContext)).toBe('TEST-DATA');
      expect(mockContext.error).not.toHaveBeenCalled();
    });

    it('should stop execution when a guard fails with false', async () => {
      const passingGuardCheck = jest.fn().mockReturnValue(true);
      const failingGuardCheck = jest.fn().mockReturnValue(false);
      const nonCallableGuardCheck = jest.fn().mockReturnValue(true);
      const handlerFn = jest.fn();

      const chain = new BasicTriggerChain<HttpRequest, 'http'>({ responseType: 'http' })
        .useGuard(guard(passingGuardCheck))
        .useGuard(guard(failingGuardCheck))
        .useGuard(guard(nonCallableGuardCheck));

      const handler = chain.handle(handlerFn);
      await handler(mockTriggerData, mockContext);

      expect(handlerFn).not.toHaveBeenCalled();
      expect(mockContext.error).toHaveBeenCalled();
      expect(passingGuardCheck).toHaveBeenCalledWith({ triggerData: mockTriggerData, context: mockContext });
      expect(failingGuardCheck).toHaveBeenCalledWith({ triggerData: mockTriggerData, context: mockContext });
      expect(nonCallableGuardCheck).not.toHaveBeenCalled();
    });

    it('should stop execution when a guard fails with custom response', async () => {
      const customResponse = funcResult('Forbidden', 'Custom error message');
      const handlerFn = jest.fn();

      const chain = new BasicTriggerChain<HttpRequest, 'http'>({ responseType: 'http' }).useGuard(guard(() => customResponse));

      const handler = chain.handle(handlerFn);
      const result = await handler(mockTriggerData, mockContext);

      expect(handlerFn).not.toHaveBeenCalled();
      expect(result).toBe(customResponse);
      expect(mockContext.error).toHaveBeenCalled();
    });

    it('should execute all chains when conditional guard value check returns a falsy value', async () => {
      const failingGuardCheck = jest.fn().mockImplementation(() => false);
      const handlerFn = jest.fn().mockReturnValue(funcResult('OK'));

      const chain = new BasicTriggerChain<HttpRequest, 'http'>({ responseType: 'http' }).useGuardIf(() => undefined, failingGuardCheck);

      const handler = chain.handle(handlerFn);
      const result = await handler(mockTriggerData, mockContext);

      expect(result).toEqual(funcResult('OK'));
      expect(mockContext.error).not.toHaveBeenCalled();
      expect(failingGuardCheck).not.toHaveBeenCalled();
    });

    it('should execute all chains when conditional guard value check returns a truthy value and passed to the guard', async () => {
      const valueToCheck = 'test-value';
      const passingGuardCheck = jest.fn().mockImplementation((passedValue: string) => passedValue === valueToCheck);
      const handlerFn = jest.fn().mockReturnValue(funcResult('OK'));

      const chain = new BasicTriggerChain<HttpRequest, 'http'>({ responseType: 'http' }).useGuardIf(
        () => valueToCheck,
        ({ checkedValue }) => guard(() => passingGuardCheck(checkedValue)),
      );

      const handler = chain.handle(handlerFn);
      const result = await handler(mockTriggerData, mockContext);

      expect(result).toEqual(funcResult('OK'));
      expect(mockContext.error).not.toHaveBeenCalled();
      expect(passingGuardCheck).toHaveBeenCalled();
    });

    it('should stop execution when an input binding fails', async () => {
      const passingGuard = guard(() => true);
      const testInput = inputFactory<string, string>('test', async () => {
        throw new Error('Failed to fetch data');
      });
      const failingBinding = testInput.create('test-data');
      const handlerFn = jest.fn();

      const chain = new BasicTriggerChain<HttpRequest, 'http'>({ responseType: 'http' }).useGuard(passingGuard).useInputBinding(failingBinding);

      const handler = chain.handle(handlerFn);
      const result = await handler(mockTriggerData, mockContext);

      expect(handlerFn).not.toHaveBeenCalled();
      expect(mockContext.error).toHaveBeenCalled();
      expect(result).toEqual(funcResult('InternalServerError', 'There is no spoon'));
    });
  });

  describe('zodSchema validation', () => {
    const schema = z.object({ name: z.string(), age: z.number().min(18) });

    it('should pass validation and call handler with valid data', async () => {
      const triggerData = { name: 'Test', age: 30 };
      const handlerFn = jest.fn().mockReturnValue({ ok: true });

      const chain = new BasicTriggerChain<typeof triggerData, 'json'>({ responseType: 'json', zodSchema: schema });
      const handler = chain.handle(handlerFn);
      const result = await handler(triggerData, mockContext);

      expect(handlerFn).toHaveBeenCalledWith({ triggerData, context: mockContext });
      expect(result).toEqual({ ok: true });
    });

    it('should return ChainFailure with linkType validation when data is invalid', async () => {
      const triggerData = { name: 'Test', age: 15 };
      const handlerFn = jest.fn();

      const chain = new BasicTriggerChain<typeof triggerData, 'json'>({ responseType: 'json', zodSchema: schema });
      const handler = chain.handle(handlerFn);
      const result = await handler(triggerData, mockContext);

      expect(handlerFn).not.toHaveBeenCalled();
      expect(result).toHaveProperty('linkType', 'validation');
      expect(result).toHaveProperty('linkIndex', -1);
    });

    it('should validate before guards run', async () => {
      const triggerData = { name: 'Test', age: 15 };
      const guardCheck = jest.fn().mockReturnValue(true);
      const handlerFn = jest.fn();

      const chain = new BasicTriggerChain<typeof triggerData, 'json'>({ responseType: 'json', zodSchema: schema }).useGuard(guard(guardCheck));
      const handler = chain.handle(handlerFn);
      await handler(triggerData, mockContext);

      expect(guardCheck).not.toHaveBeenCalled();
      expect(handlerFn).not.toHaveBeenCalled();
    });

    it('should throw Error on validation failure when responseType is none', async () => {
      const triggerData = { name: 'Test', age: 15 };
      const handlerFn = jest.fn();

      const chain = new BasicTriggerChain<typeof triggerData>({ responseType: 'none', zodSchema: schema });
      const handler = chain.handle(handlerFn);

      await expect(handler(triggerData, mockContext)).rejects.toThrow();
      expect(handlerFn).not.toHaveBeenCalled();
    });

    it('should return 400 on validation failure when responseType is http', async () => {
      const triggerData = { name: 'Test', age: 15 };
      const handlerFn = jest.fn();

      const chain = new BasicTriggerChain<typeof triggerData, 'http'>({ responseType: 'http', zodSchema: schema });
      const handler = chain.handle(handlerFn);
      const result = await handler(triggerData, mockContext);

      expect(handlerFn).not.toHaveBeenCalled();
      expect((result as { status: number }).status).toBe(400);
    });

    it('should skip validation when no zodSchema is provided', async () => {
      const triggerData = { name: 'Test', age: 15 };
      const handlerFn = jest.fn().mockReturnValue({ ok: true });

      const chain = new BasicTriggerChain<typeof triggerData, 'json'>({ responseType: 'json' });
      const handler = chain.handle(handlerFn);
      const result = await handler(triggerData, mockContext);

      expect(handlerFn).toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });
  });
});
