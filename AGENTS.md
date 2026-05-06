# Repository Instructions

## Coding style

- TypeScript only. No `.js` files in `src/`.
- Use single quotes for strings.
- Semicolons required.
- Trailing commas everywhere (`trailingComma: "all"`).
- Arrow parens avoided for single parameters: `x => x + 1`, not `(x) => x + 1`.
- Max line width is 150 characters.
- Prefer `const` over `let`. Never use `var`.
- Use `type` for type aliases, not `interface`, unless extending is needed.
- Export from barrel `index.ts` files — every public module must be re-exported.
- Only comment code that needs a bit of clarification. Do not comment otherwise.
- Formatting is enforced by Prettier — do not fight it.
- Build: `npm run build`, Test: `npm test`, Lint: `npm run lint`.

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for `alexpshul/azure-functions-essentials`. See `docs/agents/issue-tracker.md`.

### Triage labels

The canonical triage roles use the default label vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: root `CONTEXT.md` and root `docs/adr/`. See `docs/agents/domain.md`.
