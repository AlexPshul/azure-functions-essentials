# GitHub Copilot Chat Context

## Project Overview

Azure Functions Essentials is a TypeScript library providing utility functions and patterns for Azure Functions NodeJS developers. The library focuses on simplifying common tasks and providing reusable solutions to challenges frequently encountered in Azure Functions development.

## When Suggesting Code

- Suggest TypeScript solutions with proper type definitions
- Follow the existing patterns in the codebase
- Keep code concise and avoid unnecessary braces when possible
- Use async/await for asynchronous code
- Avoid using `any` type; prefer specific types or generics
- Use `const` and `let` instead of `var`
- Avoid declaring type where it is not required. Let TypeScript infer the type when possible
- Ensure suggestions are well-tested with Jest
- Include comprehensive JSDoc comments for new functions
- Add a touch of subtle humor in comments when appropriate

## When Answering Questions

- Be concise and to the point, don't over explain

## When Reviewing Code

- Check for proper error handling (throwing errors with descriptive messages)
- Ensure comprehensive test coverage following the AAA pattern
- Verify TypeScript types are properly used
- Look for opportunities to improve developer experience
- Suggest optimizations that maintain code clarity
- Ensure code follows best practices and is easy to read

## Project Goals

- Create a reliable, well-tested toolkit for Azure Functions developers
- Simplify common patterns used in serverless applications
- Provide utilities that improve developer productivity
- Focus on developer experience and ease of use
- Maintain backward compatibility
