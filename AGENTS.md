# Repository Instructions

## Coding style

If the user asks to save something as a coding style rule, update this section.

- TypeScript only. No `.js` files in `src/`.
- Prefer `const` over `let`. Never use `var`.
- Omit default type parameters when they match the default (e.g., `Guard` not `Guard<unknown>`).
- Prefer implicit return types — only annotate return types when TypeScript cannot infer them correctly or when the inferred type is structural (e.g., `{ check }`) rather than a named domain type (e.g., `Guard<T>`). If the function already returns a named type through its implementation (e.g., calling `guard(...)` which returns `Guard`), omit the annotation.
- Avoid `as` casts — only use when TypeScript genuinely cannot infer the type (e.g., `json()` returns `unknown`, default generic params). Never cast to silence a type error that could be fixed structurally.
- Don't create intermediate `const` variables just to pass a value once — inline the expression directly.
- Use `type` for type aliases, not `interface`, unless extending is needed.
- Export from barrel `index.ts` files — every public module must be re-exported.
- Only comment code that needs a bit of clarification. Do not comment otherwise.
- Prefer descriptive variable names over abbreviations (e.g., `guard` not `g`, `request` not `req`).
- Formatting is enforced by Prettier — do not fight it.
- Build: `npm run build`, Test: `npm test`, Lint: `npm run lint`.

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for `alexpshul/azure-functions-essentials`. See `docs/agents/issue-tracker.md`.

### Triage labels

The canonical triage roles use the default label vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: root `CONTEXT.md` and root `docs/adr/`. See `docs/agents/domain.md`.
