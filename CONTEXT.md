# Azure Functions Essentials

A middleware-style chain library for Azure Functions v4 (Node.js). Provides a composable pipeline of guards, input bindings, and handlers for any Azure Functions trigger type.

## Language

### Chain

**Chain**:
A composable execution pipeline that runs guards, transformers, and input bindings before invoking a handler. The concrete class is `FunctionChain`.
_Avoid_: Middleware, pipeline

**Guard**:
A check that must pass before the handler runs. Returns `true` to pass, `false` or `HttpResponseInit` to fail. Guards are generic over trigger data — a `Guard<unknown>` works on any chain, while a `Guard<HttpRequest>` only works on HTTP-compatible chains.
_Avoid_: Validator, filter, middleware

**TriggerData**:
The data received from the Azure Functions runtime for a specific trigger type (e.g., `HttpRequest` for HTTP, `Timer` for timer triggers, a message payload for Service Bus).
_Avoid_: Request, input, event

**ParsedData**:
Data extracted or transformed from trigger data via a data accessor function. Distinct from trigger data when the raw trigger and the meaningful payload differ (e.g., HTTP request vs. its JSON body, MCP tool input vs. its arguments).
_Avoid_: Body (except on `HttpChain.parseBody()` where it's domain-accurate)

**ResponseType**:
A `'http' | 'json' | 'none'` discriminator on a chain that controls two behaviors: (1) what the handler returns — `HttpResponseInit`, arbitrary JSON, or `void`, and (2) how guard failures are handled — returned as HTTP responses, returned as `ChainFailure` objects, or thrown as errors.
_Avoid_: ErrorMode, returnType

**ChainFailure**:
A structured object describing a guard, transformer, or input-binding failure. Contains the HTTP result, link index, and link type. Returned as a value on `'json'` chains, used to construct the thrown `Error` message on `'none'` chains.

**Transformer**:
A chain link that takes the current chain data and returns either enriched chain data (extending `BasicChainData`) on success or `{ error: HttpResponseInit }` on failure. Used for parsing, validation, data extraction, and any operation that widens the chain data shape.
_Avoid_: Parser, mapper, middleware

**InputBinding**:
A chain link that fetches and stores data in the invocation context before the handler runs.

### Specialized Chains

**HttpChain**:
A chain specialized for HTTP triggers. Extends `FunctionChain<HttpRequest, 'http'>` and adds `parseBody()`, which internally adds a body-extraction transformer.

## Relationships

- A **Chain** has zero or more **Guards**, zero or more **Transformers**, and zero or more **InputBindings**
- A **Guard** is generic over **TriggerData** — `Guard<unknown>` is usable on any chain
- A **Transformer** widens the chain data shape — links added after a transformer see the enriched type
- An **HttpChain** adds a body-extraction **Transformer** via `parseBody()`
- **ResponseType** determines whether link failures produce HTTP responses, returned **ChainFailures**, or thrown errors

## Example dialogue

> **Dev:** "When a Service Bus message arrives, how does the chain handle a guard failure?"
> **Domain expert:** "It throws an `Error` because the chain's **ResponseType** is `'none'` — there's no HTTP response to return."

> **Dev:** "Can I use a header guard on a timer chain?"
> **Domain expert:** "No — `headerGuard` returns a `Guard<HttpRequest>`, and a timer chain expects `Guard<Timer>`. TypeScript will catch that at compile time."

> **Dev:** "What if I want to validate trigger data with Zod on a message chain?"
> **Domain expert:** "Add a **Transformer** — `useTransformer(zodTransformer(schema))`. It validates and types the data as a chain link, so you can reorder it relative to **Guards**. If validation fails, the **Transformer** returns an error that flows through `handleFailure()` just like any other link failure."

> **Dev:** "Why does the handler take a single `chainData` object instead of `(triggerData, context)`?"
> **Domain expert:** "Because **Transformers** can enrich the chain data with new properties. A single object lets the type widen naturally — after `parseBody()`, the handler sees `{ triggerData, context, parsedData }` without changing the handler arity."

## Flagged ambiguities

- "request" was used to mean both the HTTP request object and generic trigger data — resolved: use **TriggerData** for the generic concept, reserve "request" for `HttpRequest` specifically.
- "body" was used to mean both the HTTP request body and any parsed data — resolved: use **ParsedData** generically, keep "body" only in `HttpChain.parseBody()`.
- "parse" was considered as the third chain link type name — resolved: use **Transformer** because parsing is just one use case; the concept is broader (validation, data extraction, any chain data enrichment).
