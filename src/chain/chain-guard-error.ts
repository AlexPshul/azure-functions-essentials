import { HttpResponseInit } from '@azure/functions';

/**
 * Structured error for guard/input-binding failures on non-HTTP chains.
 * Thrown on `responseType: 'none'` chains, returned as a value on `responseType: 'json'` chains.
 */
export class ChainGuardError extends Error {
  constructor(
    public readonly guardResult: HttpResponseInit | false,
    public readonly linkIndex: number,
    public readonly linkType: 'guard' | 'inputBinding',
  ) {
    super(`Chain ${linkType} #${linkIndex} failed.`);
    this.name = 'ChainGuardError';
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      guardResult: this.guardResult,
      linkIndex: this.linkIndex,
      linkType: this.linkType,
    };
  }
}
