import { HttpRequest, InvocationContext } from '@azure/functions';
import { BaseChain } from '../../src/chain/base-chain';
import { guard } from '../../src/chain/guard';
import { inputFactory } from '../../src/chain/input-factory';
import { funcResult } from '../../src/helpers';

// Create a concrete implementation of the abstract BaseChain for testing
class TestChain extends BaseChain {
  public async runChain(request: HttpRequest, context: InvocationContext) {
    return this.executeChain({ request, context });
  }
}

describe('BaseChain', () => {
  // Mock objects
  const mockRequest = {} as HttpRequest;
  let mockContext: InvocationContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = new InvocationContext();
    mockContext.error = jest.fn();
  });

  describe('useGuard', () => {
    it('should add a guard to the chain', async () => {
      // Arrange
      const testGuard = guard(() => true);
      const chain = new TestChain();

      // Act
      const result = chain.useGuard(testGuard);

      // Assert
      expect(result).toBe(chain); // Should return this for method chaining
    });

    it('should add a guard function to the chain', async () => {
      // Arrange
      const guardFn = jest.fn(() => guard(() => true));
      const chain = new TestChain();

      // Act
      const result = chain.useGuard(guardFn);

      // Assert
      expect(result).toBe(chain); // Should return this for method chaining
    });
  });

  describe('useInputBinding', () => {
    it('should add an input binding to the chain', async () => {
      // Arrange
      const testInput = inputFactory<string, string>('test', async data => data.toUpperCase());
      const binding = testInput.create('test-data');
      const chain = new TestChain();

      // Act
      const result = chain.useInputBinding(binding);

      // Assert
      expect(result).toBe(chain); // Should return this for method chaining
    });

    it('should add an input binding function to the chain', async () => {
      // Arrange
      const testInput = inputFactory<string, string>('test', async data => data.toUpperCase());
      const bindingFn = jest.fn(() => testInput.create('test-data'));
      const chain = new TestChain();

      // Act
      const result = chain.useInputBinding(bindingFn);

      // Assert
      expect(result).toBe(chain); // Should return this for method chaining
    });
  });

  describe('executeChain', () => {
    it('should execute all chain links successfully', async () => {
      // Arrange
      const testGuard = guard(() => true);
      const testInput = inputFactory<string, string>('test', async data => data.toUpperCase());
      const binding = testInput.create('test-data');

      const chain = new TestChain().useGuard(testGuard).useInputBinding(binding);

      // Act
      const result = await chain.runChain(mockRequest, mockContext);

      // Assert
      expect(result).toBeUndefined(); // Chain executed successfully
      expect(mockContext.extraInputs.get('test')).toBe('TEST-DATA');
      expect(mockContext.error).not.toHaveBeenCalled();
    });

    it('should stop execution when a guard fails with false', async () => {
      // Arrange
      const passingGuardCheck = jest.fn().mockReturnValue(true);
      const failingGuardCheck = jest.fn().mockReturnValue(false);
      const nonCallableGuardCheck = jest.fn().mockReturnValue(true);

      const chain = new TestChain().useGuard(guard(passingGuardCheck)).useGuard(guard(failingGuardCheck)).useGuard(guard(nonCallableGuardCheck));

      // Act
      const result = await chain.runChain(mockRequest, mockContext);

      // Assert
      expect(result).toBeDefined();
      expect(mockContext.error).toHaveBeenCalled();
      expect(passingGuardCheck).toHaveBeenCalledWith(mockRequest, mockContext);
      expect(failingGuardCheck).toHaveBeenCalledWith(mockRequest, mockContext);
      expect(nonCallableGuardCheck).not.toHaveBeenCalled(); // This guard should not be called
    });

    it('should stop execution when a guard fails with custom response', async () => {
      // Arrange
      const customResponse = funcResult('Forbidden', 'Custom error message');
      const passingGuardCheck = jest.fn().mockReturnValue(true);
      const failingGuardCheck = jest.fn().mockReturnValue(customResponse);
      const nonCallableGuardCheck = jest.fn().mockReturnValue(true);

      const chain = new TestChain().useGuard(guard(passingGuardCheck)).useGuard(guard(failingGuardCheck)).useGuard(guard(nonCallableGuardCheck));

      // Act
      const result = await chain.runChain(mockRequest, mockContext);

      // Assert
      expect(result).toBe(customResponse);
      expect(mockContext.error).toHaveBeenCalled();
      expect(passingGuardCheck).toHaveBeenCalledWith(mockRequest, mockContext);
      expect(failingGuardCheck).toHaveBeenCalledWith(mockRequest, mockContext);
      expect(nonCallableGuardCheck).not.toHaveBeenCalled(); // This guard should not be called
    });

    it('should stop execution when an input binding fails', async () => {
      // Arrange
      const passingGuard = guard(() => true);
      const testInput = inputFactory<string, string>('test', async () => {
        throw new Error('Failed to fetch data');
      });
      const failingBinding = testInput.create('test-data');

      const chain = new TestChain().useGuard(passingGuard).useInputBinding(failingBinding);

      // Act
      const result = await chain.runChain(mockRequest, mockContext);

      // Assert
      expect(mockContext.error).toHaveBeenCalled();
      expect(result).toEqual(funcResult('InternalServerError', 'There is no spoon')); // Chain execution failed
    });
  });

  describe('copyFromChain', () => {
    it('should copy chain links from another chain with mapping', async () => {
      // Arrange
      const sourceChain = new TestChain()
        .useGuard(guard(() => true))
        .useInputBinding(inputFactory<string, string>('test', async data => data.toUpperCase()).create('source'));

      const targetChain = new TestChain();

      // Mock mapping function
      const mapFn = jest.fn(targetData => ({ ...targetData, extraProp: 'mapped' }));

      // Act
      const result = targetChain.copyFromChain(sourceChain, mapFn);
      await targetChain.runChain(mockRequest, mockContext);

      // Assert
      expect(result).toBe(targetChain); // Should return this for method chaining
      expect(mapFn).toHaveBeenCalled();
      expect(mockContext.extraInputs.get('test')).toBe('SOURCE');
    });
  });
});
