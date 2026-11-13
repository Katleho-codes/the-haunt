# Kiro write-up (draft)

Written on 13 November 2026 from `docs/KIRO-USAGE-LOG.md` only. Anything not in the log is not claimed here. Update the log first, then this file. Gaps are stated plainly because judges are asked to assess how Kiro was used.

## Project provenance

THE HAUNT's repository was assembled on 13 November 2026, inside the submission period. Its **initial scaffold was generated with ChatGPT assistance outside Kiro** and is not attributed to Kiro. It was committed as `4ef06ab` ("Phase 0 and Phase 1, done") and contained the first Next.js prototype. Everything described below happened afterwards, in Kiro, on top of that scaffold. **Owner to confirm before submitting:** exactly which files that first commit contained (application code, styling, SVG art, `.kiro` drafts) and who or what made each, so the disclosure can name them.

## Which Kiro surfaces were used

Kiro IDE only. The work was done in Kiro IDE agent sessions in Vibe mode, with sub-agents (below). Kiro CLI, Kiro Web and Kiro Crew were not used, so there is no comparison between them.

## What was built in Kiro

Starting from the scaffold, in one working day the Kiro agent audited the repository and then rebuilt the core:

- a validated domain model (date-only dates, money in minor units, per-currency totals) behind a storage interface;
- a calendar recurrence engine with completion history, undo and daylight-saving-safe time conversion;
- in-app reminders with a notification centre and honest state names;
- text capture as a proposal with a review step (a rule-based reader, labelled "not AI");
- the cinematic layer: house mood, motion and sound controls, completion and seal feedback;
- tests, an end-to-end browser script, an accessibility and contrast check, and an independent review.

Results and limits are in `docs/PRODUCT-STATUS.md`. The app is local-first: data lives in the browser and reminders appear only while the app is open.

## Spec-driven development

Eleven spec folders exist under `.kiro/specs/`, each with requirements (WHEN/SHALL criteria), design and tasks. Eight new specs and a rewritten capture spec were written in Kiro (Prompt 1) from an audit of the real code, and two older specs were marked superseded. The agent then implemented against them and updated task status with verification notes, and it changed the design where reality differed (for example, only completed occurrences are stored, because upcoming ones are derived). Honest limits: tasks were ticked by the agent, not by Kiro's spec task runner, which was never used; some tasks are left open on purpose (import, edit scopes, push). Compared with unstructured prompting, the specs gave a testable definition of done and made it easy to say what was not built, but no controlled comparison was run.

## Steering

Seven steering files (product, tech, structure, security, testing, visual design, competition) were given inclusion modes in Prompt 1: product, tech, structure and security always; visual design and testing only when matching files are in play; competition on demand. They were loaded into the agent's context during the sessions. Examples of what they steered: sound off by default with separate toggles and no red for decoration (visual design), "never claim delivery that did not happen" (product), and per-user ownership, export and deletion paths (security). No measurement of their effect was made.

## Custom agents

Three project agents exist (`domain-engineer`, `experience-engineer`, `quality-guardian`) with explicit resources and path-limited write permissions. Only **`quality-guardian`** was run, once, as a sub-agent in the Kiro IDE, to review the finished work independently. It ran the checks, started the server, probed the app and wrote `docs/REVIEW-2026-11-13.md` with 3 High and 8 Medium findings. The implementing agent re-checked five of them against the code (all confirmed) and then fixed the High findings and most Medium ones; the reviewer has not re-reviewed the fixes. The other two agents have not been run, so no claim is made about them. A separate `introspect` sub-agent was used to check Kiro's current file formats before the configuration was rewritten.

## Hooks

Two hooks are configured (`typecheck` on saving TypeScript files, and `post-task-verify` which runs typecheck and tests after a spec task). **Neither has a recorded run**, so no workflow improvement is claimed. `post-task-verify` was created with Kiro's hook tool.

## MCP and Powers

Not used. No MCP server was connected and no Power was installed. The browser checks use `playwright-core` directly from a script, not through MCP.

## Property-based testing

`fast-check` property tests cover recurrence ordering, uniqueness, bounds and idempotence, month-end and leap-year behaviour, daylight-saving round trips, reminder idempotence, money sums, the parser never producing an amount without a currency, and the house mood. They passed when written; the log does not record a case where a property test found a bug that example tests missed, so that is not claimed. What did find real defects were the browser script, the accessible-name sweep, the contrast audit and the independent review. Several tests were also checked by deliberately removing the fix and watching them fail.

## What changed compared with vibe coding

Most steps here were still conversational (Vibe) work. What the structure added was an audit first, written specs with checkable criteria, a status document that separates "unit-tested" from "seen working in a browser", an independent review that found real problems, and a rule that limits and failures are written down. These are observations from this single project, not a measured comparison.

## Known gaps, stated up front

Hooks and two agents never ran; the spec task runner, MCP, Powers, CLI, Web and Crew were not used; the scaffold came from outside Kiro; the backend (accounts, database, background reminders) is planned for after the core is finished and is not built.
