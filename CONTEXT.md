# Azure Functions Essentials

A middleware-style chain library for Azure Functions v4 (Node.js). Provides a composable pipeline of guards, data accessors, input bindings, and handlers for any Azure Functions trigger type.

## Language

### Chain

**Chain**:
A composable execution pipeline that runs guards and input bindings before invoking a handler. The abstract base class is `FunctionChain`.
_Avoid_: Middleware, pipeline

**Guard**:
A check that must pass before the handler runs. Returns `true` to pass, `false` or `HttpResponseInit` to fail. Guards are generic over trigger data — a `Guard<unknown>` works on any chain, while a `Guard<HttpRequest>` only works on HTTP-compatible chains.
_Avoid_: Validator, filter, middleware

**TriggerData**:
The data received from the Azure Functions runtime for a specific trigger type (e.g., `HttpRequest` for HTTP, `Timer` for timer triggers, a message payload for Service Bus).
_Avoid_: Request, input, event

**ParsedData**:
Data extracted from trigger data via a **DataAccessor**. Distinct from trigger data when the raw trigger and the meaningful payload differ (e.g., HTTP request vs. its JSON body, MCP tool input vs. its arguments).
_Avoid_: Body (except on `HttpTriggerChain.parseBody()` where it's domain-accurate)

**DataAccessor**:
A function that extracts **ParsedData** from the chain data. Takes `BasicChainData<TTriggerData>` and returns the extracted data. Used by `parseData()` and `parseBody()` to produce parsed data for the handler.
_Avoid_: Transformer, parser, mapper

**ResponseType**:
A `'http' | 'json' | 'none'` discriminator on a chain that controls two behaviors: (1) what the handler returns — `HttpResponseInit`, arbitrary JSON, or `void`, and (2) how guard failures are handled — returned as HTTP responses, returned as `ChainFailure` objects, or thrown as errors.
_Avoid_: ErrorMode, returnType

**ChainFailure**:
A structured object describing a guard, data accessor, validation, or input-binding failure. Contains the HTTP result, link index, and link type. Returned as a value on `'json'` chains, used to construct the thrown `Error` message on `'none'` chains.

**InputBinding**:
A chain link that fetches and stores data in the invocation context before the handler runs.

### Chain Types

**BasicTriggerChain**:
A concrete chain for any trigger type. Extends `FunctionChain` and adds `parseData(accessor, zodSchema?)` to extract and optionally validate data from trigger data, returning a `ParsedDataChain`. Accepts an optional `zodSchema` in its constructor options for runtime validation of trigger data before guards run.

**HttpTriggerChain**:
A concrete chain for HTTP triggers. Extends `FunctionChain` and adds `parseBody(zodSchema?)` — a convenience that extracts the request body via `request.json()` and optionally validates it with Zod, returning a `ParsedDataChain`.

**ParsedDataChain**:
A chain that holds a reference to a source chain and a **DataAccessor**. Executes the source chain first, then runs the data accessor (and optional Zod validation) to produce enriched chain data with **ParsedData**, then continues with its own guards and input bindings.

## Relationships

- A **Chain** has zero or more **Guards** and zero or more **InputBindings**
- A **Guard** is generic over **TriggerData** — `Guard<unknown>` is usable on any chain
- A **BasicTriggerChain** produces a **ParsedDataChain** via `parseData()`
- An **HttpTriggerChain** produces a **ParsedDataChain** via `parseBody()`
- A **ParsedDataChain** links to a source chain and runs its **DataAccessor** between the source chain's execution and its own guards
- **ResponseType** determines whether link failures produce HTTP responses, returned **ChainFailures**, or thrown errors

## Example dialogue

> **Dev:** "When a Service Bus message arrives, how does the chain handle a guard failure?"
> **Domain expert:** "It throws an `Error` because the chain's **ResponseType** is `'none'` — there's no HTTP response to return."

> **Dev:** "Can I use a header guard on a timer chain?"
> **Domain expert:** "No — `headerGuard` returns a `Guard<HttpRequest>`, and a timer chain expects `Guard<Timer>`. TypeScript will catch that at compile time."

> **Dev:** "What if I want to validate trigger data with Zod on a message chain?"
> **Domain expert:** "Pass the Zod schema to `startMessageChain(zodSchema)` — it validates the trigger data before guards run. If validation fails, the chain returns an error through `handleFailure()` just like a guard failure. For extracting nested data (like HTTP body or MCP args), use `parseData(accessor, zodSchema)` instead."

> **Dev:** "Why does the handler take a single `chainData` object instead of `(triggerData, context)`?"
> **Domain expert:** "Because `parseData()` enriches the chain data with **ParsedData**. A single object lets the type widen naturally — after `parseBody()`, the handler sees `{ triggerData, context, parsedData }` without changing the handler arity."

## Flagged ambiguities

- "request" was used to mean both the HTTP request object and generic trigger data — resolved: use **TriggerData** for the generic concept, reserve "request" for `HttpRequest` specifically.
- "body" was used to mean both the HTTP request body and any parsed data — resolved: use **ParsedData** generically, keep "body" only in `HttpTriggerChain.parseBody()`.
- "transformer" was considered as the data extraction concept name — resolved: use **DataAccessor** because the operation is specifically about accessing/extracting data from the chain data, not arbitrary transformation.
