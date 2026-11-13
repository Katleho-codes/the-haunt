# Kiro development workflow

This project includes project-level Kiro steering, feature specs, hooks and three specialist custom agents. These files are scaffolding for authentic Kiro-assisted work; they are not evidence that Kiro has already executed the work.

## Recommended sequence

1. Open this repository in Kiro and trust the workspace.
2. Review `.kiro/steering/` and the three feature specs.
3. Use the Spec workflow to inspect and refine `core-experience`, then `intelligent-capture`, then `visual-atmosphere`. Preserve current scope and mark prototype boundaries explicitly.
4. Assign the experience engineer to visual polish and responsive/accessibility issues.
5. Assign the domain engineer to parser correctness, recurrence/timezone design and a server/API migration plan.
6. Ask the quality guardian to review the work independently before merging.
7. Use Kiro Crew for bounded parallel tasks with explicit file ownership. Integrate through reviewed commits rather than allowing multiple agents to rewrite the same files.
8. Configure an MCP server only when it offers a real capability for this project (for example browser-driven end-to-end testing). Record the actual server and what it was used for; do not add a decorative MCP integration.
9. Capture genuine evidence: spec iteration, task assignments, hook runs, code review findings, MCP calls and tests that actually occurred in Kiro.

## Suggested first Kiro session

Prompt: "Inspect this repository and its Kiro steering/spec files. First verify the current working tree and product status. Refine the Core Experience spec into a vertical slice for the local prototype. Identify implementation gaps and tests. Do not claim the existing parser is AI, do not add backend claims, and do not change the visual identity without explaining why."

## Suggested Kiro Crew split

- Agent A — recurring commitment domain tests and local date correctness (`lib/date-utils.ts`, domain tests only).
- Agent B — responsive/accessibility review and fixes (`components/`, `app/globals.css`, with scoped component ownership).
- Agent C — capture parser test matrix and edge-case fixes (`lib/capture.ts`, tests only).

A human integrator should resolve cross-cutting changes and run the full verification suite.
