import { InvocationContext } from '@azure/functions';
import { inputFactory } from '../../src/chain/input-factory';

describe('inputFactory', () => {
  // Mock context with extraInputs Map
  let mockContext: InvocationContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = new InvocationContext();
  });

  it('should create an input binding that sets data in the context', async () => {
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
    expect(mockContext.extraInputs.get(testKey)).toBe(testValue);
  });

  it('should retrieve data from the context via the factory get method', async () => {
    // Arrange
    const testKey = 'testData';
    const testValue = 'stored-value';
    mockContext.extraInputs.set(testKey, testValue);
    const dataFetch = jest.fn();

    // Act
    const testInput = inputFactory<string, string>(testKey, dataFetch);
    const retrievedValue = testInput.get(mockContext);

    // Assert
    expect(retrievedValue).toBe(testValue);
  });

  it('should retrieve data from the context via the binding get method', async () => {
    // Arrange
    const testKey = 'testData';
    const testValue = 'stored-value';
    mockContext.extraInputs.set(testKey, testValue);
    const dataFetch = jest.fn();

    // Act
    const testInput = inputFactory<string, string>(testKey, dataFetch);
    const binding = testInput.create('unused-arg');
    const retrievedValue = binding.get(mockContext);

    // Assert
    expect(retrievedValue).toBe(testValue);
    // dataFetch should not be called when using get
    expect(dataFetch).not.toHaveBeenCalled();
  });

  it('should handle async data fetching', async () => {
    // Arrange
    const testKey = 'asyncData';
    const testValue = { result: 'complex-data' };
    const dataFetch = jest.fn().mockImplementation(async (input: number) => {
      return { result: `complex-data-${input}` };
    });

    // Act
    const testInput = inputFactory<number, typeof testValue>(testKey, dataFetch);
    const binding = testInput.create(42);
    await binding.set(mockContext);
    const retrievedValue = testInput.get(mockContext);

    // Assert
    expect(dataFetch).toHaveBeenCalledWith(42);
    expect(retrievedValue).toEqual({ result: 'complex-data-42' });
  });
});
