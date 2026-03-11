# ⚡ Azure Functions Essentials

> Your go to library for building Azure Functions with TypeScript!

A magical TypeScript utility belt for Azure Functions developers who are tired of writing the same boilerplate code over and over again. This library will make your functions more readable, maintainable, and less prone to "It works on my machine" syndrome.

## 🚀 Installation

```bash
npm install azure-functions-essentials
```

or if you're feeling yarn-ish

```bash
yarn add azure-functions-essentials
```

## ✨ Features

### 🔗 Function Chains

Chain your function logic like a boss.
Found a guard or an input that should be reused in other functions?
Declare as a const and reuse the logic!

```typescript
import { startChain, guard, funcResult, inputFactory } from 'azure-functions-essentials';

// Create an input binding for user lookup with your fancy database call
const userLookup = inputFactory<string, User>('user', userId => getUserFromDatabase(userId));

// Make sure they have the magic password
const keyGuard = guard(req => req.headers.get('x-api-key') === 'secret' || funcResult('Forbidden', 'Nice try, hacker!'));

// Make sure the user is a ninja (Guard functor pattern)
const ninjaGuard = (user: User) => guard(() => user.isNinja || funcResult('Forbidden', 'Only 🥷s are allowed!'));

app.post('super-secret-endpoint', {
  handler: startChain()
    .useGuard(keyGuard) // Use a guard (or several?)
    .parseBody(myZodSchema) // Parse the body and (optionally) validate with Zod
    .useInputBinding(({ body }) => userLookup.create(body.user.id)) // Initialize the input
    .useGuard(({ context }) => ninjaGuard(userLookup.get(context))) // Use input results in the chain
    // Handle the request with all goodies available
    .handle((req, body, ctx) => {
      const user = userLookup.get(ctx); // Get the user from our input

      // Your incredibly important business logic here

      // Return a result with the funcResult helper
      return funcResult('OK', {
        message: `You're in ${user.name}! Here's your cookie 🍪`,
        userData: user,
        requestData: body,
      });
    }),
});
```

### 🛡️ Guards

> For more details and the list of built-in guards, check out the [Guards Documentation](https://github.com/AlexPshul/azure-functions-essentials/tree/main/src/chain/guards).

Keep the bad guys out:

```typescript
const isAdminGuard = guard((req, ctx) => {
  const user = ctx.extraInputs.get('user');
  return user.role === 'admin' || funcResult('Forbidden', 'You shall not pass! 🧙‍♂️');
});
```

### 🎯 Input Bindings

Because more inputs means more fun:

```typescript
const userLookup = inputFactory<string, User>('user', async userId => {
  // Imagine some fancy database call here
  return { id: userId, name: 'Function Fanatic', role: 'wizard' };
});

// Later in your chain...
.useInputBinding(({ request }) => userLookup.create(request.params.userId))
```

### 🌊 HTTP Streaming

`funcResult` also supports Azure Functions HTTP stream bodies, so returning a stream is as simple as returning text or JSON:

```typescript
import { Readable } from 'stream';
import { funcResult } from 'azure-functions-essentials';

app.get('download-report', {
  handler: async () => {
    const reportStream = Readable.from(['col1,col2\n', '1,2\n']);
    return funcResult('OK', reportStream);
  },
});
```

### 🧩 Query Parameters

Parse query params without pulling your hair out:

```typescript
import { getQuery, getQueryFlag } from 'azure-functions-essentials';

const limit = getQuery(request, 'limit'); // Will throw if missing
const page = getQuery(request, 'page', true); // Optional, returns null if missing
const includeDeleted = getQueryFlag(request, 'includeDeleted'); // Boolean flags made easy
```

## 🤔 Why Use This Library?

1. **Less Code**: Why write 100 lines when 10 will do?
2. **Type Safety**: TypeScript all the things!
3. **Testability**: Every component is designed to be easily testable
4. **Chain of Responsibility**: Handle authentication, validation, and business logic in a clean, readable way
5. **Consistent Responses**: No more forgetting to set the right status code

## 📚 Documentation

For more examples of our wizardry, check out these magical spells:

### Creating Guards

#### Regular Guards

Guards can directly check headers, query parameters, or any request property:

```typescript
// Simple header-based authentication guard
const apiKeyGuard = guard((req, ctx) => {
  const apiKey = req.headers.get('x-api-key');
  return apiKey === process.env.API_KEY || funcResult('Unauthorized', 'Invalid API key');
});

// Usage in chain
startChain()
  .useGuard(apiKeyGuard)
  .handle((req, ctx) => {
    // Only executed if API key is valid
    return funcResult('OK', 'Access granted!');
  });
```

#### Functor Pattern Guards

Guards can also be created on-the-fly with the functor pattern, allowing you to pass in parameters:

```typescript
type BodyType = { name: string; age: number };

// Guard factory that validates a specific property in the body
const validateBody = (body: BodyType) => guard((req, ctx) => body.age < 18 || funcResult('BadRequest', `Age must be at least 18 years old`));

// Usage with parsed body
startChain()
  .parseBody<BodyType>()
  .useGuard(({ body }) => validateBody(body)) // Pass the body to validateBody
  .handle((req, body, ctx) => {
    // Only executed if the body validator is passed
    return funcResult('OK', `Welcome, ${body.name}!`);
  });
```

#### Combined Guards with useAnyGuard

In some scenarios, it is enough for just one of the guards to pass.
For example, admins are allowed to edit any resource, while regular users can only edit their own resources.

```typescript
const combinedGuard = anyGuard(isAdminGuard, hasPermissionGuard('CAN_EDIT'), isResourceOwnerGuard);
```

### Body Validation with Zod

```typescript
const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email("That doesn't look like an email to me 🤨"),
  age: z.number().min(18).optional(),
});

startChain()
  .parseBody(userSchema)
  .handle((req, body, ctx) => {
    // body is typed and validated!
  });
```

## 🤝 Contributing

Pull requests are welcome!
Fork it and PR away!

## 📝 License

MIT License - Use it, abuse it, but please give credit where it's due.

---

<p align="center">
  <img src="https://i.imgur.com/YYi5CJn.png" width="300" alt="Function wizard">
  <br>
  <i>May your functions be stateless and your deployments be seamless!</i>
</p>
