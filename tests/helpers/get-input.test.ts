import { getInput, getInputItem } from '../../src/helpers/get-input';
import { InvocationContext } from '@azure/functions';

describe('getInput', () => {
  it('should return the correct context value as T', () => {
    const context = new InvocationContext();
    context.extraInputs.set('number', 42);
    context.extraInputs.set('string', 'hello');
    context.extraInputs.set('object', { key: 'value' });

    const numberInput = getInput<number>(context, 'number');
    const stringInput = getInput<string>(context, 'string');
    const objectInput = getInput<{ key: string }>(context, 'object');

    expect(numberInput).toBe(42);
    expect(stringInput).toBe('hello');
    expect(objectInput).toEqual({ key: 'value' });
  });
});

describe('getInputItem', () => {
  it('should return the correct item from an array input by index', () => {
    const context = new InvocationContext();
    context.extraInputs.set('numbers', [1, 2, 3]);
    context.extraInputs.set('strings', ['a', 'b', 'c']);

    const firstNumber = getInputItem<number>(context, 'numbers');
    const secondString = getInputItem<string>(context, 'strings', 1);

    expect(firstNumber).toBe(1);
    expect(secondString).toBe('b');
  });

  it('should return undefined if the index is out of bounds', () => {
    const context = new InvocationContext();
    context.extraInputs.set('numbers', [1, 2, 3]);

    const outOfBoundsItem = getInputItem<number>(context, 'numbers', 10);

    expect(outOfBoundsItem).toBeUndefined();
  });

  it('should return undefined if the data is not array', () => {
    const context = new InvocationContext();
    context.extraInputs.set('number', 42);

    const outOfBoundsItem = getInputItem<number>(context, 'number');

    expect(outOfBoundsItem).toBeUndefined();
  });
});
