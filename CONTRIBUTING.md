# Contributing

Thanks for helping improve Local Tour Manager! Please follow these guidelines to keep changes smooth and consistent. See `AGENTS.md` for the full repository guidelines.

## Getting Started
- Use Node + npm. Install with `npm ci`.
- Run locally with `npm run dev`. Build with `npm run build` and preview with `npm run preview`.
- Lint before pushing: `npm run lint`. Run tests: `npm test`.

## Branches & Commits
- Branch names: `feat/<short-scope>`, `fix/<short-scope>`, `chore/<short-scope>`.
- Use Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`. Keep messages clear and scoped.

## Pull Requests
- Fill out the PR template and include:
  - What changed and why
  - Screenshots/GIFs for UI changes
  - Test plan (steps and expected results)
  - Linked issues (e.g., `Closes #123`)
- Keep PRs focused and under ~400 lines of diff when possible.

## Database & Config
- Schema changes must include a migration in `supabase/migrations/` using the timestamped naming pattern.
- Do not commit secret keys. Local env vars go in `.env` (Vite-prefixed keys).

## Code Style & Tests
- TypeScript + React with Tailwind. Prefer existing components in `src/components/ui`.
- Add/adjust tests for new utilities and complex components.

Questions? Open a draft PR for early feedback.
