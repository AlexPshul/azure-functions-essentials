import { HttpRequest, InvocationContext } from '@azure/functions';
import { FunctionChain, funcResult, guard, ChainFailure } from '../../../src';

describe('FunctionChain.useAnyGuard', () => {
  const mockTriggerData = {} as HttpRequest;
  let mockContext: InvocationContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = new InvocationContext();
    mockContext.error = jest.fn();
  });

  const buildChain = () => new FunctionChain<HttpRequest, 'json'>({ responseType: 'json' });
  const runChain = async (chain: FunctionChain<HttpRequest, 'json'>) => {
    const handler = chain.handle(() => undefined);
    return handler(mockTriggerData, mockContext);
  };

  describe('with direct guard instances', () => {
    it('should pass if any guard passes', async () => {
      const failingGuard1 = guard(() => false);
      const passingGuard = guard(() => true);
      const failingGuard2 = guard(() => false);

      const chain = buildChain().useAnyGuard(failingGuard1, passingGuard, failingGuard2);
      const result = await runChain(chain);

      expect(result).toBeUndefined();
      expect(mockContext.error).not.toHaveBeenCalled();
    });

    it('should fail if all guards fail', async () => {
      const failingGuard1 = guard(() => false);
      const failingGuard2 = guard(() => false);
      const failingGuard3 = guard(() => false);

      const chain = buildChain().useAnyGuard(failingGuard1, failingGuard2, failingGuard3);
      const result = await runChain(chain);

      expect(result).toBeDefined();
      expect(mockContext.error).toHaveBeenCalled();
    });

    it('should return custom error if all guards fail with custom response', async () => {
      const customResponse = funcResult('BadRequest', 'Custom error message');
      const failingGuard1 = guard(() => customResponse);
      const failingGuard2 = guard(() => false);

      const chain = buildChain().useAnyGuard(failingGuard1, failingGuard2);
      const result = await runChain(chain);

      expect((result as ChainFailure).result).toEqual(
        funcResult('Forbidden', { message: 'None of the guards in the link passed.', results: [customResponse, false] }),
      );
      expect(mockContext.error).toHaveBeenCalled();
    });

    it('should short-circuit when first guard passes', async () => {
      const passingGuard = guard(jest.fn().mockReturnValue(true));
      const secondGuard = guard(jest.fn().mockReturnValue(true));

      const chain = buildChain().useAnyGuard(passingGuard, secondGuard);
      await runChain(chain);

      expect((passingGuard.check as jest.Mock).mock.calls.length).toBe(1);
      expect((secondGuard.check as jest.Mock).mock.calls.length).toBe(0);
    });
  });

  describe('with function returning guards', () => {
    it('should pass if any guard from the function passes', async () => {
      const failingGuard = guard(() => false);
      const passingGuard = guard(() => true);
      const guardFn = jest.fn().mockReturnValue([failingGuard, passingGuard]);

      const chain = buildChain().useAnyGuard(guardFn);
      const result = await runChain(chain);

      expect(result).toBeUndefined();
      expect(guardFn).toHaveBeenCalledWith({ triggerData: mockTriggerData, context: mockContext });
      expect(mockContext.error).not.toHaveBeenCalled();
    });

    it('should fail if all guards from the function fail', async () => {
      const customFailResponse = funcResult('Forbidden', 'Pop... pop... popsicle! Art... art... Article! Test... test... testing...');
      const failingGuard1 = guard(() => customFailResponse);
      const failingGuard2 = guard(() => false);
      const guardFn = jest.fn().mockReturnValue([failingGuard1, failingGuard2]);

      const chain = buildChain().useAnyGuard(guardFn);
      const result = await runChain(chain);

      expect((result as ChainFailure).result).toEqual(
        funcResult('Forbidden', { message: 'None of the guards in the link passed.', results: [customFailResponse, false] }),
      );
      expect(guardFn).toHaveBeenCalledWith({ triggerData: mockTriggerData, context: mockContext });
      expect(mockContext.error).toHaveBeenCalled();
    });

    it('should short-circuit when a guard passes', async () => {
      const firstFn = jest.fn().mockReturnValue(false);
      const secondFn = jest.fn().mockReturnValue(true);
      const thirdFn = jest.fn().mockReturnValue(false);

      const firstGuard = guard(firstFn);
      const secondGuard = guard(secondFn);
      const thirdGuard = guard(thirdFn);

      const guardFn = jest.fn().mockReturnValue([firstGuard, secondGuard, thirdGuard]);

      const chain = buildChain().useAnyGuard(guardFn);
      await runChain(chain);

      expect(firstFn).toHaveBeenCalledTimes(1);
      expect(secondFn).toHaveBeenCalledTimes(1);
      expect(thirdFn).toHaveBeenCalledTimes(0);
    });
  });

  describe('integration with other chain features', () => {
    it('should work with other guards in the chain', async () => {
      const failingGuard = guard(() => false);
      const passingGuard = guard(() => true);
      const regularGuardFn = jest.fn().mockReturnValue(true);
      const regularGuard = guard(regularGuardFn);

      const chain = buildChain().useAnyGuard(failingGuard, passingGuard).useGuard(regularGuard);
      const result = await runChain(chain);

      expect(result).toBeUndefined();
      expect(regularGuardFn).toHaveBeenCalled();
    });

    it('should stop chain execution if all guards fail', async () => {
      const failingGuard1 = guard(() => false);
      const failingGuard2 = guard(() => false);
      const regularGuardFn = jest.fn().mockReturnValue(true);
      const regularGuard = guard(regularGuardFn);

      const chain = buildChain().useAnyGuard(failingGuard1, failingGuard2).useGuard(regularGuard);
      const result = await runChain(chain);

      expect((result as ChainFailure).result).toEqual(
        funcResult('Forbidden', { message: 'None of the guards in the link passed.', results: [false, false] }),
      );
      expect(mockContext.error).toHaveBeenCalled();
      expect(regularGuardFn).not.toHaveBeenCalled();
    });
  });
});
