import { HttpRequest, InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { funcResult, guard, inputFactory, ParsedBodyChain } from '../../src';

describe('ParsedBodyChain', () => {
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

  describe('handle with no schema validation', () => {
    it('should parse body and pass it to handler', async () => {
      // Arrange
      const requestBody = { name: 'Test', age: 30 };
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);

      const handlerFn = jest.fn().mockImplementation((req, body, ctx) => funcResult('OK', body));

      const chain = new ParsedBodyChain(undefined);

      // Act
      const handler = chain.handle(handlerFn);
      const result = await handler(mockRequest, mockContext);

      // Assert
      expect(mockRequest.json).toHaveBeenCalled();
      expect(handlerFn).toHaveBeenCalledWith(mockRequest, requestBody, mockContext);
      expect(result).toEqual(funcResult('OK', requestBody));
    });

    it('should execute chains with body data available', async () => {
      // Arrange
      const requestBody = { name: 'Test', age: 30 };
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);

      // Create a guard that uses the body data
      // (body.age >= 18 ? true : funcResult('Forbidden', 'Age must be at least 18'))
      const bodyCheckGuardFunc = jest.fn().mockImplementation(body => (body.age >= 18 ? true : funcResult('Forbidden', 'Age must be at least 18')));
      const bodyCheckGuard = (body: typeof requestBody) => guard((req, ctx) => bodyCheckGuardFunc(body));

      const handlerFn = jest.fn().mockImplementation((req, body, ctx) => funcResult('OK', `User ${body.name} is ${body.age} years old`));

      const chain = new ParsedBodyChain<typeof requestBody>(undefined).useGuard(({ body }) => bodyCheckGuard(body));

      // Act
      const handler = chain.handle(handlerFn);
      const result = await handler(mockRequest, mockContext);

      // Assert
      expect(handlerFn).toHaveBeenCalledWith(mockRequest, requestBody, mockContext);
      expect(result).toEqual(funcResult('OK', 'User Test is 30 years old'));
    });
  });

  describe('handle with schema validation', () => {
    it('should validate body with static schema', async () => {
      // Arrange
      const requestBody = { name: 'Test', age: 30 };
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);

      const schema = z.object({
        name: z.string(),
        age: z.number().min(18),
      });

      const handlerFn = jest.fn().mockImplementation((req, body, ctx) => funcResult('OK', body));

      const chain = new ParsedBodyChain(schema);

      // Act
      const handler = chain.handle(handlerFn);
      const result = await handler(mockRequest, mockContext);

      // Assert
      expect(mockRequest.json).toHaveBeenCalled();
      expect(handlerFn).toHaveBeenCalledWith(mockRequest, requestBody, mockContext);
      expect(result).toEqual(funcResult('OK', requestBody));
    });

    it('should validate body with dynamic schema function', async () => {
      // Arrange
      const requestBody = { name: 'Test', age: 30 };
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);

      const schemaFn = jest.fn().mockReturnValue(
        z.object({
          name: z.string(),
          age: z.number().min(18),
        }),
      );

      const handlerFn = jest.fn().mockImplementation((req, body, ctx) => {
        return funcResult('OK', body);
      });

      const chain = new ParsedBodyChain(schemaFn);

      // Act
      const handler = chain.handle(handlerFn);
      const result = await handler(mockRequest, mockContext);

      // Assert
      expect(schemaFn).toHaveBeenCalled();
      expect(handlerFn).toHaveBeenCalledWith(mockRequest, requestBody, mockContext);
      expect(result).toEqual(funcResult('OK', requestBody));
    });

    it('should return BadRequest when schema validation fails', async () => {
      // Arrange
      const invalidRequestBody = { name: 'Test', age: 15 }; // Age under 18
      (mockRequest.json as jest.Mock).mockResolvedValue(invalidRequestBody);

      const schema = z.object({
        name: z.string(),
        age: z.number().min(18),
      });

      const handlerFn = jest.fn();

      const chain = new ParsedBodyChain(schema);

      // Act
      const handler = chain.handle(handlerFn);
      const result = await handler(mockRequest, mockContext);

      // Assert
      expect(mockRequest.json).toHaveBeenCalled();
      expect(handlerFn).not.toHaveBeenCalled();
      expect(result.status).toBe(400); // BadRequest status

      if ('jsonBody' in result) expect(result.jsonBody).toBeDefined(); // Should include validation errors
      else fail('Expected result to include a JSON body with validation errors');
    });
  });

  describe('integration with guards and input bindings', () => {
    it('should execute guards and input bindings before handler', async () => {
      // Arrange
      const requestBody = { name: 'Test', age: 30 };
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);

      const passingGuardCheck = jest.fn().mockReturnValue(true);

      const testInputFunc = jest.fn().mockImplementation((str: string) => str.toUpperCase());
      const testInput = inputFactory<string, string>('test', testInputFunc);
      const binding = (str: string) => testInput.create(str);

      const handlerFn = jest.fn().mockImplementation((req, body, ctx) => {
        const inputValue = testInput.get(ctx);
        return funcResult('OK', { ...body, name: inputValue });
      });

      const chain = new ParsedBodyChain<typeof requestBody>(undefined)
        .useGuard(guard(passingGuardCheck))
        .useInputBinding(({ body }) => binding(body.name));

      // Act
      const handler = chain.handle(handlerFn);
      const result = await handler(mockRequest, mockContext);

      // Assert
      expect(handlerFn).toHaveBeenCalled();
      expect(mockContext.extraInputs.get('test')).toBe('TEST');
      expect(result).toEqual(funcResult('OK', { ...requestBody, name: 'TEST' }));
      expect(passingGuardCheck).toHaveBeenCalled();
    });

    it('should skip handler when guard fails', async () => {
      // Arrange
      const requestBody = { name: 'Test', age: 30 };
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);

      const customResponse = funcResult('Forbidden', 'Access denied');
      const failingGuard = guard(() => customResponse);
      const handlerFn = jest.fn();

      const chain = new ParsedBodyChain(undefined).useGuard(failingGuard);

      // Act
      const handler = chain.handle(handlerFn);
      const result = await handler(mockRequest, mockContext);

      // Assert
      expect(handlerFn).not.toHaveBeenCalled();
      expect(result).toEqual(customResponse);
      expect(mockContext.error).toHaveBeenCalled();
    });

    it('should return default OK response when handler returns nothing', async () => {
      // Arrange
      const requestBody = { name: 'Test', age: 30 };
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);

      const handlerFn = jest.fn().mockResolvedValue(undefined);

      const chain = new ParsedBodyChain(undefined);

      // Act
      const handler = chain.handle(handlerFn);
      const result = await handler(mockRequest, mockContext);

      // Assert
      expect(handlerFn).toHaveBeenCalled();
      expect(result).toEqual(funcResult('OK'));
    });
  });
});
