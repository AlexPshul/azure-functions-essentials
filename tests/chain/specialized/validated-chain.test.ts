import { InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { ValidatedChain } from '../../../src/chain/specialized/validated-chain';
import { guard } from '../../../src/chain/guards';

describe('ValidatedChain', () => {
  let mockContext: InvocationContext;

  const schema = z.object({
    name: z.string(),
    age: z.number().min(18),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = new InvocationContext();
    mockContext.error = jest.fn();
  });

  describe('validation', () => {
    it('should pass valid data to the handler as typed triggerData', async () => {
      const validData = { name: 'Test', age: 30 };
      const handlerFn = jest.fn();

      const chain = new ValidatedChain(schema, 'none');
      const handler = chain.handle(handlerFn);
      await handler(validData as unknown, mockContext);

      expect(handlerFn).toHaveBeenCalledWith(validData, mockContext);
    });

    it('should throw ZodError when validation fails', async () => {
      const invalidData = { name: 'Test', age: 15 };
      const handlerFn = jest.fn();

      const chain = new ValidatedChain(schema, 'none');
      const handler = chain.handle(handlerFn);

      await expect(handler(invalidData as unknown, mockContext)).rejects.toThrow();
      expect(handlerFn).not.toHaveBeenCalled();
    });

    it('should validate before running guards', async () => {
      const invalidData = { name: 'Test', age: 15 };
      const guardCheck = jest.fn().mockReturnValue(true);
      const handlerFn = jest.fn();

      const chain = new ValidatedChain(schema, 'none').useGuard(guard(guardCheck));
      const handler = chain.handle(handlerFn);

      await expect(handler(invalidData as unknown, mockContext)).rejects.toThrow();
      expect(guardCheck).not.toHaveBeenCalled();
      expect(handlerFn).not.toHaveBeenCalled();
    });

    it('should run guards after successful validation', async () => {
      const validData = { name: 'Test', age: 30 };
      const guardCheck = jest.fn().mockReturnValue(true);
      const handlerFn = jest.fn();

      const chain = new ValidatedChain(schema, 'none').useGuard(guard(guardCheck));
      const handler = chain.handle(handlerFn);
      await handler(validData as unknown, mockContext);

      expect(guardCheck).toHaveBeenCalledWith({ triggerData: validData, context: mockContext });
      expect(handlerFn).toHaveBeenCalledWith(validData, mockContext);
    });
  });
});
