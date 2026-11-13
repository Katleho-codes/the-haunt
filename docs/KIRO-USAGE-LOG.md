# Kiro usage log

Only work that was actually done with Kiro is listed. Configuration files existing in `.kiro/` is not usage. Add an entry after each session with evidence.

| Date | Kiro capability | What happened | Evidence |
|---|---|---|---|
| 2026-11-13 | Kiro IDE agent session (Vibe) | Prompt 0: repository audit. Read the brief, docs and source; ran typecheck, tests, build and lint; wrote the audit. | `docs/IMPLEMENTATION-AUDIT.md` |
| 2026-11-13 | Kiro IDE agent session, introspect sub-agent | Prompt 1: checked current Kiro formats for agents, hooks, steering and specs against kiro.dev docs. | Session transcript; this log |
| 2026-11-13 | Steering | Set inclusion modes: product, security, tech, structure always; visual-design and testing by file match; competition auto. | `.kiro/steering/*.md` |
| 2026-11-13 | Custom agents | Rewrote domain-engineer, experience-engineer, quality-guardian with explicit resources and permissions. Agents have not been run yet. | `.kiro/agents/*.md` |
| 2026-11-13 | Hooks | Added `post-task-verify` (PostTaskExec: typecheck and tests). Existing typecheck-on-save kept. Neither has fired yet. | `.kiro/hooks/*.json` |
| 2026-11-13 | Specs | Created product-foundation, commitment-domain, recurrence-engine, reminders-and-notifications, cinematic-experience, pwa-and-mobile, privacy-and-security, release-and-demo; rewrote intelligent-capture. No spec task has been executed yet. | `.kiro/specs/*` |
| 2026-11-13 | Kiro IDE agent session (Vibe) | Prompt 2: added Vitest/fast-check/Zod, domain and storage modules with tests, migrated the UI to the repository, fixed lint errors. Specs referenced: product-foundation, commitment-domain (tasks 1.2-1.4, 2.1-2.6 verified; 2.7-2.12 implemented, unverified in browser). Spec tasks were not run through Kiro's task runner and the new hook did not fire. | commits (when made), test output, spec task notes |
| 2026-11-13 | Kiro IDE agent session (Vibe) | Prompt 3: recurrence engine (rule schema, generation, series history, zoned conversion) with example and property tests; wired into the UI. Spec: recurrence-engine tasks 3.1-3.8, 3.12 verified; 3.9-3.11 partial. Task runner and hooks not used. | tests/recurrence.test.ts, zoned.test.ts, series.test.ts |

## Not yet used
MCP servers, Powers, Kiro Crew, spec task execution, hook runs, custom agent runs. Do not claim these until they happen.
