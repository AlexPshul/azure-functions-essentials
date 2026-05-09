import { InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { zodTransformer } from '../../../src/chain/transformers';

describe('zodTransformer', () => {
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

  it('should return enriched chain data with parsedData on valid data', () => {
    const validData = { name: 'Test', age: 30 };
    const chainData = { triggerData: validData, context: mockContext };
    const t = zodTransformer(schema);

    const result = t.transform(chainData);

    expect(result).toEqual(expect.objectContaining({ parsedData: validData, triggerData: validData, context: mockContext }));
  });

  it('should return error on invalid data', () => {
    const invalidData = { name: 'Test', age: 15 };
    const chainData = { triggerData: invalidData, context: mockContext };
    const t = zodTransformer(schema);

    const result = t.transform(chainData);

    expect(result).toHaveProperty('error');
    expect((result as { error: { status: number } }).error.status).toBe(400);
    expect(mockContext.error).toHaveBeenCalled();
  });

  it('should support dynamic schema function', () => {
    const validData = { name: 'Test', age: 30 };
    const chainData = { triggerData: validData, context: mockContext };
    const schemaFn = jest.fn().mockReturnValue(schema);
    const t = zodTransformer(schemaFn);

    const result = t.transform(chainData);

    expect(result).toEqual(expect.objectContaining({ parsedData: validData }));
    expect(schemaFn).toHaveBeenCalledWith(chainData);
  });
});
