import { HttpRequest, InvocationContext } from '@azure/functions';
import { BaseChain, funcResult, guard } from '../../../src';

// Create a concrete implementation of the abstract BaseChain for testing
class TestChain extends BaseChain {
  public async runChain(request: HttpRequest, context: InvocationContext) {
    return this.executeChain({ request, context });
  }
}

describe('BaseChain.useAnyGuard', () => {
  // Mock objects
  const mockRequest = {} as HttpRequest;
  let mockContext: InvocationContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = new InvocationContext();
    mockContext.error = jest.fn();
  });

  describe('with direct guard instances', () => {
    it('should pass if any guard passes', async () => {
      // Arrange
      const failingGuard1 = guard(() => false);
      const passingGuard = guard(() => true);
      const failingGuard2 = guard(() => false);

      const chain = new TestChain().useAnyGuard(failingGuard1, passingGuard, failingGuard2);

      // Act
      const result = await chain.runChain(mockRequest, mockContext);

      // Assert
      expect(result).toBeUndefined(); // Chain should pass
      expect(mockContext.error).not.toHaveBeenCalled();
    });

    it('should fail if all guards fail', async () => {
      // Arrange
      const failingGuard1 = guard(() => false);
      const failingGuard2 = guard(() => false);
      const failingGuard3 = guard(() => false);

      const chain = new TestChain().useAnyGuard(failingGuard1, failingGuard2, failingGuard3);

      // Act
      const result = await chain.runChain(mockRequest, mockContext);

      // Assert
      expect(result).toBeDefined(); // Chain should fail
      expect(mockContext.error).toHaveBeenCalled();
    });

    it('should return custom error if all guards fail with custom response', async () => {
      // Arrange
      const customResponse = funcResult('BadRequest', 'Custom error message');
      const failingGuard1 = guard(() => customResponse);
      const failingGuard2 = guard(() => false);

      const chain = new TestChain().useAnyGuard(failingGuard1, failingGuard2);

      // Act
      const result = await chain.runChain(mockRequest, mockContext);

      // Assert
      expect(result).toBeDefined();
      expect(result).toEqual(funcResult('Forbidden', { message: 'None of the guards in the link passed.', results: [customResponse, false] }));
      expect(mockContext.error).toHaveBeenCalled();
    });

    it('should short-circuit when first guard passes', async () => {
      // Arrange
      const passingGuard = guard(jest.fn().mockReturnValue(true));
      const secondGuard = guard(jest.fn().mockReturnValue(true));

      const chain = new TestChain().useAnyGuard(passingGuard, secondGuard);

      // Act
      await chain.runChain(mockRequest, mockContext);

      // Assert
      expect((passingGuard.check as jest.Mock).mock.calls.length).toBe(1);
      // The second guard should not be called since the first one passed
      expect((secondGuard.check as jest.Mock).mock.calls.length).toBe(0);
    });
  });

  describe('with function returning guards', () => {
    it('should pass if any guard from the function passes', async () => {
      // Arrange
      const failingGuard = guard(() => false);
      const passingGuard = guard(() => true);
      const guardFn = jest.fn().mockReturnValue([failingGuard, passingGuard]);

      const chain = new TestChain().useAnyGuard(guardFn);

      // Act
      const result = await chain.runChain(mockRequest, mockContext);

      // Assert
      expect(result).toBeUndefined(); // Chain should pass
      expect(guardFn).toHaveBeenCalledWith({ request: mockRequest, context: mockContext });
      expect(mockContext.error).not.toHaveBeenCalled();
    });

    it('should fail if all guards from the function fail', async () => {
      // Arrange
      const customFailResponse = funcResult('Forbidden', 'Pop... pop... popsicle! Art... art... Article! Test... test... testing...');
      const failingGuard1 = guard(() => customFailResponse);
      const failingGuard2 = guard(() => false);
      const guardFn = jest.fn().mockReturnValue([failingGuard1, failingGuard2]);

      const chain = new TestChain().useAnyGuard(guardFn);

      // Act
      const result = await chain.runChain(mockRequest, mockContext);

      // Assert
      expect(result).toEqual(funcResult('Forbidden', { message: 'None of the guards in the link passed.', results: [customFailResponse, false] }));
      expect(guardFn).toHaveBeenCalledWith({ request: mockRequest, context: mockContext });
      expect(mockContext.error).toHaveBeenCalled();
    });

    it('should short-circuit when a guard passes', async () => {
      // Arrange
      const firstFn = jest.fn().mockReturnValue(false);
      const secondFn = jest.fn().mockReturnValue(true);
      const thirdFn = jest.fn().mockReturnValue(false);

      const firstGuard = guard(firstFn);
      const secondGuard = guard(secondFn);
      const thirdGuard = guard(thirdFn);

      const guardFn = jest.fn().mockReturnValue([firstGuard, secondGuard, thirdGuard]);

      const chain = new TestChain().useAnyGuard(guardFn);

      // Act
      await chain.runChain(mockRequest, mockContext);

      // Assert
      expect(firstFn).toHaveBeenCalledTimes(1);
      expect(secondFn).toHaveBeenCalledTimes(1);
      // The third guard should not be called since the second one passed
      expect(thirdFn).toHaveBeenCalledTimes(0);
    });
  });

  describe('integration with other chain features', () => {
    it('should work with other guards in the chain', async () => {
      // Arrange
      const failingGuard = guard(() => false);
      const passingGuard = guard(() => true);
      const regularGuardFn = jest.fn().mockReturnValue(true);
      const regularGuard = guard(regularGuardFn);

      const chain = new TestChain().useAnyGuard(failingGuard, passingGuard).useGuard(regularGuard);

      // Act
      const result = await chain.runChain(mockRequest, mockContext);

      // Assert
      expect(result).toBeUndefined(); // Chain should pass
      expect(regularGuardFn).toHaveBeenCalled();
    });

    it('should stop chain execution if all guards fail', async () => {
      // Arrange
      const failingGuard1 = guard(() => false);
      const failingGuard2 = guard(() => false);
      const regularGuardFn = jest.fn().mockReturnValue(true);
      const regularGuard = guard(regularGuardFn);

      const chain = new TestChain().useAnyGuard(failingGuard1, failingGuard2).useGuard(regularGuard);

      // Act
      const result = await chain.runChain(mockRequest, mockContext);

      // Assert
      expect(result).toEqual(funcResult('Forbidden', { message: 'None of the guards in the link passed.', results: [false, false] }));
      expect(mockContext.error).toHaveBeenCalled();
      // The regular guard should not be called since the anyGuard failed
      expect(regularGuardFn).not.toHaveBeenCalled();
    });
  });
});
