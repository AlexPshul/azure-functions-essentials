# Transformer chain links and flat hierarchy

Parsing and validation were baked into subclass `handle()` overrides (`ParsedDataChain`, `ValidatedChain`), which made them non-composable — they couldn't be reordered relative to guards, and their failure paths diverged per `ResponseType` (the json path returned a raw `ZodError` that didn't match the declared `ChainResultFor<'json'>`). We're flattening the hierarchy: `BaseChain` becomes `FunctionChain` (concrete, not abstract), `handle()` moves to the base, and a new **Transformer** chain link type makes parsing/validation first-class links that flow through the same `executeChain()` → `handleFailure()` path as guards and input bindings. `RegularChain`, `ParsedDataChain`, and `ValidatedChain` are removed; `HttpChain` survives because `parseBody()` adds genuine HTTP-specific ergonomics (it delegates to a transformer internally).

## Considered Options

- **Keep the subclass hierarchy, fix only the json-path type mismatch.** Rejected because it doesn't solve composability — validation still can't be reordered relative to guards, and each new "pre-handler step" would need another subclass.
- **Throw-based transformer failure (ChainLinkError class).** Rejected in favor of return-based failure: the transformer returns the full enriched chain data on success (extending `BasicChainData`, always has `triggerData`) or `{ error: HttpResponseInit }` on failure. Distinguishable by checking for `triggerData` — no ambiguity, no custom error class.
- **Handler keeps positional args `(triggerData, context)`.** Rejected because transformers enrich chain data, and positional args can't accommodate that. The handler now receives a single `chainData` object, which the chain constructs and enriches through transformers.

## Consequences

- **Breaking change**: handler signature moves from `(triggerData, context)` / `(triggerData, parsedData, context)` to `(chainData)`. Requires a major version bump.
- `useTransformer()` creates a new chain instance (same pattern as the old `parseBody()` / `copyFromChain`), so the chain data type widens safely without `as` casts on `this`.
- All validation/parsing failures now produce `ChainFailure` and flow through `handleFailure()`, fixing the json-path type mismatch.
