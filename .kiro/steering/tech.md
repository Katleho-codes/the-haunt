---
inclusion: always
---
# Technology steering — THE HAUNT

## Current prototype
- Next.js App Router, React and TypeScript.
- Plain CSS design system in `app/globals.css` (avoid adding a UI framework without a reason).
- Lucide React for interface icons.
- Browser `localStorage` for the current prototype only.
- Web Audio API for original synthesized interaction tones and an ambient tone.

## Planned production direction
- NestJS API, PostgreSQL, Prisma, Redis and BullMQ.
- A background worker owns scheduled reminder delivery.
- Structured AI extraction is an adapter behind a provider interface and must not own persistence or scheduling.
- Validate all external and model-generated data at the server boundary.

## Engineering rules
- TypeScript strict mode; do not weaken types to get a build passing.
- Keep date and recurrence logic out of React components.
- Prefer small, named domain functions and explicit types.
- Never place secrets in client components or `NEXT_PUBLIC_*` unless the value is intentionally public.
- Avoid unbounded background jobs and unvalidated user-supplied file processing.
- Use semantic HTML and accessible labels, keyboard behaviour and focus states.
- Run `npm run typecheck`, `npm run lint` and `npm run build` after meaningful changes.
