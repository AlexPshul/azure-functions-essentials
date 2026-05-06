import { HttpResponseInit } from '@azure/functions';

/**
 * Error thrown when a guard fails on a chain with `responseType: 'none'`.
 * Carries structured information about the failure.
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
}
