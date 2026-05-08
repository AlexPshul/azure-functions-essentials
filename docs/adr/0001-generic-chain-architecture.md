# Generic chain architecture for all Azure Functions trigger types

The chain was originally built around `HttpRequest` — guards took `(request, context)`, chain data was `{ request, context }`, and failure always returned `HttpResponseInit`. This locked out non-HTTP triggers (Service Bus, Timer, Event Hub, MCP tools).

We're refactoring to a generic `RegularChain<TTriggerData, TResponseType>` base. `TTriggerData` is the data from any Azure Functions trigger. `TResponseType` (`'http' | 'json' | 'none'`) controls whether guard failures return HTTP responses, are returned as `ChainGuardError` objects, or thrown as `ChainGuardError`, and whether the handler returns `HttpResponseInit`, arbitrary JSON, or `void`. Specialized chains (`HttpChain`, `ValidatedChain`) live in `src/chain/specialized/` and extend the generic base for trigger-specific ergonomics. MCP chains use `responseType: 'json'` and are created directly as `ParsedDataChain` instances via the `startMcpChain` factory.

This is a breaking change: `startChain()` → `startHttpChain()`, `request` → `triggerData`, `body` → `parsedData`, `Guard.check(request, context)` → `Guard.check(chainData)`.

## Considered Options

- **Keep HTTP-only, add adapters per trigger type.** Rejected because it forces every non-HTTP trigger to fake an `HttpRequest`, loses type safety, and grows adapter boilerplate with each new trigger type.
- **Separate chain libraries per trigger type.** Rejected because guards, input bindings, and the chain-walking logic are identical across triggers — duplicating them violates DRY and makes cross-trigger guards impossible.
