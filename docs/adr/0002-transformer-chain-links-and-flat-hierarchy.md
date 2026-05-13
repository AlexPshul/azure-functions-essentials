# Abstract chain hierarchy with DataAccessor-based parsing

The chain was originally built with parsing/validation baked into subclass `handle()` overrides, making them non-composable — they couldn't be reordered relative to guards, and their failure paths diverged per `ResponseType`. We're restructuring the hierarchy: `FunctionChain` becomes an abstract base that owns all chain execution logic (guards, input bindings, `handle()`, `executeChain()`), with three concrete subclasses for different use cases. Parsing/validation is handled by a linked-chain pattern where `ParsedDataChain` holds a reference to a source chain, runs it first, then extracts and optionally validates data via a **DataAccessor** before continuing with its own guards and input bindings. This gives full type safety — the source chain always produces `BasicChainData<TTriggerData>`, the DataAccessor enriches it to `TChainData`, and the handler receives the enriched type with no unsafe casts.

## Considered Options

- **Flat hierarchy with composable Transformer chain links.** Attempted first — Transformer was a generic chain link type that could be freely composed with guards. Rejected because TypeScript couldn't express the type widening across `executeChain` method boundaries without unsafe `as` casts. Each transformer changes the chain data type, but the method signature erases it, forcing casts at every boundary.
- **Keep the original subclass hierarchy, fix only the json-path type mismatch.** Rejected because it doesn't solve composability — validation still can't be reordered relative to guards, and each new "pre-handler step" would need another subclass.
- **Handler keeps positional args `(triggerData, context)`.** Rejected because parsed data needs to reach the handler. The handler now receives a single `chainData` object, which includes `parsedData` when a DataAccessor has run.

## Consequences

- **Breaking change**: handler signature moves from `(triggerData, context)` / `(triggerData, parsedData, context)` to `(chainData)`. Requires a major version bump.
- Data parsing is a one-step operation per chain (`parseData()` or `parseBody()`), not a composable chain link. The DataAccessor function + optional Zod schema covers both extraction and validation in a single call.
- All parsing/validation failures produce `ChainFailure` and flow through `handleFailure()`, fixing the json-path type mismatch where `ZodError` didn't match `ChainResultFor<'json'>`.
- `ParsedDataChain` constrains its source to `BasicChainData<TTriggerData>`, guaranteeing type-safe data flow from source chain → DataAccessor → enriched handler without casts.
