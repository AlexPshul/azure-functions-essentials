import { InvocationContext } from '@azure/functions';
import { inputFactory } from '../../src';

describe('inputFactory', () => {
  // Mock context with extraInputs Map
  let mockContext: InvocationContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = new InvocationContext();
  });

  it('should create an unnamed input binding that sets data in the context', async () => {
    // Arrange
    const testKey = 'testData';
    const testValue = 'processed-value';
    const dataFetch = jest.fn().mockResolvedValue(testValue);

    // Act
    const testInput = inputFactory<string, string>(testKey, dataFetch);
    const binding = testInput.create('input-arg');
    const result = await binding.set(mockContext);

    // Assert
    expect(dataFetch).toHaveBeenCalledWith('input-arg');
    expect(result).toBe(true);
    expect(testInput.get(mockContext)).toBe(testValue);
  });

  it('should handle async data fetching in unnamed input binding', async () => {
    // Arrange
    const testKey = 'asyncData';
    const dataFetch = jest.fn().mockImplementation(async (input: number) => {
      return { result: `complex-data-${input}` };
    });

    // Act
    const testInput = inputFactory<number, { result: string }>(testKey, dataFetch);
    const binding = testInput.create(42);
    await binding.set(mockContext);
    const retrievedValue = testInput.get(mockContext);

    // Assert
    expect(dataFetch).toHaveBeenCalledWith(42);
    expect(retrievedValue).toEqual({ result: 'complex-data-42' });
  });

  it('should create a named input binding that sets data in the context', async () => {
    // Arrange
    const testKey = 'testData';
    const testValueA = 'processed-value-A';
    const testValueB = 'processed-value-B';
    const testAName = 'a';
    const testBName = 'b';
    const dataFetch = jest.fn().mockImplementation((value: string) => Promise.resolve(value.toUpperCase()));

    // Act
    const testInput = inputFactory<string, string>(testKey, dataFetch);
    const bindingA = testInput.createNamed(testValueA, testAName);
    const bindingB = testInput.createNamed(testValueB, testBName);

    await bindingA.set(mockContext);
    await bindingB.set(mockContext);

    // Assert
    expect(dataFetch).toHaveBeenCalledWith(testValueA);
    expect(dataFetch).toHaveBeenCalledWith(testValueB);
    expect(testInput.getNamed(mockContext, testAName)).toBe(testValueA.toUpperCase());
    expect(testInput.getNamed(mockContext, testBName)).toBe(testValueB.toUpperCase());
  });
});
