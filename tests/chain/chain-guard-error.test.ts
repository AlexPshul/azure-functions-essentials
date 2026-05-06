import { ChainGuardError } from '../../src/chain/chain-guard-error';
import { funcResult } from '../../src/helpers';

describe('ChainGuardError', () => {
  it('should create error with guard result and metadata', () => {
    const guardResult = funcResult('Forbidden', 'Access denied');
    const error = new ChainGuardError(guardResult, 2, 'guard');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ChainGuardError');
    expect(error.guardResult).toBe(guardResult);
    expect(error.linkIndex).toBe(2);
    expect(error.linkType).toBe('guard');
    expect(error.message).toBe('Chain guard #2 failed.');
  });

  it('should create error for input binding failure', () => {
    const error = new ChainGuardError(false, 1, 'inputBinding');

    expect(error.guardResult).toBe(false);
    expect(error.linkIndex).toBe(1);
    expect(error.linkType).toBe('inputBinding');
    expect(error.message).toBe('Chain inputBinding #1 failed.');
  });
});
