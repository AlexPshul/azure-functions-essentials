import { getInput, getInputItem } from '../../src/helpers/get-input';
import { InvocationContext } from '@azure/functions';

describe('getInput', () => {
  it('should return the correct context value as T', () => {
    const context = {
      extraInputs: new Map<string, unknown>([
        ['number', 42],
        ['string', 'hello'],
        ['object', { key: 'value' }],
      ]),
    } as unknown as InvocationContext;

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
    const context = {
      extraInputs: new Map([
        ['numbers', [1, 2, 3]],
        ['strings', ['a', 'b', 'c']],
      ]),
    } as unknown as InvocationContext;

    const firstNumber = getInputItem<number>(context, 'numbers');
    const secondString = getInputItem<string>(context, 'strings', 1);

    expect(firstNumber).toBe(1);
    expect(secondString).toBe('b');
  });

  it('should return undefined if the index is out of bounds', () => {
    const context = {
      extraInputs: new Map([['numbers', [1, 2, 3]]]),
    } as unknown as InvocationContext;

    const outOfBoundsItem = getInputItem<number>(context, 'numbers', 10);

    expect(outOfBoundsItem).toBeUndefined();
  });

  it('should return undefined if the data is not array', () => {
    const context = {
      extraInputs: new Map([['number', 42]]),
    } as unknown as InvocationContext;

    const outOfBoundsItem = getInputItem<number>(context, 'number');

    expect(outOfBoundsItem).toBeUndefined();
  });
});
