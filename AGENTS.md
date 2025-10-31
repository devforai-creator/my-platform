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
- `npm run test`: Executes Vitest suites (unit + integration) that are also enforced in CI.

## Coding Style & Naming Conventions
TypeScript + Tailwind dominate; mirror the patterns in `src/app/dashboard`.
- Use 2-space indentation, trailing commas, and editor format-on-save.
- Components in `PascalCase`; route folders in kebab-case (e.g. `api-keys`).
- Co-locate client helpers with the route; share cross-cutting logic through `src/lib`.
- Order Tailwind classes from layout → spacing → color for readability.

## Testing Guidelines
CI blocks merges unless both lint and tests succeed.
- Unit coverage lives next to the feature when practical (e.g. `src/lib/chat-summaries.test.ts`).
- Integration smoke tests are located at:
  - `src/lib/chat-summaries.integration.test.ts` (hierarchical memory scheduler, in-memory Supabase harness)
  - `src/app/api/chat/route.test.ts` (chat endpoint ownership, persistence, summary trigger)
- New features should ship with Vitest coverage or a documented rationale. Use dependency injection or minimal mocks to avoid network calls.
- Before merging: run `CI=1 npm run lint` and `npm run test`, then perform a brief manual chat to confirm UI regressions are absent.

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
Two AI agents contribute here: **Claude Code** (primary development assistant via claude.ai/code) and **Codex** (specialized security reviewer and code quality analyzer).
- **Claude Code**: Handles code generation, architecture guidance, feature development, and general development tasks.
- **Codex**: Focuses on security reviews (especially before deployment), automated fixes, and critical security patches.
- Announce ownership of ongoing tasks in the shared channel to avoid duplicate patches.
- When both touch the same feature, pin the source of truth (`main` branch or a shared PR) before handing off to prevent drift.
- **Deployment workflow**: Claude Code implements features → `npm run lint` + `npm run test` → Codex security review → deploy
- Keep the CI badge green: if a PR breaks lint/tests, coordinate quickly to unblock deployment announcements.
