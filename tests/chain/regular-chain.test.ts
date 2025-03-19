import { HttpRequest, InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { funcResult, guard, inputFactory, RegularChain } from '../../src';

describe('RegularChain', () => {
  // Mock objects
  const mockRequest = {
    url: 'https://www.pshul.com',
    json: jest.fn(),
  } as unknown as HttpRequest;

  let mockContext: InvocationContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = new InvocationContext();
    mockContext.error = jest.fn();
    (mockRequest.json as jest.Mock).mockReset();
  });

  describe('handle', () => {
    it('should execute the handler function when chain passes', async () => {
      // Arrange
      const passingGuardCheck = jest.fn(() => true);
      const testInputFunc = jest.fn(data => data.toUpperCase());
      const testInput = inputFactory<string, string>('test', testInputFunc);
      const binding = testInput.create('test-data');
      const handlerFn = jest.fn().mockResolvedValue(funcResult('OK', 'Success'));

      const chain = new RegularChain().useGuard(guard(passingGuardCheck)).useInputBinding(binding);

      // Act
      const handler = chain.handle(handlerFn);
      const result = await handler(mockRequest, mockContext);

      // Assert
      expect(handlerFn).toHaveBeenCalledWith(mockRequest, mockContext);
      expect(result).toEqual(funcResult('OK', 'Success'));
      expect(passingGuardCheck).toHaveBeenCalledWith(mockRequest, mockContext);
      expect(testInputFunc).toHaveBeenCalledWith('test-data');
    });

    it('should return guard failure response and skip handler when a guard fails', async () => {
      // Arrange
      const customResponse = funcResult('Forbidden', 'Access denied');
      const failingGuard = guard(() => customResponse);
      const handlerFn = jest.fn().mockResolvedValue(funcResult('OK', 'Success'));

      const chain = new RegularChain().useGuard(failingGuard);

      // Act
      const handler = chain.handle(handlerFn);
      const result = await handler(mockRequest, mockContext);

      // Assert
      expect(handlerFn).not.toHaveBeenCalled();
      expect(result).toEqual(customResponse);
      expect(mockContext.error).toHaveBeenCalled();
    });

    it('should return default OK response if handler returns nothing', async () => {
      // Arrange
      const passingGuard = guard(() => true);
      const handlerFn = jest.fn().mockResolvedValue(undefined);

      const chain = new RegularChain().useGuard(passingGuard);

      // Act
      const handler = chain.handle(handlerFn);
      const result = await handler(mockRequest, mockContext);

      // Assert
      expect(handlerFn).toHaveBeenCalled();
      expect(result).toEqual(funcResult('OK'));
    });
  });

  describe('parseBody', () => {
    it('should return a ParsedBodyChain that transfers chain links', async () => {
      // Arrange
      const requestBody = { name: 'Test', age: 30 };
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);

      const passingGuardCheck = jest.fn(() => true);
      const testInput = inputFactory<string, string>('test', async data => data.toUpperCase());
      const binding = testInput.create('test-data');
      const handlerFn = jest.fn().mockImplementation((req, body) => funcResult('OK', body));

      const chain = new RegularChain().useGuard(guard(passingGuardCheck)).useInputBinding(binding);

      // Act
      const parsedChain = chain.parseBody();
      const handler = parsedChain.handle(handlerFn);
      const result = await handler(mockRequest, mockContext);

      // Assert
      expect(mockRequest.json).toHaveBeenCalled();
      expect(handlerFn).toHaveBeenCalled();
      expect(result).toEqual(funcResult('OK', requestBody));
      expect(mockContext.extraInputs.get('test')).toBe('TEST-DATA');
      expect(passingGuardCheck).toHaveBeenCalledWith(mockRequest, mockContext);
    });

    it('should validate body with Zod schema if provided', async () => {
      // Arrange
      const requestBody = { name: 'Test', age: 30 };
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);

      const schema = z.object({ name: z.string(), age: z.number().min(18) });

      const handlerFn = jest.fn().mockImplementation((req, body) => funcResult('OK', body));

      const chain = new RegularChain();

      // Act
      const parsedChain = chain.parseBody(schema);
      const handler = parsedChain.handle(handlerFn);
      const result = await handler(mockRequest, mockContext);

      // Assert
      expect(handlerFn).toHaveBeenCalled();
      expect(result).toEqual(funcResult('OK', requestBody));
    });

    it('should return BadRequest if body validation fails', async () => {
      // Arrange
      const invalidRequestBody = { name: 'Test', age: 15 }; // Age under 18
      (mockRequest.json as jest.Mock).mockResolvedValue(invalidRequestBody);

      const schema = z.object({ name: z.string(), age: z.number().min(18) });

      const handlerFn = jest.fn();

      const chain = new RegularChain();

      // Act
      const parsedChain = chain.parseBody(schema);
      const handler = parsedChain.handle(handlerFn);
      const result = await handler(mockRequest, mockContext);

      // Assert
      expect(handlerFn).not.toHaveBeenCalled();
      expect(result.status).toBe(400); // BadRequest
      expect(mockContext.error).toHaveBeenCalled();
    });

    it('should validate body with zod schema function if provided', async () => {
      // Arrange
      const requestBody = { name: 'Test', age: 30 };
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);

      const schemaFn = jest.fn(() => z.object({ name: z.string(), age: z.number().min(18) }));

      const handlerFn = jest.fn().mockImplementation((req, body) => funcResult('OK', body));

      const chain = new RegularChain();

      // Act
      const parsedChain = chain.parseBody(schemaFn);
      const handler = parsedChain.handle(handlerFn);
      const result = await handler(mockRequest, mockContext);

      // Assert
      expect(handlerFn).toHaveBeenCalled();
      expect(result).toEqual(funcResult('OK', requestBody));
      expect(schemaFn).toHaveBeenCalled();
    });
  });
});
