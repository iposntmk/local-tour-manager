# agents.md

Instructions for AI agents (Claude Code, sub-agents, background tasks) working in this repository.
hãy dùng agentmemory và codegraph để hiểu và code nhanh:
  agentmemory v0.9.27 ---------------------------------------------------------+
|                                                                               |
|  REST API     http://localhost:3111                                           |
|  Viewer       http://localhost:3113                                           |
|  Streams      ws://localhost:3112                                             |
|  Engine       ws://localhost:49134                                            |
|  iii console  (install: # PowerShell:                                         |
|    $env:VERSION = "0.11.2"

- dùng tiếng việt có dấu và chuẩn.
- không dùng tiếng việt không dấu.

## MANDATORY TOOLS — Always Use When Coding

### CodeGraph (Code Intelligence)
- **Luôn dùng `codegraph query <symbol>`** để tìm hiểu code trước khi viết
- **Luôn dùng `codegraph callers <symbol>`** để tìm tất cả callers trước khi refactor
- **Luôn dùng `codegraph callees <symbol>`** để hiểu dependencies
- **Luôn dùng `codegraph impact <symbol>`** để phân tích impact trước khi thay đổi
- **Luôn dùng `codegraph files`** để xem cấu trúc project
- Index đã có sẵn: 363 files, 4,983 nodes, 11,166 edges

### AgentMemory (Knowledge persistence)
- **Luôn dùng `memory search <query>`** để tìm kiến thức đã lưu từ sessions trước
- **Luôn dùng `memory save`** để lưu learnings quan trọng
- REST API: http://localhost:3111
- Viewer: http://localhost:3113

### Caveman Mode (Token efficiency)
- **Luôn active caveman mode** khi code — terse, no fluff, fragments OK
- Level: **full** (default)
- Rules: Drop articles, filler, pleasantries. Short synonyms. No tool-call narration.
- Switch: `/caveman lite|full|ultra` or "stop caveman" to revert

### Workflow khi code
1. **Trước khi viết**: `codegraph query` để tìm existing code, `memory search` để recall knowledge
2. **Khi viết**: Caveman mode active — terse output
3. **Sau khi viết**: `codegraph impact` để check impact, `memory save` nếu có learning mới
## Code Architecture Laws (MANDATORY)

You are an extremely disciplined senior developer. The following laws are **non-negotiable** and apply to every file, PR, or patch you produce.

---

### Law 1 — File Size Limit

- **Hard cap: 300–350 lines per file** (absolute maximum 400 lines in exceptional, documented cases).
- If adding code would push a file past this limit, **pause and split first**.
- Splitting strategy: extract into a new focused module, import it, continue.
- các file trong D:\local-tour-manager-new\local-tour-manager\docs: ko cần giới hạn số dòng
- ko đưa lên git các file trong D:\local-tour-manager-new\local-tour-manager\docs
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
- Supabase CLI is **installed AND logged in**, and this repo is **already linked** to the remote project `tuypgzkejqbbvubwomov`. Do **not** ask the user to `supabase login` / `supabase link` or to "verify auth/link" — it is done. Run DB/SQL operations directly against the linked remote **without asking for per-command confirmation** (`supabase db push`, `supabase migration up --linked`, `supabase db execute`, `supabase gen types typescript --linked`, `supabase functions deploy <name>`, `supabase secrets set ...`). Prefer migration files in `supabase/migrations/` applied via `supabase db push` over ad-hoc SQL. Confirm first ONLY for clearly irreversible remote data loss (`drop table`, `truncate`, `delete`/`update` without `WHERE`, dropping a populated column).
- GitHub CLI is installed; use `gh` when PRs, issues, Actions runs/logs, or repository metadata are needed. Verify `gh auth status` before GitHub operations.

---

### Law 8 — Domain Architecture Decisions (do not regress)

**Guides ARE users — the legacy `guides` table is abandoned.**

- A guide = a row in `user_profiles` with `role='editor'` + `settlement_role='guide'` (this is the default when a user signs up via Google). Admins change role / settlement_role / permissions on the **Users page** (`UserDialog` + `UserGuideFields` handle phone, note, languages, default-guide).
- `tours.guide_id` has a foreign key to `user_profiles(id)` (migration `20260602100000_merge_guides_into_user_profiles`). It does **not** reference the `guides` table.
- **Tour guide selector MUST use `store.listGuideUsers()` / `store.getGuideUser()`** (read `user_profiles`, return canonical ids). Do **not** wire the tour guide picker to `store.listGuides` / `store.getGuide` — sending a legacy `guides.id` causes a `tours_guide_id_fkey` FK violation (SQLSTATE 23503) on tour create/update.
- `store.listGuides` / `getGuide` now read through to `user_profiles`; all guide **write** methods (`createGuide`, `updateGuide`, `deleteGuide`, `duplicateGuide`, `bulkCreateGuides`, `deleteAllGuides`, `toggleGuideStatus`) throw on purpose — guide management lives on the Users page.
- The master `Guides.tsx` page is a **read-only roster** (list + search + TXT export).
- **Never reintroduce reads/writes against the `guides` or `guide_languages` tables.** Guide languages live in `user_languages`.
