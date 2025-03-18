import { HttpRequest, InvocationContext } from '@azure/functions';
import { funcResult, guard } from '../../src';

describe('guard', () => {
  // Mock objects for HttpRequest and InvocationContext
  const mockRequest = {} as HttpRequest;
  const mockContext = new InvocationContext();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a guard with a check function that returns true', async () => {
    // Arrange
    const checkFn = jest.fn().mockReturnValue(true);

    // Act
    const testGuard = guard(checkFn);
    const result = await testGuard.check(mockRequest, mockContext);

    // Assert
    expect(checkFn).toHaveBeenCalledWith(mockRequest, mockContext);
    expect(result).toBe(true);
  });

  it('should create a guard with a check function that returns false', async () => {
    // Arrange
    const checkFn = jest.fn().mockReturnValue(false);

    // Act
    const testGuard = guard(checkFn);
    const result = await testGuard.check(mockRequest, mockContext);

    // Assert
    expect(checkFn).toHaveBeenCalledWith(mockRequest, mockContext);
    expect(result).toBe(false);
  });

  it('should create a guard with a check function that returns a custom response', async () => {
    // Arrange
    const customResponse = funcResult('Forbidden', 'Custom error message');
    const checkFn = jest.fn().mockReturnValue(customResponse);

    // Act
    const testGuard = guard(checkFn);
    const result = await testGuard.check(mockRequest, mockContext);

    // Assert
    expect(checkFn).toHaveBeenCalledWith(mockRequest, mockContext);
    expect(result).toEqual(customResponse);
  });

  it('should create a guard with an async check function', async () => {
    // Arrange
    const checkFn = jest.fn().mockResolvedValue(true);

    // Act
    const testGuard = guard(checkFn);
    const result = await testGuard.check(mockRequest, mockContext);

    // Assert
    expect(checkFn).toHaveBeenCalledWith(mockRequest, mockContext);
    expect(result).toBe(true);
  });
});
