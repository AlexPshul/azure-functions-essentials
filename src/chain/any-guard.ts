import { funcResult } from '../helpers';
import { guard } from './guard';
import { Guard } from './types';

/**
 * Creates a guard that checks if any of the provided guards pass.
 * @param guards - A list of guards to be used as a single link in the chain.
 * @returns A guard that checks if any of the provided guards pass.
 */
export const anyGuard = (...guards: Guard[]): Guard =>
  guard(async (request, context) => {
    const results = [];
    for (const guard of guards) {
      const result = await guard.check(request, context);
      results.push(result);
      if (result === true) return true;
    }

    return funcResult('Forbidden', { message: 'None of the guards in the link passed.', results });
  });
