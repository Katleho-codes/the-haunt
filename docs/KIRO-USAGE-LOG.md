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

## Project provenance
The repository was assembled on 13 November 2026, within the submission period. Its initial scaffold (first commit `4ef06ab`) was generated with ChatGPT assistance outside Kiro and is not attributed to Kiro. The owner still needs to confirm exactly which files that commit contained and who made each. Everything listed in this log happened afterwards.

## Not yet used
MCP servers, Powers, Kiro Crew, spec task execution, hook runs, custom agent runs. Do not claim these until they happen.

### Addendum, 13 November 2026 (Prompt 4)
Kiro IDE agent session (Vibe): in-app reminders (plan, reconcile, states, notification centre, settings) with unit and property tests; added a playwright-core browser smoke test and ran it in Edge. Spec reminders-and-notifications: tasks 4.1-4.8 and 4.10 verified, 4.9 not built. Spec task runner and hooks were not used. Evidence: `tests/reminders.test.ts`, `e2e/smoke.mjs`.

### Addendum, 13 November 2026 (Prompt 5)
Kiro IDE agent session (Vibe): rebuilt text capture as a validated proposal/review workflow (`lib/capture/`), fixed the two parser defects from the audit with regression tests, added example and property tests, and extended the browser smoke test with two capture steps. Spec intelligent-capture: tasks 5.1-5.8 verified; 5.9-5.13 not started. Spec task runner and hooks were not used. Evidence: `tests/capture.test.ts`, `e2e/smoke.mjs`.

### Addendum, 13 November 2026 (Prompt 6)
Kiro IDE agent session (Vibe): cinematic-experience work (house mood, motion and intensity settings, audio levels and gating, completion and seal feedback, focus handling, self-hosted fonts, contrast and touch-target fixes). Added `e2e/contrast.mjs` and `e2e/screenshots.mjs` and extended `e2e/smoke.mjs`. Spec cinematic-experience: 6.1 to 6.7, 6.9 to 6.11 done; 6.8 and 6.12 open. Spec task runner and hooks were not used. Evidence: `tests/experience.test.ts`, `e2e/*.mjs`, `docs/evidence/screenshots/`.

### Addendum, 13 November 2026 (Prompt 7: independent review)
First real run of a custom Kiro agent: the `quality-guardian` sub-agent was invoked from the Kiro IDE session with the Prompt 7 brief. It ran typecheck, lint, tests and build, started the production server and ran the browser scripts, wrote temporary probes (deleted afterwards), and produced `docs/REVIEW-2026-11-13.md` (3 High, 8 Medium, 8 Low findings, 8 risks, verdict "not ready"). Five of its findings were re-checked by the implementing agent by reading the code (H-1 archived items hidden, H-2 unnamed switches, M-1 delete-all leaves backups, L-1 shortcut hint without a shortcut, L-4 trademark mark); all five were confirmed. The other findings have not been independently re-verified. The hooks (`post-task-verify`, typecheck-on-save) and the spec task runner have still not been used. Evidence: `docs/REVIEW-2026-11-13.md`.

### Addendum, 13 November 2026 (fixes after Prompt 7)
Kiro IDE agent session (Vibe): fixed the review findings H-1, H-2, H-3, M-1 to M-4, L-1, L-2, L-4 to L-6 (details in section 9 of `docs/REVIEW-2026-11-13.md`), added regression tests, and extended the browser smoke test to 30 steps including an accessible-name sweep. Mutation checks were run with a throwaway script: one earlier attempt overlapped with a second run and briefly left the source file in a mutated state; it was found, restored, and the checks were rerun sequentially. Hooks, the spec task runner and the quality-guardian re-review were not used for these fixes. Evidence: `tests/export.test.ts`, `tests/capture.test.ts`, `tests/storage.test.ts`, `e2e/smoke.mjs`.

### Addendum, 13 November 2026 (Prompt 8: release readiness)
Kiro IDE agent session (Vibe): read the official rules and compared them with the repository; checked that `.kiro/` is tracked and not ignored; found the GitHub repository is not publicly reachable; downloaded the three font licence texts into `docs/licenses/`; wrote `docs/RELEASE-CHECKLIST.md`, `docs/KIRO-WRITEUP-DRAFT.md`, `docs/DEMO-SCRIPT.md` and `docs/PRIVACY-NOTES.md`; added the provenance disclosure to the README and this log. Nothing was deployed, recorded or submitted. Hooks, the spec task runner, MCP and Powers were not used. Evidence: the four new docs and `docs/RELEASE-CHECKLIST.md` section 0 to 1.
