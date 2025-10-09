# Repository Guidelines

## Project Structure & Module Organization
- App code lives in `src/` with aliases via `@/` (see `tsconfig.json`). Common folders: `src/components/`, `src/pages/`, `src/lib/`, `src/hooks/`, `src/types/`, `src/integrations/`.
- Public assets: `public/`. Build output: `dist/`.
- Database migrations: `supabase/migrations/` (timestamped `.sql`). Scripts: `scripts/`.

## Build, Test, and Development Commands
- `npm ci` — install exact dependencies (use npm; `package-lock.json` is authoritative).
- `npm run dev` — start Vite dev server.
- `npm run build` — production build to `dist/`.
- `npm run preview` — preview the production build locally.
- `npm run lint` — run ESLint on the repo.
- `npm test` — run Vitest (jsdom + Testing Library setup).
- `npm run backfill:total-days` — run data backfill script in `scripts/`.

## Coding Style & Naming Conventions
- Language: TypeScript + React. Indentation: 2 spaces; keep semicolons.
- Components/files: `PascalCase.tsx` in `src/components` and pages in `src/pages`.
- Use path alias: `import { formatCurrency } from '@/lib/currency-utils'`.
- Linting: ESLint (`eslint.config.js`) with TS + React Hooks rules. Fix issues or justify disables locally.
- Styling: Tailwind CSS (see `tailwind.config.ts`); prefer utility classes and existing UI primitives in `src/components/ui`.

## Testing Guidelines
- Framework: Vitest + @testing-library/react (jsdom). Setup in `vitest.setup.ts`.
- Place tests next to source as `*.test.ts`/`*.test.tsx`.
- Focus on critical calculations and UI flows (e.g., totals, currency, guest counts). No hard coverage gate, but add tests for new utilities and complex components.

## Commit & Pull Request Guidelines
- Use Conventional Commits (e.g., `feat:`, `fix:`, `refactor:`). Keep scope concise.
- PRs include: clear description, rationale, screenshots for UI changes, and steps to verify.
- Link related issues. Update docs and scripts as needed. If schema changes, add a Supabase migration file.

## Security & Configuration Tips
- Environment: `.env` for local dev (e.g., `VITE_SUPABASE_URL`, project ID, publishable key). Never commit service-role or secret keys.
- Review data scripts and migrations carefully; name migrations like `YYYYMMDDHHMMSS_add_feature.sql`.

## Agent-Specific Notes
- Prefer npm over other managers (a Bun lockfile exists, but `package-lock.json` governs).
- Keep changes minimal and cohesive; update related types, tests, and migrations together.
