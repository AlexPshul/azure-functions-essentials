# GitHub Copilot Context for Azure Functions Essentials

## Project Context

This TypeScript library provides essential utilities for Azure Functions NodeJS developers. It focuses on creating reusable patterns and helpful tools commonly needed when developing Azure Functions applications.

## Code Style Guidelines

### General Style

- Use camelCase for variable and function names
- Prefer concise expressions; avoid unnecessary braces where possible
- Use proper TypeScript types throughout the codebase
- Follow the existing style enforced by Prettier

### Error Handling

- Throw errors with descriptive messages rather than returning error objects
- Format error messages consistently: `[${paramName}] descriptive error message`

### Documentation

- Use comprehensive JSDoc comments for all public APIs
- Include @param, @returns, @throws, and @example sections when applicable
- Keep comments clear and concise with an occasional subtle touch of humor
- Document edge cases and potential pitfalls

## Testing Approach

- Follow the Arrange-Act-Assert (AAA) pattern
- Use descriptive test case names that explain the expected behavior
- Group related tests in describe blocks
- Set up common test fixtures with beforeEach
- Test both success paths and error conditions
- Mock external dependencies appropriately

## Architecture Patterns

- Build functional, reusable utilities
- Prefer composable functions that can be chained together
- Design for type safety and developer experience
- Create consistent interfaces and patterns throughout the library

## Azure Functions Specific

- Focus on solving common problems faced by Azure Functions developers
- Create utilities that simplify working with HTTP triggers, bindings, and context objects
- Optimize for the Azure Functions runtime environment
- Keep performance and cold-start times in mind

## Development Priorities

- Maintain high code quality and test coverage
- Focus on developer experience for library consumers
- Keep the API surface clean and intuitive
- Ensure backward compatibility when making changes
