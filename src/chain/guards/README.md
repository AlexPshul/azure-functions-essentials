# 🛡️ Guards in Azure Functions

> Ensuring your functions handle requests securely.

## What are Guards?

Guards are mechanisms that validate incoming requests before they reach your Azure Functions' business logic. They help ensure that only valid and authorized requests are processed. By creating a common guard in your system, you can reuse it in multiple endpoints easily.

```
Request → 🛡️ GUARDS 🛡️ → Your Function Logic
```

Full list of guards:

- [Base Guard Tool](#base-guard-tool)
- [Prebuilt Guards](#prebuilt-guards)
  - [headerGuard](#headerGuard)
  - [headerFlagGuard](#headerFlagGuard)
  - [allValuesHeaderGuard](#allValuesHeaderGuard)
  - [anyGuard](#anyGuard)
  - [validateInputExistsGuard](#validateInputExistsGuard)
- [How to Use Guards](#how-to-use-guards)

## Base Guard Tool

### `guard` - The Basic Building Block

This is the foundational tool for creating guards. It validates requests and either allows them to proceed (returning `true`) or blocks them with an appropriate response.

```typescript
const customGuard = guard((req, ctx) => {
  return req.headers.get('x-secret') === 'there is no spoon' || funcResult('Forbidden', `I'm sorry, Dave. I'm afraid I can't do that.`);
});
```

## Prebuilt Guards

The following guards are provided out of the box for common use cases:

### `headerGuard` - Header Validator

This guard checks if specific headers exist and match expected values.

```typescript
const jsonGuard = headerGuard('Content-Type', 'application/json');
// Ensures the API only accepts JSON requests
```

### `headerFlagGuard` - Header Flag Checker

This guard validates that a specific header flag is set to a truthy value.

```typescript
const featureGuard = headerFlagGuard('x-feature-enabled');
// Allows requests with the feature flag enabled
```

### `allValuesHeaderGuard` - Multi-Value Header Validator

This guard checks that all required values exist in a specific header.

```typescript
const acceptGuard = allValuesHeaderGuard('Accept', ['application/json', 'text/html']);
// Ensures the Accept header contains both values
```

### `anyGuard` - Logical OR Validator

This guard allows a request to pass if any of its sub-guards approve it. Useful for implementing OR logic.

```typescript
const accessGuard = anyGuard(adminGuard, ownerGuard, specialPermissionGuard);
// Grants access if any of the sub-guards validate the request
```

You can also use the built-in `useAnyGuard` method to combine multiple guards in a chain:

```typescript
startChain()
  .useAnyGuard(adminGuard, ownerGuard, specialPermissionGuard)
  .handle((req, ctx) => {
    // Only if any of the guards pass will this code execute
    return funcResult('OK', 'Access granted.');
  });
```

### `validateInputExistsGuard` - Input Validator

This guard ensures that the required Azure Functions input bindings, passed via `extraInput` in the function context, are present and has a value in it.

```typescript
const cosmosDbInput = input.cosmosDB({});
const userGuard = validateInputExistsGuard(cosmosDbInput);
// Ensures the user input binding is present
```

## How to Use Guards

1. **Create** a guard using one of the provided factory functions.
2. **Add** the guard to your function chain with `useGuard`.
3. **Secure** your function by validating requests before processing.

```typescript
startChain()
  .useGuard(headerGuard('Content-Type', 'application/json'))
  .useGuard(adminGuard)
  .handle((req, ctx) => {
    // Only admins with JSON requests reach this point
    return funcResult('OK', 'Access granted.');
  });
```

## Combining Multiple Guards with OR Logic

To allow different types of users through, use `useAnyGuard` for OR conditions:

```typescript
startChain()
  .useAnyGuard(adminGuard, moderatorGuard, resourceOwnerGuard)
  .handle((req, ctx) => {
    // Any of the above guards passing will allow access
    return funcResult('OK', 'Access granted.');
  });
```

## Creating Custom Guards

You can create custom guards to handle specific validation logic:

```typescript
// Guard that allows requests only during business hours
const businessHoursGuard = guard((req, ctx) => {
  const hour = new Date().getHours();
  return (hour >= 9 && hour < 17) || funcResult('Forbidden', 'Service is available only during business hours (9 AM - 5 PM).');
});
```

---

<p align="center">
  <i>Secure your Azure Functions with guards to ensure reliable and safe operations.</i>
</p>
