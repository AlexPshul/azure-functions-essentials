import { FunctionInput, HttpRequest, InvocationContext } from '@azure/functions';
import { validateInputExistsGuard } from '../../../src/chain/guards/input-exists-guard';
import { funcResult } from '../../../src/helpers';

describe('input-exists-guard', () => {
  let mockContext: InvocationContext;
  let mockRequest: HttpRequest;

  beforeEach(() => {
    mockContext = new InvocationContext();
    mockContext.error = jest.fn();

    // Create a proper HttpRequest mock
    mockRequest = new HttpRequest({
      method: 'GET',
      url: 'https://example.com',
    });
  });

  describe('validateInputExistsGuard', () => {
    it('should pass when input exists and is not null', async () => {
      // Arrange
      mockContext.extraInputs.set('testInput', 'test-value');
      const guard = validateInputExistsGuard('testInput');

      // Act
      const result = await guard.check(mockRequest, mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('should pass when input exists as number 0', async () => {
      // Arrange
      mockContext.extraInputs.set('testInput', 0);
      const guard = validateInputExistsGuard('testInput');

      // Act
      const result = await guard.check(mockRequest, mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('should pass when input exists as empty string', async () => {
      // Arrange
      mockContext.extraInputs.set('testInput', '');
      const guard = validateInputExistsGuard('testInput');

      // Act
      const result = await guard.check(mockRequest, mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('should pass when input exists as false boolean', async () => {
      // Arrange
      mockContext.extraInputs.set('testInput', false);
      const guard = validateInputExistsGuard('testInput');

      // Act
      const result = await guard.check(mockRequest, mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('should fail when input does not exist', async () => {
      // Arrange
      const guard = validateInputExistsGuard('nonExistentInput');

      // Act
      const result = await guard.check(mockRequest, mockContext);

      // Assert
      expect(result).toEqual(funcResult('NotFound', 'No data found for [nonExistentInput].'));
    });

    it('should fail when input is null', async () => {
      // Arrange
      mockContext.extraInputs.set('testInput', null);
      const guard = validateInputExistsGuard('testInput');

      // Act
      const result = await guard.check(mockRequest, mockContext);

      // Assert
      expect(result).toEqual(funcResult('NotFound', 'No data found for [testInput].'));
    });

    it('should fail when input is undefined', async () => {
      // Arrange
      mockContext.extraInputs.set('testInput', undefined);
      const guard = validateInputExistsGuard('testInput');

      // Act
      const result = await guard.check(mockRequest, mockContext);

      // Assert
      expect(result).toEqual(funcResult('NotFound', 'No data found for [testInput].'));
    });

    it('should pass when input is a non-empty array and failOnEmptyArray is true', async () => {
      // Arrange
      mockContext.extraInputs.set('testInput', [1, 2, 3]);
      const guard = validateInputExistsGuard('testInput', true);

      // Act
      const result = await guard.check(mockRequest, mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('should fail when input is an empty array and failOnEmptyArray is true', async () => {
      // Arrange
      mockContext.extraInputs.set('testInput', []);
      const guard = validateInputExistsGuard('testInput', true);

      // Act
      const result = await guard.check(mockRequest, mockContext);

      // Assert
      expect(result).toEqual(funcResult('NotFound', 'No data found for [testInput].'));
    });

    it('should pass when input is an empty array and failOnEmptyArray is false', async () => {
      // Arrange
      mockContext.extraInputs.set('testInput', []);
      const guard = validateInputExistsGuard('testInput', false);

      // Act
      const result = await guard.check(mockRequest, mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('should work with FunctionInput object', async () => {
      // Arrange
      const functionInput = { name: 'testFunctionInput' } as FunctionInput;
      mockContext.extraInputs.set(functionInput, 'test-value');
      const guard = validateInputExistsGuard(functionInput);

      // Act
      const result = await guard.check(mockRequest, mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('should fail and show FunctionInput name in error message', async () => {
      // Arrange
      const functionInput = { name: 'testFunctionInput' } as FunctionInput;
      const guard = validateInputExistsGuard(functionInput);

      // Act
      const result = await guard.check(mockRequest, mockContext);

      // Assert
      expect(result).toEqual(funcResult('NotFound', 'No data found for [testFunctionInput].'));
    });
  });
});
