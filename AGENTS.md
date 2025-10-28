# Repository Guidelines

## Project Structure & Module Organization
Keep route-specific logic beside its segment.
- `src/app`: Route segments (`dashboard`, `auth`, `api`) with page components, server actions, and Supabase calls.
- `src/lib`: Shared utilities, especially `supabase/server` factories and auth helpers.
- `src/types`: Workspace-wide TypeScript interfaces.
- `supabase/migrations`: Versioned SQL; prefer new migration files (avoid retroactive edits once deployed) and keep schemas aligned with the Supabase dashboard.

## Build, Test, and Development Commands
Stick to npm scripts for parity with CI.
- `npm run dev`: Starts the Next.js dev server at `http://localhost:3000`.
- `npm run build`: Compiles the production bundle; catch type/config regressions before release.
- `npm run start`: Serves the built app for production smoke tests.
- `CI=1 npm run lint`: Runs ESLint in non-interactive mode (avoids the Next.js prompt); auto-fix via `next lint --fix` when handy.

## Coding Style & Naming Conventions
TypeScript + Tailwind dominate; mirror the patterns in `src/app/dashboard`.
- Use 2-space indentation, trailing commas, and editor format-on-save.
- Components in `PascalCase`; route folders in kebab-case (e.g. `api-keys`).
- Co-locate client helpers with the route; share cross-cutting logic through `src/lib`.
- Order Tailwind classes from layout → spacing → color for readability.

## Testing Guidelines
Automated tests are pending, so rely on linting and targeted manual checks.
- Add new tests beside the feature (`src/app/dashboard/__tests__/usage.test.tsx`) with `vitest` + `@testing-library/react`.
- Exercise Supabase mutations against a local project and commit updated migrations.
- Run `npm run lint` and manually walk the impacted UI flows before pushing.

## Commit & Pull Request Guidelines
Commits follow concise Conventional Commit prefixes (`feat:`, `docs:`, `chore:`) with imperative summaries; English or Korean is fine.
- Reference issues or ROADMAP milestones in the body when relevant.
- Attach screenshots or recordings for UI changes and call out schema updates from `supabase/migrations`.
- Rebase onto `main`, confirm a clean build, and list follow-up work in the PR description.

## Configuration & Secrets
Copy `.env.example` to `.env.local` and supply Supabase plus AI provider keys.
- Keep secrets out of git; update `.env.example` with sanitized placeholders instead.
- For database provisioning, follow `SUPABASE_SETUP.md` and document new tables there.

## Agent Coordination
Two AI agents contribute here: Codex (CLI-based; primary for code edits) and Claude (parallel terminal; often analyzing architectural trade-offs).  
- Announce ownership of ongoing tasks in the shared channel to avoid duplicate patches.  
- Codex should prioritize implementation details and lint fixes; Claude can focus on reviews, high-level strategy, or documentation when Codex is mid-change.  
- When both touch the same feature, pin the source of truth (`main` branch or a shared PR) before handing off to prevent drift.
