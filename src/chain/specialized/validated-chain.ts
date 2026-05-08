import { InvocationContext } from '@azure/functions';
import { ZodType } from 'zod';
import { RegularChain } from '../regular-chain';
import { ChainHandlerFor, ChainOptions, ChainWrapper, ResponseType } from '../types';

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
    options: ChainOptions<TResponseType> = { responseType: 'none' as TResponseType },
  ) {
    super(options);
  }

  public override handle<TResultBody = undefined>(
    handler: ChainHandlerFor<TResponseType, TData, TResultBody>,
  ): ChainWrapper<unknown, TResponseType, TResultBody> {
    const parentHandle = super.handle(handler);

    return (async (rawTriggerData: unknown, context: InvocationContext) => {
      const parseResult = this.zodSchema.safeParse(rawTriggerData);
      if (!parseResult.success) throw parseResult.error;

      return parentHandle(parseResult.data, context);
    }) as ChainWrapper<unknown, TResponseType, TResultBody>;
  }
}
