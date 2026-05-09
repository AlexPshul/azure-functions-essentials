import { HttpRequest, InvocationContext } from '@azure/functions';
import { FunctionChain, funcResult, guard, inputFactory, transformer, BasicChainData } from '../../src';

describe('FunctionChain', () => {
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
      const chain = new FunctionChain<HttpRequest, 'http'>({ responseType: 'http' });

      const result = chain.useGuard(testGuard);

      expect(result).toBe(chain);
    });

    it('should add a guard function to the chain', () => {
      const guardFn = jest.fn(() => guard(() => true));
      const chain = new FunctionChain<HttpRequest, 'http'>({ responseType: 'http' });

      const result = chain.useGuard(guardFn);

      expect(result).toBe(chain);
    });
  });

  describe('useInputBinding', () => {
    it('should add an input binding to the chain', () => {
      const testInput = inputFactory<string, string>('test', async data => data.toUpperCase());
      const binding = testInput.create('test-data');
      const chain = new FunctionChain<HttpRequest, 'http'>({ responseType: 'http' });

      const result = chain.useInputBinding(binding);

      expect(result).toBe(chain);
    });

    it('should add an input binding function to the chain', () => {
      const testInput = inputFactory<string, string>('test', async data => data.toUpperCase());
      const bindingFn = jest.fn(() => testInput.create('test-data'));
      const chain = new FunctionChain<HttpRequest, 'http'>({ responseType: 'http' });

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

      const chain = new FunctionChain<HttpRequest, 'http'>({ responseType: 'http' }).useGuard(testGuard).useInputBinding(binding);

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

      const chain = new FunctionChain<HttpRequest, 'http'>({ responseType: 'http' })
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

      const chain = new FunctionChain<HttpRequest, 'http'>({ responseType: 'http' }).useGuard(guard(() => customResponse));

      const handler = chain.handle(handlerFn);
      const result = await handler(mockTriggerData, mockContext);

      expect(handlerFn).not.toHaveBeenCalled();
      expect(result).toBe(customResponse);
      expect(mockContext.error).toHaveBeenCalled();
    });

    it('should execute all chains when conditional guard value check returns a falsy value', async () => {
      const failingGuardCheck = jest.fn().mockImplementation(() => false);
      const handlerFn = jest.fn().mockReturnValue(funcResult('OK'));

      const chain = new FunctionChain<HttpRequest, 'http'>({ responseType: 'http' }).useGuardIf(() => undefined, failingGuardCheck);

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

      const chain = new FunctionChain<HttpRequest, 'http'>({ responseType: 'http' }).useGuardIf(
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

      const chain = new FunctionChain<HttpRequest, 'http'>({ responseType: 'http' }).useGuard(passingGuard).useInputBinding(failingBinding);

      const handler = chain.handle(handlerFn);
      const result = await handler(mockTriggerData, mockContext);

      expect(handlerFn).not.toHaveBeenCalled();
      expect(mockContext.error).toHaveBeenCalled();
      expect(result).toEqual(funcResult('InternalServerError', 'There is no spoon'));
    });
  });

  describe('useTransformer', () => {
    it('should enrich chain data via transformer', async () => {
      type HttpChainData = BasicChainData<HttpRequest>;
      const enrichTransformer = transformer<HttpChainData, HttpChainData & { extra: string }>(chainData => ({
        ...chainData,
        extra: 'enriched',
      }));
      const handlerFn = jest.fn().mockReturnValue(funcResult('OK'));

      const chain = new FunctionChain<HttpRequest, 'http'>({ responseType: 'http' }).useTransformer(enrichTransformer);

      const handler = chain.handle(handlerFn);
      await handler(mockTriggerData, mockContext);

      expect(handlerFn).toHaveBeenCalledWith(expect.objectContaining({ extra: 'enriched', triggerData: mockTriggerData, context: mockContext }));
    });

    it('should stop chain when transformer returns error', async () => {
      type HttpChainData = BasicChainData<HttpRequest>;
      const errorResponse = funcResult('BadRequest', 'Invalid data');
      const failingTransformer = transformer<HttpChainData, HttpChainData>(() => ({ error: errorResponse }));
      const handlerFn = jest.fn();

      const chain = new FunctionChain<HttpRequest, 'http'>({ responseType: 'http' }).useTransformer(failingTransformer);

      const handler = chain.handle(handlerFn);
      const result = await handler(mockTriggerData, mockContext);

      expect(handlerFn).not.toHaveBeenCalled();
      expect(result).toBe(errorResponse);
      expect(mockContext.error).toHaveBeenCalled();
    });

    it('should stop chain when transformer throws', async () => {
      type HttpChainData = BasicChainData<HttpRequest>;
      const throwingTransformer = transformer<HttpChainData, HttpChainData>(() => {
        throw new Error('Unexpected error');
      });
      const handlerFn = jest.fn();

      const chain = new FunctionChain<HttpRequest, 'http'>({ responseType: 'http' }).useTransformer(throwingTransformer);

      const handler = chain.handle(handlerFn);
      const result = await handler(mockTriggerData, mockContext);

      expect(handlerFn).not.toHaveBeenCalled();
      expect(result).toEqual(funcResult('InternalServerError', 'Transformation failed'));
      expect(mockContext.error).toHaveBeenCalled();
    });

    it('should pass enriched data to guards added after transformer', async () => {
      type HttpChainData = BasicChainData<HttpRequest>;
      const enrichTransformer = transformer<HttpChainData, HttpChainData & { parsedData: { role: string } }>(chainData => ({
        ...chainData,
        parsedData: { role: 'admin' },
      }));
      const guardCheck = jest.fn().mockReturnValue(true);
      const handlerFn = jest.fn().mockReturnValue(funcResult('OK'));

      const chain = new FunctionChain<HttpRequest, 'http'>({ responseType: 'http' })
        .useTransformer(enrichTransformer)
        .useGuard(({ parsedData }) => guard(() => guardCheck(parsedData)));

      const handler = chain.handle(handlerFn);
      await handler(mockTriggerData, mockContext);

      expect(guardCheck).toHaveBeenCalledWith({ role: 'admin' });
    });
  });

  describe('copyFromChain', () => {
    it('should copy chain links from another chain with mapping', async () => {
      const testInput = inputFactory<string, string>('test', async data => data.toUpperCase());
      const sourceChain = new FunctionChain<HttpRequest, 'http'>({ responseType: 'http' })
        .useGuard(guard(() => true))
        .useInputBinding(testInput.create('source'));

      const targetChain = new FunctionChain<HttpRequest, 'http'>({ responseType: 'http' });

      const mapFn = jest.fn(targetData => ({ ...targetData, extraProp: 'mapped' }));

      const result = targetChain.copyFromChain(sourceChain, mapFn);

      const handler = targetChain.handle(() => funcResult('OK'));
      await handler(mockTriggerData, mockContext);

      expect(result).toBe(targetChain);
      expect(mapFn).toHaveBeenCalled();
      expect(testInput.get(mockContext)).toBe('SOURCE');
    });
  });
});
