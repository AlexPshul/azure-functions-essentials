# Repository Instructions

## Coding style

If the user asks to save something as a coding style rule, update this section.

- TypeScript only. No `.js` files in `src/`.
- Prefer `const` over `let`. Never use `var`.
- Omit default type parameters when they match the default (e.g., `Guard` not `Guard<unknown>`).
- Prefer implicit return types — only annotate return types when TypeScript cannot infer them correctly.
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
