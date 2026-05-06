# ⚡ Azure Functions Essentials

> Your go to library for building Azure Functions with TypeScript!

A magical TypeScript utility belt for Azure Functions developers who are tired of writing the same boilerplate code over and over again. This library will make your functions more readable, maintainable, and less prone to "It works on my machine" syndrome.

## 🚀 Installation

```bash
npm install azure-functions-essentials @azure/functions@latest
```

or if you're feeling yarn-ish

```bash
yarn add azure-functions-essentials @azure/functions@latest
```

> [!IMPORTANT]
> This package requires `@azure/functions@4.11.0` or newer as a peer dependency.

## ✨ Features

### 🔗 Function Chains

Chain your function logic like a boss.
Found a guard or an input that should be reused in other functions?
Declare as a const and reuse the logic!

Chains support **any Azure Functions trigger type** — HTTP, Service Bus, Timer, Event Hub, MCP tools, and more.

```typescript
import { startHttpChain, guard, funcResult, inputFactory } from 'azure-functions-essentials';

// Create an input binding for user lookup with your fancy database call
const userLookup = inputFactory<string, User>('user', userId => getUserFromDatabase(userId));

// Make sure they have the magic password
const keyGuard = guard(({ triggerData }) => triggerData.headers.get('x-api-key') === 'secret' || funcResult('Forbidden', 'Nice try, hacker!'));

// Make sure the user is a ninja (Guard functor pattern)
const ninjaGuard = (user: User) => guard(() => user.isNinja || funcResult('Forbidden', 'Only 🥷s are allowed!'));

app.post('super-secret-endpoint', {
  handler: startHttpChain()
    .useGuard(keyGuard) // Use a guard (or several?)
    .parseBody(myZodSchema) // Parse the body and (optionally) validate with Zod
    .useInputBinding(({ parsedData }) => userLookup.create(parsedData.user.id)) // Initialize the input
    .useGuard(({ context }) => ninjaGuard(userLookup.get(context))) // Use input results in the chain
    // Handle the request with all goodies available
    .handle((triggerData, parsedData, ctx) => {
      const user = userLookup.get(ctx); // Get the user from our input

      // Your incredibly important business logic here

      // Return a result with the funcResult helper
      return funcResult('OK', {
        message: `You're in ${user.name}! Here's your cookie 🍪`,
        userData: user,
        requestData: parsedData,
      });
    }),
});
```

#### Non-HTTP Chains

```typescript
import { startMessageChain, startTimerChain, startMcpChain } from 'azure-functions-essentials';
import { z } from 'zod';

// Service Bus with Zod validation — throws ZodError if invalid
const messageSchema = z.object({ orderId: z.string(), amount: z.number() });
const messageHandler = startMessageChain(messageSchema)
  .handle((triggerData, context) => {
    // triggerData is typed as { orderId: string, amount: number }
    context.log(`Processing order ${triggerData.orderId}`);
  });

// Timer trigger
const timerHandler = startTimerChain()
  .handle((triggerData, context) => {
    context.log(`Timer fired: ${triggerData.isPastDue}`);
  });

// MCP tool trigger with parsed arguments
const mcpHandler = startMcpChain()
  .parseArgs(myArgsSchema)
  .handle((triggerData, parsedData, context) => {
    return funcResult('OK', { result: 'Tool executed' });
  });
```

### 🛡️ Guards

> For more details and the list of built-in guards, check out the [Guards Documentation](https://github.com/AlexPshul/azure-functions-essentials/tree/main/src/chain/guards).

Keep the bad guys out:

```typescript
const isAdminGuard = guard(({ context }) => {
  const user = context.extraInputs.get('user');
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
.useInputBinding(({ triggerData }) => userLookup.create(triggerData.params.userId))
```

### 🌊 HTTP Streaming

`funcResult` supports Azure Functions HTTP stream bodies, so returning a native stream is as simple as returning text or JSON:

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

If a popular LLM or agent SDK gives you a stream of rich events instead of raw HTTP chunks, you can also provide the source stream together with an `extractChunk` function.

Here is a LangChain-style example where the agent yields structured streaming events, and we extract just the text tokens for the HTTP response:

```typescript
import { app, setup } from '@azure/functions';
import { createAgent } from 'langchain';
import { funcResult } from 'azure-functions-essentials';

setup({ enableHttpStream: true });

const agent = createAgent({ model: 'openai:gpt-5.4', tools: [] });

app.post('chat', {
  handler: async request => {
    const { message } = await request.json();

    const stream = await agent.stream({ messages: [{ role: 'user', content: message }] }, { streamMode: 'messages' });

    return funcResult('OK', stream, ([token]) => token.text ?? undefined);
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

### ⏰ Keep-Alive Timer

If you need the classic Azure Functions keep-alive workaround, register a tiny timer once during startup:

```typescript
import { registerKeepAlive } from 'azure-functions-essentials';

registerKeepAlive();
```

The default schedule is every 5 minutes (`0 */5 * * * *`), which is a practical balance for the timer-based workaround without being overly aggressive.

You can override the timer settings if you want a different cadence, function name, or a custom log message:

```typescript
registerKeepAlive({
  schedule: '0 */10 * * * *',
  name: 'myKeepAlive',
});
```

This helper is intended as a compatibility workaround for cold-start-sensitive apps. If your hosting plan supports warm-instance features, prefer those instead:

- Flex Consumption: always-ready instances
- Dedicated/App Service: Always On
- Premium: plan warm-instance features

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
const apiKeyGuard = guard<HttpRequest>(({ triggerData, context }) => {
  const apiKey = triggerData.headers.get('x-api-key');
  return apiKey === process.env.API_KEY || funcResult('Unauthorized', 'Invalid API key');
});

// Usage in chain
startHttpChain()
  .useGuard(apiKeyGuard)
  .handle((triggerData, ctx) => {
    // Only executed if API key is valid
    return funcResult('OK', 'Access granted!');
  });
```

#### Functor Pattern Guards

Guards can also be created on-the-fly with the functor pattern, allowing you to pass in parameters:

```typescript
type BodyType = { name: string; age: number };

// Guard factory that validates a specific property in the body
const validateBody = (parsedData: BodyType) => guard(() => parsedData.age >= 18 || funcResult('BadRequest', `Age must be at least 18 years old`));

// Usage with parsed body
startHttpChain()
  .parseBody<BodyType>()
  .useGuard(({ parsedData }) => validateBody(parsedData)) // Pass the parsed data to validateBody
  .handle((triggerData, parsedData, ctx) => {
    // Only executed if the body validator is passed
    return funcResult('OK', `Welcome, ${parsedData.name}!`);
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

startHttpChain()
  .parseBody(userSchema)
  .handle((triggerData, parsedData, ctx) => {
    // parsedData is typed and validated!
  });
```

## 🤝 Contributing

Pull requests are welcome!
Fork it and PR away!

## 📝 License

MIT License - Use it, abuse it, but please give credit where it's due.

---

<p align="center">
  <i>May your functions be stateless and your deployments be seamless!</i>
</p>


