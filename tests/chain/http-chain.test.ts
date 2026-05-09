import { HttpRequest, InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { funcResult, guard, inputFactory, HttpChain } from '../../src';

describe('HttpChain', () => {
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
      const passingGuardCheck = jest.fn(() => true);
      const testInputFunc = jest.fn(data => data.toUpperCase());
      const testInput = inputFactory<string, string>('test', testInputFunc);
      const binding = testInput.create('test-data');
      const handlerFn = jest.fn().mockResolvedValue(funcResult('OK', 'Success'));

      const chain = new HttpChain().useGuard(guard(passingGuardCheck)).useInputBinding(binding);

      const handler = chain.handle(handlerFn);
      const result = await handler(mockRequest, mockContext);

      expect(handlerFn).toHaveBeenCalledWith({ triggerData: mockRequest, context: mockContext });
      expect(result).toEqual(funcResult('OK', 'Success'));
      expect(passingGuardCheck).toHaveBeenCalledWith({ triggerData: mockRequest, context: mockContext });
      expect(testInputFunc).toHaveBeenCalledWith('test-data');
    });

    it('should return guard failure response and skip handler when a guard fails', async () => {
      const customResponse = funcResult('Forbidden', 'Access denied');
      const failingGuard = guard(() => customResponse);
      const handlerFn = jest.fn().mockResolvedValue(funcResult('OK', 'Success'));

      const chain = new HttpChain().useGuard(failingGuard);

      const handler = chain.handle(handlerFn);
      const result = await handler(mockRequest, mockContext);

      expect(handlerFn).not.toHaveBeenCalled();
      expect(result).toEqual(customResponse);
      expect(mockContext.error).toHaveBeenCalled();
    });

    it('should return default OK response if handler returns nothing', async () => {
      const passingGuard = guard(() => true);
      const handlerFn = jest.fn().mockResolvedValue(undefined);

      const chain = new HttpChain().useGuard(passingGuard);

      const handler = chain.handle(handlerFn);
      const result = await handler(mockRequest, mockContext);

      expect(handlerFn).toHaveBeenCalled();
      expect(result).toEqual(funcResult('OK'));
    });
  });

  describe('parseBody', () => {
    it('should return a chain with parsed body available in chainData', async () => {
      const requestBody = { name: 'Test', age: 30 };
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);

      const passingGuardCheck = jest.fn(() => true);
      const testInput = inputFactory<string, string>('test', async data => data.toUpperCase());
      const binding = testInput.create('test-data');
      const handlerFn = jest.fn().mockImplementation(({ parsedData }) => funcResult('OK', parsedData));

      const chain = new HttpChain().useGuard(guard(passingGuardCheck)).useInputBinding(binding);

      const parsedChain = chain.parseBody();
      const handler = parsedChain.handle(handlerFn);
      const result = await handler(mockRequest, mockContext);

      expect(mockRequest.json).toHaveBeenCalled();
      expect(handlerFn).toHaveBeenCalled();
      expect(result).toEqual(funcResult('OK', requestBody));
      expect(testInput.get(mockContext)).toBe('TEST-DATA');
      expect(passingGuardCheck).toHaveBeenCalledWith(expect.objectContaining({ triggerData: mockRequest, context: mockContext }));
    });

    it('should validate body with Zod schema if provided', async () => {
      const requestBody = { name: 'Test', age: 30 };
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);

      const schema = z.object({ name: z.string(), age: z.number().min(18) });
      const handlerFn = jest.fn().mockImplementation(({ parsedData }) => funcResult('OK', parsedData));

      const chain = new HttpChain();

      const parsedChain = chain.parseBody(schema);
      const handler = parsedChain.handle(handlerFn);
      const result = await handler(mockRequest, mockContext);

      expect(handlerFn).toHaveBeenCalled();
      expect(result).toEqual(funcResult('OK', requestBody));
    });

    it('should return BadRequest if body validation fails', async () => {
      const invalidRequestBody = { name: 'Test', age: 15 };
      (mockRequest.json as jest.Mock).mockResolvedValue(invalidRequestBody);

      const schema = z.object({ name: z.string(), age: z.number().min(18) });
      const handlerFn = jest.fn();

      const chain = new HttpChain();

      const parsedChain = chain.parseBody(schema);
      const handler = parsedChain.handle(handlerFn);
      const result = await handler(mockRequest, mockContext);

      expect(handlerFn).not.toHaveBeenCalled();
      expect(result.status).toBe(400);
      expect(mockContext.error).toHaveBeenCalled();
    });

    it('should validate body with zod schema function if provided', async () => {
      const requestBody = { name: 'Test', age: 30 };
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);

      const schemaFn = jest.fn(() => z.object({ name: z.string(), age: z.number().min(18) }));
      const handlerFn = jest.fn().mockImplementation(({ parsedData }) => funcResult('OK', parsedData));

      const chain = new HttpChain();

      const parsedChain = chain.parseBody(schemaFn);
      const handler = parsedChain.handle(handlerFn);
      const result = await handler(mockRequest, mockContext);

      expect(handlerFn).toHaveBeenCalled();
      expect(result).toEqual(funcResult('OK', requestBody));
      expect(schemaFn).toHaveBeenCalled();
    });

    it('should return BadRequest when request.json() throws (malformed JSON)', async () => {
      (mockRequest.json as jest.Mock).mockRejectedValue(new SyntaxError('Unexpected token'));
      const handlerFn = jest.fn();

      const chain = new HttpChain();

      const parsedChain = chain.parseBody();
      const handler = parsedChain.handle(handlerFn);
      const result = await handler(mockRequest, mockContext);

      expect(handlerFn).not.toHaveBeenCalled();
      expect(result.status).toBe(400);
      expect(mockContext.error).toHaveBeenCalled();
    });
  });
});
