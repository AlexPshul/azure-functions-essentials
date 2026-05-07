import { InvocationContext } from '@azure/functions';
import { ZodType } from 'zod';
import { ChainHandlerFor, ChainResultFor, RegularChain } from '../regular-chain';
import { ResponseType } from '../types';

/**
 * A chain that validates raw trigger data against a Zod schema before running guards or the handler.
 * Validation happens before guards — if the data doesn't parse, guards are skipped and ZodError is thrown.
 * The handler receives typed, validated data as `triggerData`.
 *
 * Used for message-based triggers where the trigger data IS the message payload.
 */
export class ValidatedChain<TData, TResponseType extends ResponseType = 'none'> extends RegularChain<TData, TResponseType> {
  constructor(
    private readonly zodSchema: ZodType<TData>,
    responseType: TResponseType = 'none' as TResponseType,
  ) {
    super(responseType);
  }

  public override handle<TResultBody = undefined>(
    handler: ChainHandlerFor<TResponseType, TData, TResultBody>,
  ): (rawTriggerData: unknown, context: InvocationContext) => Promise<ChainResultFor<TResponseType, TResultBody>> {
    const parentHandle = super.handle(handler);

    return (async (rawTriggerData: unknown, context: InvocationContext) => {
      const parseResult = this.zodSchema.safeParse(rawTriggerData);
      if (!parseResult.success) throw parseResult.error;

      return parentHandle(parseResult.data as TData, context);
    }) as (rawTriggerData: unknown, context: InvocationContext) => Promise<ChainResultFor<TResponseType, TResultBody>>;
  }
}
