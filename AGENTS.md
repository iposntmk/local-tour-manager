# agents.md

Instructions for AI agents (Claude Code, sub-agents, background tasks) working in this repository.

## Code Architecture Laws (MANDATORY)

You are an extremely disciplined senior developer. The following laws are **non-negotiable** and apply to every file, PR, or patch you produce.

---

### Law 1 — File Size Limit

- **Hard cap: 300–350 lines per file** (absolute maximum 400 lines in exceptional, documented cases).
- If adding code would push a file past this limit, **pause and split first**.
- Splitting strategy: extract into a new focused module, import it, continue.

---

### Law 2 — Reusability (DRY)

- **Don't Repeat Yourself** — identical or near-identical logic must not exist in two places.
- Shared logic → `utils/` / `lib/` function.
- Shared UI → dedicated component.
- Shared async logic → custom hook or service.
- Before writing code, search the codebase for existing helpers that do the same thing.

---

### Law 3 — Design Principles

| Principle | Rule |
|---|---|
| Single Responsibility | Every file/module does **one** clearly named thing. |
| Separation of Concerns | Business logic, UI rendering, data access, validation, and error handling live in separate modules. |
| Encapsulation | Internals are not exposed unless explicitly needed by a caller. |

---

### Law 4 — Canonical Folder Structure

```
src/
  components/       UI components — stateless where possible, <= 200 lines preferred
  hooks/            Custom React hooks — one hook per file
  services/         Store / API call wrappers
  lib/ or utils/    Pure functions, formatters, validators, helpers
  features/         Domain slices — each feature owns its own components, hooks, services
  types/            TypeScript interfaces and enums
  constants/        App-wide constants (no magic numbers/strings in logic)
```

New files must go in the correct folder. If a folder does not exist and should, create it.

---

### Law 5 — Pre-coding Checklist

Before writing any non-trivial feature, answer these questions:

1. **Split plan**: Will this fit in <= 350 lines? If not, what modules will be created?
2. **Reuse check**: Does a function/hook/component for this already exist?
3. **Responsibility**: Does each proposed file have exactly one responsibility?

Only start writing after this is clear.

---

### Law 6 — Self-Enforcement

- After drafting code, scan every file you touched for law violations.
- If any file exceeds the line cap or repeats logic — refactor before delivering.
- Document the split rationale with a one-line comment only if non-obvious.

---

### Law 7 — This Project's Conventions (Local Tour Manager)

- All DB access via `store` from `@/lib/datastore` — never import Supabase client directly in components.
- UI text in Vietnamese via `t()` from `@/lib/i18n`.
- Dates as `YYYY-MM-DD` strings; use `date-fns` + helpers from `@/lib/date-utils`.
- Toast notifications via `sonner`.
- TanStack Query for async state; follow existing `staleTime` / `gcTime` config.
- Do **not** add `optimizeDeps.force: true` to `vite.config.ts` (causes EPERM on Windows).
