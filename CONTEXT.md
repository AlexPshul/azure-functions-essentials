# Azure Functions Essentials

A middleware-style chain library for Azure Functions v4 (Node.js). Provides a composable pipeline of guards, input bindings, and handlers for any Azure Functions trigger type.

## Language

### Chain

**Chain**:
A composable execution pipeline that runs guards and input bindings before invoking a handler. The generic base is `RegularChain`.
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
A structured object describing a guard or input-binding failure. Contains the HTTP result, link index, and link type. Returned as a value on `'json'` chains, used to construct the thrown `Error` message on `'none'` chains.

**InputBinding**:
A chain link that fetches and stores data in the invocation context before the handler runs.

### Specialized Chains

**HttpChain**:
A chain specialized for HTTP triggers. Extends `RegularChain<HttpRequest, 'http'>` and adds `parseBody()`.

**ValidatedChain**:
A chain that validates raw trigger data against a Zod schema before running guards or the handler. Throws `ZodError` on validation failure. Used for message-based triggers where the trigger data is the message payload.

**ParsedDataChain**:
A chain that extracts parsed data from trigger data using a configurable data accessor. The handler receives three arguments: `(triggerData, parsedData, context)`.

## Relationships

- A **Chain** has zero or more **Guards** and zero or more **InputBindings**
- A **Guard** is generic over **TriggerData** — `Guard<unknown>` is usable on any chain
- An **HttpChain** can produce a **ParsedDataChain** via `parseBody()`
- A **ValidatedChain** validates **TriggerData** against a Zod schema before the chain runs
- **ResponseType** determines whether guard failures produce HTTP responses, returned **ChainFailures**, or thrown errors

## Example dialogue

> **Dev:** "When a Service Bus message arrives, how does the chain handle a guard failure?"
> **Domain expert:** "It throws an `Error` because the chain's **ResponseType** is `'none'` — there's no HTTP response to return."

> **Dev:** "Can I use a header guard on a timer chain?"
> **Domain expert:** "No — `headerGuard` returns a `Guard<HttpRequest>`, and a timer chain expects `Guard<Timer>`. TypeScript will catch that at compile time."

> **Dev:** "What's the difference between **ValidatedChain** and **ParsedDataChain**?"
> **Domain expert:** "**ValidatedChain** is for when the **TriggerData** IS the message — it validates and types it in place (2-arg handler). **ParsedDataChain** is for when you need to extract **ParsedData** from the **TriggerData** (3-arg handler)."

## Flagged ambiguities

- "request" was used to mean both the HTTP request object and generic trigger data — resolved: use **TriggerData** for the generic concept, reserve "request" for `HttpRequest` specifically.
- "body" was used to mean both the HTTP request body and any parsed data — resolved: use **ParsedData** generically, keep "body" only in `HttpChain.parseBody()`.
