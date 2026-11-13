# THE HAUNT — Kiro Master Product & Build Brief

> **Keep life's loose ends from coming back to haunt you.**

**Document version:** 1.0  
**Prepared:** 13 November 2026  
**Competition:** Kiroween 2026  
**Target category:** Costume Contest  
**Working product name:** THE HAUNT (name clearance still required)  
**Product type:** Personal commitments and life-admin manager  
**Initial market:** South Africa, with internationalisation designed in from the beginning  
**Visual direction:** Extreme cinematic supernatural horror  
**Status:** Product/build master brief for Kiro. This is not a claim that all features are implemented.

---

# IMPORTANT — INSTRUCTIONS TO KIRO

You are the engineering lead for THE HAUNT. Treat this document as the product direction and implementation brief, not as permission to rewrite the repository indiscriminately.

## First actions — do these before coding

1. Inspect the entire existing repository, including `README.md`, `docs/`, `app/`, `components/`, `lib/`, `public/`, tests, `package.json`, and the complete `.kiro/` directory.
2. Run the existing checks that are possible in the current environment. Record which checks actually ran and their results. Do not claim a build passed if dependencies could not be installed or the command could not run.
3. Compare the current implementation against this brief. Produce `docs/IMPLEMENTATION-AUDIT.md` with:
   - what exists and works;
   - what exists only as a UI or scaffold;
   - what is incomplete or unverified;
   - dependencies and infrastructure needed;
   - risks, contradictions and decisions that need human approval.
4. Preserve the existing visual direction and working flows unless you can show a concrete reason to change them. Do not replace the application with a generic admin template.
5. Create or refine Kiro Feature Specs before implementing major features. Use Requirements → Design → Tasks. Make acceptance criteria testable.
6. Work in small, reviewable increments. After each task, run the most relevant tests and update the relevant spec task status and `docs/PRODUCT-STATUS.md`.
7. Never invent successful tests, integrations, notification delivery, AI extraction, deployment, Kiro usage or competition compliance. State clearly what is real, simulated, scaffolded or not implemented.
8. Do not add credentials, private keys, real personal documents or production secrets to the repository, prompts, screenshots or demo data.
9. Ask for human approval before destructive database migrations, deleting user data, making paid-service commitments, or enabling external data transmission.
10. Prioritise a complete, dependable, visually unforgettable vertical slice over a large collection of unfinished features.

## Kiro operating principle

Use Kiro as a real engineering environment throughout the project. The repository must retain `.kiro/` at its root. Use Specs, Steering, Hooks, custom agents/sub-agents, MCP and relevant Powers where they improve the work. Capture evidence of actual use. Configuration files alone do not prove that a feature was used.

The human product owner makes final product, scope, privacy, deployment and release decisions. Kiro agents may recommend, implement bounded tasks and review work, but they must not silently widen scope.

---

# 1. Executive product definition

## 1.1 What THE HAUNT is

THE HAUNT is a personal life-admin and commitments manager. It gives people one dependable place to capture, organise and remember the obligations that otherwise become scattered across messaging apps, emails, screenshots, documents, calendars and memory.

A commitment may be a bill, subscription, school payment, renewal, appointment, household task, membership, work obligation or ordinary reminder.

Users can create a commitment manually, type or paste a message, upload an image/PDF, or eventually dictate a voice note. The system turns the input into a structured **proposal**. The user reviews and confirms the proposal before it becomes a real commitment. THE HAUNT then tracks dates, recurrence, reminder preferences, completion and history.

The experience takes place inside a cinematic haunted environment. The mansion, fog, candlelight, apparitions, sound and supernatural feedback are not decoration pasted onto a generic task manager: they are the defining visual language of the product.

## 1.2 The product promise

**Capture it once. Know when it matters. Keep it from coming back to haunt you.**

THE HAUNT should reduce the mental effort of remembering recurring and one-off responsibilities. It should help users answer:

- What needs my attention today?
- What is coming up next?
- Which recurring commitments are active?
- What have I completed?
- What have I forgotten or allowed to become overdue?

## 1.3 Elevator pitch

THE HAUNT is an intelligent personal commitments manager that turns scattered life-admin information into actionable reminders. It combines quick capture, structured extraction, recurring schedules and dependable reminder workflows with a cinematic supernatural interface that makes everyday organisation memorable.

## 1.4 Product category and judging fit

**Submission category: Costume Contest.**

The project is a useful application whose defining differentiator is a haunting, polished, coherent and unforgettable user interface. Horror elements must reinforce product meaning and feedback. They must not obstruct usability.

The application must still be useful with sound disabled, animations reduced and the visual environment simplified.

## 1.5 What this product is not

- Not a bank, wallet, payment processor or financial-advice service.
- Not a bank-statement aggregator.
- Not an automatic subscription cancellation service.
- Not a general-purpose project-management suite.
- Not a social network.
- Not a generic chatbot.
- Not an autonomous agent allowed to make financial or legal decisions.
- Not an application that requires users to keep a browser tab open to receive every reminder.

---

# 2. Problem, audience and market fit

## 2.1 The problem

People have obligations distributed across too many places. A fibre bill may arrive by email, a school notice by WhatsApp, a vehicle renewal date on a document, an appointment on a paper card and a recurring subscription in an app store. The user must extract the useful information, remember the date, decide when to act and keep track of whether the task is complete.

A conventional to-do list expects users to do all the capture and scheduling work themselves. THE HAUNT should reduce that friction while preserving user control.

## 2.2 Primary users

- Individuals managing personal administration.
- Parents and households managing school, home and family commitments.
- Students managing fees, appointments and academic deadlines.
- Professionals managing appointments, renewals and recurring obligations.
- Freelancers managing invoices, subscriptions and business administration.

## 2.3 South African-first, international-ready

South African relevance should be visible in the examples, categories, demo data and initial locale settings, without hard-coding South Africa into the product.

Initial South African examples:

- Fibre and mobile airtime/contract payments.
- School fees, levies, permission slips and school-event dates.
- Vehicle licence renewals and service reminders.
- Insurance premiums and renewal dates.
- Municipal or household bills.
- Gym, streaming and software subscriptions.
- Medical and dental appointments.
- Home, family and work responsibilities.

International examples:

- Rent and utilities.
- Memberships and subscriptions.
- Tax and administrative deadlines.
- Vehicle registration and inspection renewals.
- Insurance renewals.
- Appointments and recurring household tasks.

## 2.4 Localisation requirements

- Default South African demo profile: `en-ZA`, `Africa/Johannesburg`, `ZAR`, `dd/MM/yyyy`.
- Store each user's IANA timezone, locale and preferred currency.
- Support multiple currency codes per commitment; do not assume every amount is ZAR.
- Do not silently convert currencies or invent exchange rates.
- Use locale-aware date, time and number formatting.
- Store date-only deadlines as date-only values, not UTC timestamps that can shift to the previous/next calendar day.
- Handle daylight-saving transitions for international users.
- Keep country-specific categories and examples configurable rather than embedded throughout business logic.

---

# 3. Product differentiators and signature experience

The product must not be presented as "another Todo app with a spooky theme". Its strongest combination is:

1. **Life-admin domain:** one place for tasks, payments, renewals, appointments, subscriptions and recurring obligations.
2. **Fast capture:** users can paste a message or upload a notice rather than manually filling every field.
3. **Structured extraction with confirmation:** the system proposes title, date, amount, currency, category and recurrence; the user confirms or corrects them.
4. **A real recurrence and reminder engine:** obligations reappear on the correct dates and reminder status is traceable.
5. **A cinematic haunted world:** the mansion changes its atmosphere to represent the state of the user's commitments, and actions have meaningful supernatural feedback.

## 3.1 Signature demo journey

This is the most important end-to-end experience to perfect:

1. A user opens THE HAUNT and sees the mansion dashboard.
2. The user chooses **Capture a Whisper**.
3. The user pastes a fictional message or uploads a fictional bill/notice.
4. THE HAUNT extracts a proposed commitment, for example: "Fibre payment — R899 — due 25 November — monthly".
5. A review screen displays every proposed field and marks uncertain or missing fields.
6. The user corrects or confirms the proposal.
7. The commitment appears in the dashboard and recurring ledger.
8. The app shows the next due date and reminder schedule.
9. The user completes the commitment; a restrained spectral animation resolves it into the Crypt.
10. The dashboard's environment updates to reflect the changed state.

This journey must be real, testable and reliable. Use fictional demo content, never real personal bills or documents in the public video.

## 3.2 Daily-use strategy

The daily value comes from reducing effort, not from gimmicks:

- A clear Today view that answers what matters now.
- Quick capture available from every main screen.
- Recurring commitments that maintain themselves after initial setup.
- Useful reminders that arrive at the chosen time/channel.
- A monthly view of upcoming recurring costs, based only on amounts entered by the user.
- Search, filtering and completion history.
- A mobile-friendly installable PWA.
- Potential future share-to-app capture from supported mobile share sheets.

A possible later enhancement is a PWA Web Share Target so supported mobile browsers can share text or files directly into THE HAUNT. Treat this as an enhancement, not a cross-browser guarantee. Verify actual support before promising it.

---

# 4. Product scope and priorities

Use MoSCoW priorities. Do not begin a stretch feature while a Must Have item is unreliable.

## 4.1 Must Have — competition MVP

- Responsive, complete application shell.
- Today dashboard with due today, overdue, upcoming and recent items.
- Commitment create, view, edit, complete, restore, archive and delete.
- Categories and search/filter.
- Due dates, optional due times and timezone-aware display.
- Recurrence for daily, weekly, fortnightly, monthly, quarterly and annual schedules (only expose frequencies that are implemented and tested).
- Reminder configuration and a real reminder processing path for at least one delivery channel or clearly labelled in-app delivery.
- Quick text capture with a review/confirmation step.
- AI/document extraction if provider and time permit; otherwise the demo must clearly identify deterministic parsing as deterministic and not claim it is AI.
- User preferences for timezone, locale, currency, sound and motion.
- Persistent storage that survives reloads. Prefer server-backed storage for the deployed product.
- Demo account or safe judge test path with fictional seeded data.
- Export and deletion of user data.
- Cinematic visual identity applied consistently to all major screens.
- Sound disabled by default and controllable.
- Reduced-motion support.
- Publicly accessible deployed demo and installation/run instructions.

## 4.2 Should Have — only after MVP is stable

- Image/PDF upload with OCR/text extraction.
- Browser/PWA push notifications.
- Email reminders.
- Monthly recurring amount summary.
- Calendar export (`.ics`).
- PWA install prompt and application shell caching.
- Mobile share target where supported.
- More elaborate haunted environment states.
- Voice capture/transcription.

## 4.3 Could Have — only if time remains

- Multiple household members and shared commitments.
- Calendar provider integrations.
- Email forwarding address for capture.
- Browser extension.
- Advanced analytics.
- Multiple mansion themes.
- Customisable ghost companions.
- Natural-language editing of existing commitments.

## 4.4 Won't Have in this hackathon build

- Direct bank integrations.
- Automatic payment execution.
- Subscription cancellation through third-party services.
- Financial advice or debt recommendations.
- Scraping personal inboxes without explicit authorisation.
- Autonomous changes to a user's schedule without review.
- Complex household permissions and approvals.
- Social feed, public profiles or leaderboards.

---

# 5. Functional requirements

## 5.1 Commitment domain

A commitment is a user-owned obligation or event.

Required fields:

| Field | Type / rule | Notes |
|---|---|---|
| `id` | UUID | Server-generated |
| `userId` | UUID | Ownership boundary |
| `title` | String, required | Trimmed; bounded length |
| `description` | String, optional | Plain text or safely rendered Markdown subset |
| `type` | Enum | task, bill, subscription, appointment, renewal, household, work, study, membership, custom |
| `category` | Enum or controlled string | User-editable taxonomy may come later |
| `status` | Enum | active, completed, archived |
| `dueDate` | Date-only | Calendar date in user's timezone |
| `dueTime` | Optional local time | Only when the user sets a time |
| `timezone` | IANA timezone | Snapshot of schedule timezone where appropriate |
| `amountMinor` | Integer, optional | Store money in minor units to avoid floating-point errors |
| `currency` | ISO 4217 code, optional | Required when amount exists |
| `recurrenceRule` | Structured rule, optional | Master schedule |
| `sourceType` | Enum | manual, pasted_text, image, pdf, voice, imported |
| `sourceReference` | Optional | Non-sensitive provenance metadata |
| `createdAt` | Timestamp | UTC |
| `updatedAt` | Timestamp | UTC |
| `completedAt` | Optional timestamp | UTC |

Validation:

- Title cannot be empty.
- Due date must be valid.
- Amount must be a non-negative integer in minor units; if zero is valid for a category, document it.
- Currency is required when amount is present.
- Recurrence values must be validated against allowed frequencies and interval limits.
- All record queries and mutations must enforce `userId` ownership.
- A deleted item must not leave active scheduled reminders.

## 5.2 Commitment lifecycle

- Create a new commitment.
- View details.
- Edit title, description, category, due date/time, amount, currency and reminder preferences.
- Complete one occurrence or a one-off commitment.
- Restore a completed commitment where appropriate.
- Archive without deleting history.
- Delete with a confirmation step.
- Search by title/description.
- Filter by category, status, date range and recurring/non-recurring.

For recurring series, the edit/complete experience must distinguish:

- This occurrence only.
- This and future occurrences.
- Entire recurring series.

If a full edit-scope implementation is not feasible, implement and clearly communicate the supported subset. Never silently alter historical occurrences.

## 5.3 Recurrence engine

Represent a recurring commitment as a master schedule plus generated occurrences. Do not treat a recurrence string alone as a reminder schedule.

Supported initial recurrence patterns:

- Every day.
- Every N days.
- Every week on selected weekday(s).
- Every two weeks.
- Every month on a selected day.
- Every quarter.
- Every year.

Rules:

- Use calendar-aware date arithmetic, not `milliseconds + N * 24h`.
- Preserve the user's timezone.
- Define what happens when a monthly day does not exist (for example, a rule on the 31st). Pick a documented deterministic policy and test it.
- Handle leap years.
- Handle daylight-saving transitions.
- Do not generate duplicate occurrences.
- Do not generate occurrences before series start or after series end.
- Regeneration must be idempotent.
- Completing one occurrence must not complete the entire series unless explicitly chosen.
- Editing a series must not rewrite completed historical occurrences.

## 5.4 Reminders and notifications

Reminder channels, in priority order:

1. In-app reminder/notification centre.
2. PWA/browser push if permission is explicitly granted and implementation is verified.
3. Email if a configured provider is available and delivery is verified.

Required behaviours:

- Users can configure one or more reminders before a due date/time.
- Users can snooze or dismiss a reminder.
- Reminders must be cancelled/rescheduled when the underlying commitment changes.
- Reminder dispatch must be idempotent.
- Delivery states must distinguish `scheduled`, `queued`, `attempted`, `sent`, `delivered`, `failed`, `cancelled` where the chosen provider supports those states.
- Do not mark a notification as delivered just because a queue job was enqueued.
- Retry transient errors with bounded backoff; do not retry permanent errors forever.
- Provide a delivery audit trail without logging sensitive commitment content unnecessarily.
- If only in-app reminders are implemented, label them accurately and do not claim push/email delivery.

## 5.5 Intelligent capture

Capture entry points:

- Quick text input.
- Pasted text.
- Image upload.
- PDF upload.
- Voice input (stretch).

The capture service returns a **proposal**, never a persisted commitment directly.

Suggested proposal schema:

```ts
interface CommitmentProposal {
  title: string;
  description?: string;
  type: "task" | "bill" | "subscription" | "appointment" | "renewal" | "household" | "work" | "study" | "membership" | "custom";
  category?: string;
  dueDate?: string; // YYYY-MM-DD, calendar date in the selected timezone
  dueTime?: string; // HH:mm, optional
  timezone: string;
  amountMinor?: number;
  currency?: string;
  recurrence?: {
    frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
    interval: number;
    weekdays?: number[];
    dayOfMonth?: number;
    endDate?: string;
  };
  reminderSuggestions?: Array<{ offsetMinutes: number; channel: "in_app" | "push" | "email" }>;
  confidence?: Record<string, number>;
  needsReview: string[];
  sourceSummary?: string;
}
```

Rules:

- Validate the response with a runtime schema such as Zod.
- Do not invent missing dates, payment amounts, currencies or recurrence rules.
- Preserve ambiguous values as missing and add a `needsReview` note.
- Display exactly what was extracted and what remains uncertain.
- User must confirm before saving.
- Keep deterministic parser behaviour separate from LLM-based extraction.
- Handle model timeout, malformed JSON, rate limits and provider failure gracefully.
- Always provide manual editing and manual creation fallback.

### Example

Input: `My fibre bill is R899 and is due on the 25th of every month.`

Expected proposal:

- Title: Fibre bill.
- Type: bill.
- Amount: 89900 minor units.
- Currency: ZAR.
- Due day: 25.
- Recurrence: monthly.
- Reminder suggestion: 3 days before.
- Review note: confirm next due month/date if not explicit in the source.

### Example with ambiguity

Input: `The vehicle licence expires in March; remind me before it expires.`

Expected proposal:

- Title: Renew vehicle licence.
- Type: renewal.
- Due date: missing.
- Review note: exact expiry date and year required.

The system must not invent 1 March or choose the next March automatically.

## 5.6 Document and image capture

If implemented:

- Accept a small allowlist: PDF, JPEG, PNG, WebP, with explicit maximum size.
- Verify MIME/content signatures server-side; do not trust filename or browser MIME alone.
- Reject executable, script and unknown file types.
- Use private storage and short-lived signed access URLs where object storage is used.
- Extract text/OCR in a controlled processing job.
- Delete temporary processing files after a defined retention period.
- Do not log extracted document contents.
- Explain what is sent to an external AI provider and obtain explicit user consent before external processing.
- Provide a manual route when OCR or model extraction fails.

## 5.7 Monthly ledger and recurring amount summary

A useful differentiator for bills and subscriptions:

- Show upcoming recurring commitments for the selected month.
- Sum known amounts by currency, never combine currencies without explicit conversion.
- Label the result as user-entered scheduled amounts, not bank-verified actual spending.
- Distinguish fixed amount from unknown amount.
- Do not claim a user is being charged by a provider; THE HAUNT only tracks information the user supplies.

## 5.8 Search, filters and history

- Search title and description.
- Filter by category and status.
- Filter by due-date period.
- Show completed history.
- Allow sorting by due date, creation date and title.
- Empty states should be useful and visually themed.

## 5.9 User preferences

- Locale.
- Timezone.
- Preferred currency.
- Default reminder offsets.
- Sound effects on/off.
- Ambient sound on/off.
- Sound volume.
- Reduced motion.
- Preferred visual intensity (optional): full haunted, restrained, low-motion.
- Notification permissions/status.
- Data export.
- Account/data deletion.

---

# 6. Information architecture and screen specification

The visual naming can be atmospheric, but every destination must also have a plain-language label or tooltip.

## 6.1 Main navigation

| Product destination | Haunted name | Purpose |
|---|---|---|
| Today | The Hall | Today's priorities, due/overdue and next seven days |
| All commitments | The Archive | Searchable full list |
| Recurring | The Clocktower | Recurring bills, subscriptions, renewals and tasks |
| Completed | The Crypt | Completed history |
| Settings | The Keeper's Room | Profile, preferences, sound, accessibility and data controls |

A global **Capture a Whisper** action must be accessible from every main destination.

## 6.2 The Hall — dashboard

Required elements:

- Cinematic environment/header with the mansion silhouette.
- Greeting and a short product line, e.g. "The house remembers everything."
- Today count and due-today list.
- Overdue/Restless section, calm and non-shaming.
- Next seven days/Whispers section.
- Monthly recurring amount summary where amounts exist.
- Quick capture action.
- Clear empty state for a user with no active commitments.

Do not make the hero image consume the entire first viewport. The user must see useful information without scrolling excessively.

## 6.3 The Archive — all commitments

- Search input.
- Category/status/date filters.
- Commitment rows/cards.
- Due date and status visible without opening each item.
- Amount/currency visible when present.
- Clear actions for view/edit/complete.

## 6.4 The Clocktower — recurring

- Group recurring series by category.
- Show frequency and next due date.
- Show known amount/currency.
- Show next few occurrences.
- Provide series edit and pause/archive controls.

## 6.5 The Crypt — completed

- Completed commitments with completion date.
- Search/filter history.
- Restore or duplicate where appropriate.
- A subtle visual motif of resolved spirits, not a graveyard of user failure.

## 6.6 The Keeper's Room — settings

- Profile and locale/timezone.
- Default reminder preferences.
- Notification permission state.
- Audio controls.
- Reduced-motion control.
- Data export.
- Account deletion.
- Privacy and third-party processing disclosures.

## 6.7 Capture flow

Capture modal/page should include:

- Text entry/paste.
- File upload dropzone if enabled.
- Voice option only if actually implemented.
- Processing state that does not freeze the rest of the app.
- Editable proposal form.
- Field-level uncertainty markers.
- Confirm/save and cancel actions.
- Clear explanation that extracted details are suggestions and must be reviewed.

---

# 7. Visual design system — extreme cinematic horror

## 7.1 Creative direction

The user should feel as though they have entered an abandoned Victorian mansion at night. The mansion is occupied by something unseen. Fog drifts through corridors. Candlelight reveals fragments of architecture. Shadows shift at the edge of the screen. A rare apparition may cross a hallway.

The intended feel is premium cinematic supernatural horror, not a playful Halloween sticker pack and not a generic purple-neon cyberpunk dashboard.

**Visual keywords:** haunted manor, Victorian decay, moonlight, fog, candlelight, deep shadow, antique brass, bone ivory, spectral green, distant silhouettes, restrained dread.

The supernatural elements must enhance product meaning and interaction feedback.

## 7.2 Design tokens

Use CSS variables and keep tokens in one source of truth.

| Token | Hex | Use |
|---|---|---|
| `--void` | `#080B0B` | Deepest background |
| `--shadow` | `#101615` | Main surfaces |
| `--haunted-green` | `#19231F` | Secondary surfaces |
| `--ash` | `#777B70` | Muted text |
| `--bone` | `#E9E1CF` | Main text / headings |
| `--spectral` | `#A9BD88` | Positive/highlight states |
| `--candlelight` | `#D8AA66` | Warm highlights and attention |
| `--blood-rust` | `#9C4549` | Errors and urgent status only |
| `--fog` | `#BAC0B5` | Secondary details |
| `--brass` | `#88734E` | Borders and ornaments |

Guidelines:

- Most interface surfaces remain dark and low-saturation.
- Bright colours are rare and purposeful.
- Red means an actual warning or overdue state; it is not decorative.
- Text contrast must remain readable over all backgrounds.
- Main controls use legible contemporary components, not stylised unreadable props.

## 7.3 Typography

Recommended fonts:

- **Cormorant Garamond** for large atmospheric headings and editorial display.
- **DM Sans** for application UI, forms, navigation and readable body text.
- **IBM Plex Mono** for dates, times, IDs and numeric metadata.

If using hosted fonts, configure sensible local/system fallbacks and avoid blocking first render.

## 7.4 Environment layers

Build one coherent environment and reuse it across screens:

1. Base void background.
2. Main haunted manor silhouette (existing original SVG may be reused after provenance confirmation).
3. Dark forest/architecture silhouette.
4. Fog layers with slow movement.
5. Vignette and shadow layers.
6. Fine grain/aged texture.
7. Small light sources such as windows, candles or lanterns.
8. Rare drifting particles/ash.

The environment must sit behind content. Form fields and text should use solid or sufficiently opaque surfaces.

## 7.5 Lighting and composition

- Candlelight can illuminate section edges or a primary action.
- Spectral green can identify active/positive states.
- Moonlight can create depth in the background.
- Use shadows and layered depth, not excessive neon glow.
- Keep the visual focal point behind or around, not directly on top of, the main content.
- Avoid large looping videos unless performance is measured and the video is properly licensed.

## 7.6 Signature state changes

The environment may reflect workload in a calm, non-punitive way:

| State | Meaning | Visual treatment |
|---|---|---|
| Calm | No overdue commitments; manageable upcoming load | Stable light, lighter fog |
| Watchful | Several commitments approaching | More visible drifting fog, subtly moving light |
| Restless | One or more overdue commitments | Slightly deeper shadow and restrained red warning accents |

State calculation should be deterministic and documented. Do not use AI to infer or label a user's emotional state.

## 7.7 Interaction choreography

| User action | Feedback |
|---|---|
| Open app | Mansion gradually reveals itself; no forced audio |
| Add commitment | Wax-seal/paper/soft candle ignition animation |
| Save a captured proposal | Short seal-stamp confirmation |
| Complete an item | Item dissolves/fades into spectral particles, then enters Crypt |
| Undo completion | Item returns with a brief reverse animation |
| Open Clocktower | Antique clock/pendulum motif |
| Overdue item | Clear status label plus restrained red edge/glow |
| Complete all current items | Environment becomes calmer; no loud celebratory effect |
| Hidden Easter egg | Rare distant laugh or apparition, only after sound activation |

Always provide a visible textual result. Animation alone cannot communicate success/failure.

## 7.8 Audio direction

Audio layers:

- Low room tone / distant wind.
- Optional distant thunder or creaking wood.
- Very subtle ambience, mixed low.
- Short interaction effects: paper, wax seal, faint bell, soft whisper.
- Rare Easter egg: distant laugh, not a routine action sound.

Rules:

- Sound is off by default on first visit.
- Do not autoplay audible audio before user activation.
- Expose ambient and interaction sound toggles separately.
- Provide volume control and persist the preference.
- Never use sound as the only notification signal.
- Avoid startling volume spikes.
- Provide a complete experience with sound muted.
- Prefer original Web Audio tones or properly licensed effects.
- Maintain `docs/ASSET-REGISTER.md` with source, creator, licence, date acquired and where the asset is used.
- Do not use copyrighted music in the submission video unless permission is documented.

## 7.9 Motion and horror intensity

Extreme horror means strong cinematic atmosphere, not aggressive motion or inaccessible effects.

- Use slow fog and light movement.
- Use short, purposeful action transitions.
- No flashing above safe thresholds.
- No forced jump scares.
- No controls that move away from the pointer or keyboard focus.
- No shaking content that prevents reading.
- Honour `prefers-reduced-motion` and the in-app reduced-motion setting.
- In reduced-motion mode, use static environment artwork and instant or simple opacity transitions.
- All essential meaning must be available in text and state labels.

## 7.10 Responsive requirements

Desktop:

- Full environment and navigation rail/sidebar.
- Main content width controlled for readability.
- Atmosphere can be richer where screen space permits.

Tablet:

- Condensed navigation.
- Avoid horizontal overflow.
- Maintain readable cards and date controls.

Mobile:

- Mobile-first layout; no desktop UI squeezed into a narrow column.
- Bottom navigation or an accessible compact navigation pattern.
- Quick capture always reachable.
- Touch targets large enough for comfortable interaction.
- Reduce decorative layers if they hurt performance.
- No hover-only functionality.

---

# 8. Technical architecture

## 8.1 Architecture principles

- Prefer a modular monolith over microservices.
- Keep business rules out of React components.
- Keep external providers behind adapters.
- Keep AI extraction separate from persistence and scheduling.
- Make recurring occurrence generation deterministic and idempotent.
- Treat PostgreSQL as the deployed system of record.
- Never rely on an open browser tab as the only scheduler.
- Keep the current prototype working while migrating incrementally.

## 8.2 Recommended target stack

The current prototype is a Next.js application. Preserve and evolve it.

| Layer | Recommended choice | Purpose |
|---|---|---|
| Web | Next.js App Router + React + TypeScript | Responsive application/PWA |
| Styling | Tailwind CSS + CSS variables | Design tokens and layout |
| UI primitives | Existing components; shadcn/ui only where useful | Accessible controls |
| Animation | Motion for React + CSS/SVG | Transitions and atmosphere |
| Interactive art | Rive or Lottie selectively | Stateful ghosts/props if justified |
| API | NestJS modular monolith | Domain/API boundaries |
| Database | PostgreSQL | Users, commitments, occurrences, reminders |
| ORM | Prisma | Schema and migrations |
| Queue | Redis + BullMQ | Background extraction/notification jobs |
| Validation | Zod at API/client boundaries where suitable | Input/schema validation |
| Tests | Vitest or Jest, Testing Library, Playwright | Unit/integration/E2E |
| Property testing | fast-check | Date/recurrence invariants |
| File storage | Private S3-compatible storage or local dev adapter | User uploads |
| OCR | Provider adapter; use a lightweight OCR path only if feasible | Image/PDF text extraction |
| AI | Provider-neutral structured-output adapter | Extraction proposals |
| PWA | Web manifest + service worker | Installability and optional push |
| Deployment | Docker-compatible production deployment | Repeatable release |

Do not add a technology merely to make the stack look impressive. If a choice adds more risk than user value, document the alternative and seek approval before changing the recommendation.

## 8.3 Suggested repository organisation

Kiro must inspect the current repository and propose the smallest safe migration. The following is a target shape, not permission to move every file at once:

```text
/
├── apps/
│   ├── web/                  # Next.js frontend
│   └── api/                  # NestJS modular API and worker entrypoints
├── packages/
│   ├── contracts/            # Shared request/response schemas and types
│   └── domain/               # Pure commitment/date/recurrence domain rules
├── prisma/                  # Schema and migrations, if shared at root
├── public/                   # PWA manifest, original/static visual assets
├── docs/
│   ├── ARCHITECTURE.md
│   ├── IMPLEMENTATION-AUDIT.md
│   ├── PRODUCT-STATUS.md
│   ├── ASSET-REGISTER.md
│   ├── PRIVACY-NOTES.md
│   └── RELEASE-CHECKLIST.md
├── .kiro/
│   ├── steering/
│   ├── specs/
│   ├── agents/
│   ├── hooks/
│   └── workflows/             # Only if supported/used by current Kiro version
├── docker-compose.yml
├── .env.example
├── README.md
└── LICENSE
```

If the deadline makes a monorepo migration too expensive, retain the current Next.js root and add a clearly bounded API package without moving the existing UI. Kiro must state the trade-off before restructuring.

## 8.4 Logical architecture

```text
User browser / installed PWA
        |
        v
Next.js application
  - screens and components
  - capture/review UI
  - accessibility and preferences
  - API client
        |
        v
NestJS modular API
  - authentication/session validation
  - commitment domain
  - recurrence orchestration
  - capture orchestration
  - attachment metadata
  - user preferences
        |
        +---------------------> PostgreSQL (Prisma)
        |
        +---------------------> Redis / BullMQ
        |                          - recurrence jobs
        |                          - reminders
        |                          - extraction jobs
        |
        +---------------------> Provider adapters
                                   - AI extraction
                                   - OCR
                                   - email / web push
                                   - private object storage
```

## 8.5 Backend modules

- `AuthModule`
- `UsersModule`
- `CommitmentsModule`
- `OccurrencesModule`
- `RecurrenceModule`
- `RemindersModule`
- `NotificationsModule`
- `CaptureModule`
- `AttachmentsModule`
- `PreferencesModule`
- `HealthModule`

Keep it one deployable API unless a separate worker process is justified by the chosen queue architecture.

## 8.6 Database model — initial proposal

### User

- `id`
- `email`
- `passwordHash` or external auth reference
- `displayName`
- `locale`
- `timezone`
- `preferredCurrency`
- `createdAt`
- `updatedAt`

### Commitment

- `id`
- `userId`
- `title`
- `description`
- `type`
- `category`
- `status`
- `dueDate` (date-only)
- `dueTime` (optional local time)
- `timezone`
- `amountMinor` (nullable integer)
- `currency` (nullable ISO code)
- `recurrenceRule` (nullable structured JSON or normalised relation)
- `seriesId` (nullable identifier for recurring series)
- `sourceType`
- `createdAt`
- `updatedAt`
- `completedAt`
- `archivedAt`

### CommitmentOccurrence

- `id`
- `commitmentId` or `seriesId`
- `scheduledDate` (date-only)
- `scheduledTime` (optional)
- `timezone`
- `status`
- `completedAt`
- `createdAt`
- unique key preventing duplicate occurrence generation for the same series/date/time

### Reminder

- `id`
- `userId`
- `commitmentId`
- `occurrenceId` (nullable for one-off where appropriate)
- `channel`
- `scheduledAt`
- `status`
- `providerMessageId` (nullable)
- `attemptCount`
- `lastErrorCode` (sanitised)
- `sentAt`
- `deliveredAt`
- `createdAt`
- unique idempotency key

### Attachment

- `id`
- `userId`
- `commitmentId` (nullable until confirmed)
- `storageKey`
- `originalFilename` (sanitised)
- `mimeType`
- `sizeBytes`
- `processingStatus`
- `retentionUntil`
- `createdAt`

### CaptureProposal

- `id`
- `userId`
- `sourceType`
- `attachmentId` (nullable)
- `proposedData` (validated JSON)
- `reviewNotes`
- `status` (pending_review, confirmed, rejected, expired)
- `createdAt`
- `confirmedAt`

### UserPreference

- `userId`
- `soundEnabled`
- `ambientEnabled`
- `soundVolume`
- `reducedMotion`
- `defaultReminderOffsets`
- `notificationPreferences`
- `updatedAt`

Add audit/event records only where they create concrete value. Avoid storing duplicate sensitive source content without a clear need.

## 8.7 API contract — indicative endpoints

Kiro should refine these as a spec before implementation.

```text
GET    /health
GET    /me
PATCH  /me/preferences

GET    /commitments
POST   /commitments
GET    /commitments/:id
PATCH  /commitments/:id
DELETE /commitments/:id
POST   /commitments/:id/complete
POST   /commitments/:id/restore
POST   /commitments/:id/archive

GET    /commitments/:id/occurrences
POST   /commitments/:id/occurrences/:occurrenceId/complete

POST   /capture/text
POST   /capture/files
GET    /capture/proposals/:id
PATCH  /capture/proposals/:id
POST   /capture/proposals/:id/confirm
POST   /capture/proposals/:id/reject

GET    /reminders
POST   /reminders/:id/snooze
POST   /notifications/test

GET    /export
DELETE /me/data
```

Use consistent pagination, error envelopes, request validation and ownership checks. Do not expose internal provider exceptions or stack traces to the browser.

## 8.8 Authentication

Choose the simplest secure option that is realistic for the project. Prefer a maintained authentication library or managed identity provider over rushed custom cryptography.

Requirements:

- Secure, HTTP-only session cookies or another appropriately secured session mechanism.
- Password hashing using a current, appropriate password-hashing algorithm if passwords are handled directly.
- Rate limits on login and sensitive endpoints.
- CSRF protection where applicable.
- User ownership enforced server-side.
- Demo credentials for judges if login is required.
- A safe way to reset demo data.

Do not make public demo credentials an administrator account. Do not use production user data in the public demonstration.

## 8.9 Background processing

Use background jobs for work that should not block HTTP responses:

- Document/OCR processing.
- AI extraction.
- Recurrence materialisation.
- Reminder dispatch.
- Notification retries.

Jobs must be idempotent. Queue state is not proof of delivery. The database should retain the authoritative reminder/occurrence status.

## 8.10 File storage

- Local adapter for development.
- Private object storage adapter for deployment if documents are enabled.
- Never make private document uploads world-readable.
- Generate short-lived links only where needed.
- Do not store files inside the public web directory.

## 8.11 AI provider adapter

Create a small provider interface so the application is not coupled to one model provider.

Responsibilities:

- Accept extracted text and user locale/timezone context.
- Return a schema-constrained `CommitmentProposal`.
- Include uncertainty/missing fields.
- Never directly create or update commitments.
- Expose clear errors for timeout, unavailable provider, rate limit and invalid output.

Start with one provider only. Do not build multi-provider routing for the hackathon.

---

# 9. Security, privacy and trust

Commitment details and attachments can contain personal information. Treat them as private by default.

Minimum requirements:

- Authentication and authorisation for private records.
- Server-side ownership checks on every record operation.
- Secure password/session handling.
- HTTPS in deployment.
- Validate and limit all input sizes.
- Rate limit capture and authentication endpoints.
- Restrict uploads by size, type and content signature.
- Use private storage for uploads.
- Avoid logging raw document contents, full message text, secrets or personal data.
- Keep API keys and secrets in environment variables/secret storage.
- Add `.env*` to `.gitignore`, but keep `.env.example` with placeholders.
- Give users a clear explanation before sending personal content to an external extraction provider.
- Require explicit confirmation before saving extracted proposals.
- Provide data export and deletion workflows.
- Define retention for uploads and failed processing jobs.
- Keep sample data fictional.

For South African use, review POPIA obligations with qualified guidance before a public commercial launch. Do not claim legal compliance based solely on this project brief. For international availability, review relevant local privacy requirements before marketing to specific countries.

---

# 10. Testing and quality strategy

Testing is part of implementation, not a final-day activity.

## 10.1 Unit tests

Cover:

- Date parsing.
- Money parsing and minor-unit conversion.
- Category inference.
- Recurrence rule validation.
- Occurrence generation.
- Monthly schedules near month end.
- Leap-year schedules.
- Timezone and daylight-saving edge cases.
- Reminder-offset calculation.
- Proposal schema validation.
- Commitment status transitions.
- User ownership/service guards.

## 10.2 Property-based tests

Use `fast-check` or an equivalent property-based testing library where it adds value.

High-value properties:

- Generated occurrences are monotonically increasing.
- No duplicate occurrence exists for one series and scheduled date/time.
- Occurrences never precede the recurrence start date.
- Finite recurrence never generates after its end date.
- Re-running occurrence materialisation produces no duplicates.
- Completing an occurrence does not complete its parent series.
- Invalid or ambiguous extraction cannot create a commitment automatically.
- Amount parsing never changes the decimal value through floating-point conversion.
- A user cannot access another user's commitment by changing an identifier.

Use Kiro's Correctness/property-based testing workflow in the IDE if available in the installed version. Record what was actually generated, run and fixed.

## 10.3 Integration tests

Cover:

- API + database commitment lifecycle.
- Recurring series generation.
- Reminder creation/reschedule/cancel.
- Capture proposal and confirmation.
- Attachment processing failure path.
- Auth and ownership.

## 10.4 End-to-end tests

Use Playwright for:

1. Open application and navigate all sections.
2. Create a task manually.
3. Edit and complete it.
4. Create a recurring bill.
5. Capture text and review the proposal.
6. Confirm the proposal and verify dashboard/Clocktower state.
7. Test sound preferences and reduced motion.
8. Test a narrow mobile viewport.
9. Test keyboard navigation and visible focus.
10. Test the public judge demo flow.

## 10.5 Visual regression and accessibility

- Capture screenshots for desktop and mobile.
- Check no text is covered by environment effects.
- Check all controls are keyboard reachable.
- Check labels and form errors are announced appropriately.
- Check contrast for text and status indicators.
- Check `prefers-reduced-motion` and in-app preference.
- Verify there is no forced audio.
- Keep a small set of approved reference screenshots in `docs/visual-regression/` or another documented location.

## 10.6 Performance

- Lazy-load decorative assets where appropriate.
- Avoid large unoptimised background video.
- Use compressed SVG/WebP/AVIF assets where suitable.
- Keep animations GPU-friendly and modest.
- Do not run expensive OCR/LLM processing on the request thread.
- Monitor mobile loading and layout shifts.
- Remove unused dependencies and large asset files.

## 10.7 Release quality gates

Before a phase is marked complete:

- Relevant unit/integration/E2E tests pass.
- Lint passes.
- Typecheck passes.
- Production build passes.
- `docs/PRODUCT-STATUS.md` is accurate.
- No known critical/high severity defect remains without explicit owner/decision.
- No feature is labelled complete if it is only mocked.

---

# 11. Kiro development strategy — required working method

Use current Kiro capabilities as documented for the installed version. Kiro's interface and configuration may change; validate generated `.kiro` files inside the actual Kiro environment before relying on them.

## 11.1 Specs — the source of truth for implementation

Create or refine these Feature Specs. Every feature spec should use the Kiro structure:

- `requirements.md`: user stories and measurable acceptance criteria.
- `design.md`: architecture, data flow, edge cases, error handling and testing design.
- `tasks.md`: small executable tasks with dependencies and outcomes.

Recommended spec set:

1. `product-foundation` — product scope, auth, settings and app shell.
2. `commitment-domain` — create/edit/complete/archive/search.
3. `recurrence-engine` — recurrence semantics and occurrence materialisation.
4. `reminders-and-notifications` — scheduling, delivery, retries and user controls.
5. `intelligent-capture` — text/document input, extraction proposal and review.
6. `cinematic-experience` — mansion, visual system, sound, animation and responsive design.
7. `pwa-and-mobile` — installability, caching and optional share target/push.
8. `privacy-and-security` — file handling, user isolation, consent and deletion.
9. `release-and-demo` — testing, deployment, judge mode and submission evidence.

Do not generate all tasks into one enormous spec. Keep each spec small enough to review and execute. Use parallel task execution only when file ownership and dependencies are clear.

## 11.2 Steering — persistent project knowledge

Keep project steering in `.kiro/steering/` and commit it.

Recommended files:

- `product.md` — product promise, target users, out-of-scope items and language.
- `architecture.md` — modules, layers, data ownership and integration boundaries.
- `tech.md` — actual stack, commands, versions and coding conventions.
- `visual-design.md` — tokens, composition, typography, horror rules and accessibility.
- `security.md` — privacy, auth, uploads, LLM consent and secret handling.
- `testing.md` — test pyramid, property invariants and release gates.
- `competition.md` — Kiroween rules, provenance, demo and submission constraints.

Use `inclusion: always` for the few standards needed in every interaction. Use `fileMatch` for frontend/backend/test-specific guidance, `auto` for contextual docs and `manual` for long release or troubleshooting guides. Avoid loading every document into every prompt.

When a custom agent needs steering context, explicitly include the relevant steering file resources in that agent configuration; do not assume it inherits all steering automatically.

## 11.3 Custom agents and delegated work

Use bounded agents with clear file ownership. Do not let multiple agents rewrite the same files concurrently.

Suggested agents:

### `product-architect`

- Owns product scope, architecture decisions and spec consistency.
- Reads product/architecture/competition steering.
- Reviews spec dependencies and scope creep.
- Does not implement broad code changes unless assigned.

### `domain-engineer`

- Owns commitment models, validation, dates, recurrence and persistence contracts.
- Writes domain-level tests.
- Does not alter the haunted visual system.

### `api-engineer`

- Owns NestJS modules, endpoints, Prisma integration, auth guards and worker boundaries.
- Must enforce user ownership and input validation.
- Does not introduce microservices without approval.

### `experience-engineer`

- Owns Next.js components, CSS, responsive design, animation, sound and accessibility.
- Preserves the cinematic identity.
- Does not place business rules inside presentation components.

### `capture-engineer`

- Owns parser/OCR/LLM adapters and proposal validation.
- Never persists model output without user confirmation.
- Must test ambiguous and malformed input.

### `quality-guardian`

- Independent reviewer for functionality, security, privacy, accessibility and release readiness.
- Finds and reports defects with file/line evidence.
- Does not mark features complete based on appearance alone.

### `release-guardian`

- Owns deployment checklist, public demo verification, demo reset, documentation and submission assets.
- Must verify public endpoints and actual judge flow.

If Kiro Crew is used for parallel execution, set explicit responsibilities and shared checkpoints. A human integrator remains responsible for merge/review.

## 11.4 Hooks — useful event-driven quality checks

Use workspace hooks under `.kiro/hooks/*.json`. Current Kiro documentation describes standalone JSON hook files with `version: "v1"`, a `hooks` array, PascalCase trigger names and command/agent actions. Have Kiro validate the exact schema and trigger availability in the installed version.

Recommended hooks:

1. **TypeScript/TSX save check:** targeted lint or a lightweight validation when relevant files are saved. Avoid running the full test/build suite on every keystroke or save.
2. **Test-file save check:** run the relevant unit test when a domain/test file changes, if the hook can target it safely.
3. **Agent stop/release check:** remind the agent to run the release quality commands and update spec/status files before declaring a task complete.
4. **Risk gate:** require user approval for destructive migrations, production data changes, secret handling or deployment actions. Use Kiro permissions as well as hooks where appropriate.

Hooks must be useful, fast and reliable. A hook that constantly fails or runs expensive commands will be disabled; tune it and record the final configuration.

## 11.5 MCP — connect tools only where they add real capability

MCP should improve the development process, not be added as decoration.

Recommended first MCP integration:

- A maintained Playwright/browser automation MCP server for Kiro to navigate the running app, exercise user journeys, inspect console errors and capture screenshots.

Possible second integration if needed:

- A read-only development database MCP connection for inspecting local test data. Never point an unrestricted agent tool at production data.

Optional stretch:

- Create a small project-specific QA MCP server with safe tools such as `run_unit_tests`, `run_e2e_smoke`, `validate_asset_register` and `check_design_tokens`. Do not expose unrestricted shell, file deletion or production database mutation as MCP tools.

Document:

- MCP server name and source.
- Version and installation method.
- Tools actually used.
- What Kiro accomplished with each tool.
- Security/permission boundaries.

## 11.6 Powers — on-demand expertise

Review the current Kiro Powers catalog. Install only a relevant Power that actually supports a chosen technology/workflow (for example database, framework, deployment or testing guidance). Do not install Powers merely to increase the count.

A Power can bundle tools, skills and specialist knowledge; document which capability it supplied and how it improved the build. If no available Power is useful, explain that decision rather than inventing usage.

Do not confuse a Power with ordinary steering or a standalone MCP server.

## 11.7 Kiro Crew — optional, not required for Costume Contest

Kiro Crew is a persistent agent environment with sessions, task execution, sub-agent delegation and scheduling capabilities. It may be used to coordinate longer-running QA/release work, but it is not required to deliver the Costume Contest application.

Do not claim eligibility for the separate **Best Kiro Crew App** bonus unless a distinct, newly built Crew application and public GitHub repository are actually submitted as required by the rules. Do not spend core product time building an unrelated Crew app just to tick a box.

## 11.8 Kiro evidence log

Create `docs/KIRO-USAGE-LOG.md` and update it throughout development.

For every material Kiro-assisted milestone, record:

- Date.
- Kiro surface (IDE, CLI, Web or Crew).
- Feature used (Spec, Steering, Hook, custom agent, MCP, Power, Correctness/PBT, etc.).
- Task performed.
- Files/specs changed.
- Tests/checks run and actual result.
- What the human reviewed or changed.
- Any failure or lesson learned.

Capture genuine screenshots or short recordings of Kiro's Specs, task execution, agent delegation, hooks, MCP and testing. Do not fabricate evidence or present a configuration file as proof that a feature ran.

---

# 12. Phased implementation roadmap

**Planning date:** Friday, 13 November 2026.  
**Official deadline:** Friday, 4 December 2026 at 2:00 PM Pacific Time.  
**South African local deadline:** Saturday, 5 December 2026 at 00:00 SAST.  
**Recommended internal freeze:** Friday, 4 December at 18:00 SAST or earlier.  
**Rule:** Submission before the final hour. Do not plan to upload at midnight.

The phases below are deliberately aggressive. If any phase slips, remove stretch features; do not reduce testing, accessibility or submission readiness.

## Phase 0 — Repository audit and Kiro activation

**Target:** 13–14 November  
**Goal:** Understand what already exists, activate authentic Kiro workflows and freeze scope.

Tasks:

- Open the existing repository in Kiro.
- Verify workspace trust and that `.kiro/` is visible and tracked.
- Run install, lint, typecheck, tests and build where possible.
- Create `docs/IMPLEMENTATION-AUDIT.md`.
- Confirm the existing prototype boundary: local storage, manual CRUD, recurrence metadata, deterministic text parser, Web Audio tones, no production API/database/real reminder delivery/connected AI unless subsequently verified.
- Refine all steering documents.
- Validate custom agent format and explicit resource inclusion.
- Validate the existing hook format and adjust for performance.
- Create `docs/KIRO-USAGE-LOG.md`.
- Create the first three Feature Specs: product foundation, commitment domain, cinematic experience.
- Freeze the MVP scope and write a non-goals list.

Exit criteria:

- A reproducible audit exists.
- Current tests and limitations are known.
- Specs have reviewed requirements/design/tasks.
- No critical uncertainty remains about what is already implemented.
- Kiro is used for the next implementation tasks, not just configured.

## Phase 1 — Product foundation and persistence

**Target:** 15–17 November  
**Goal:** Replace prototype-only assumptions with a stable product foundation.

Tasks:

- Decide and document the smallest viable backend structure.
- Create database schema and first migration.
- Add user/session strategy and demo account path.
- Add API health endpoint.
- Add commitment repository/service boundaries.
- Connect the frontend to the API without breaking the current visual shell.
- Add seed data with fictional South African and international examples.
- Add export and safe demo reset.
- Add basic server-side validation and ownership rules.

Exit criteria:

- A demo user can load commitments from persistent storage.
- Create/edit/delete/complete flows persist across reloads.
- User data is isolated.
- Database migrations run reproducibly.
- Existing visual identity survives the backend integration.

Fallback if the full backend cannot be completed safely: retain a clearly labelled local-only demo, finish core product behaviour and do not claim cloud sync or multi-device support. Record the trade-off.

## Phase 2 — Commitment lifecycle and recurring domain

**Target:** 18–20 November  
**Goal:** Make commitments reliable and make recurrence correct.

Tasks:

- Finalise commitment types and validation.
- Implement list/detail/create/edit/complete/restore/archive/delete.
- Implement search and filters.
- Implement recurrence master schedules and occurrence records.
- Implement one-occurrence vs series semantics.
- Handle month-end and leap-year rules.
- Add timezone-aware date logic.
- Add unit, integration and property-based tests.
- Add Clocktower upcoming occurrence view.

Exit criteria:

- Recurrence produces correct, deterministic occurrences.
- Generation is idempotent.
- Editing one series does not corrupt completed history.
- No date shifts caused by UTC/local-time mistakes in supported cases.
- Tests prove important recurrence invariants.

## Phase 3 — Reminder engine and notification delivery

**Target:** 21–23 November  
**Goal:** Make THE HAUNT dependable outside an open browser tab.

Tasks:

- Define reminder offsets and channels.
- Add reminder records and delivery states.
- Add BullMQ/Redis worker if the infrastructure is available and stable.
- Make job scheduling/rescheduling/cancellation idempotent.
- Implement in-app notification centre.
- Add one real delivery channel if time permits (prefer PWA push or email, not both at the expense of reliability).
- Add a test notification flow.
- Verify reminder delivery in a deployed test environment.

Exit criteria:

- A test reminder is scheduled and processed.
- The resulting status is accurate.
- Updating/deleting a commitment cancels or changes its reminders correctly.
- Failed delivery does not appear as delivered.
- The user can control reminder preferences.

## Phase 4 — Intelligent capture

**Target:** 24–26 November  
**Goal:** Deliver the signature non-manual input journey.

Tasks:

- Define and validate the `CommitmentProposal` schema.
- Improve deterministic parser coverage and edge-case handling.
- Add one structured-output LLM provider adapter if credentials and budget are available.
- Add text/paste capture first.
- Add proposal review UI and explicit confirmation.
- Add amount/currency/date/recurrence uncertainty indicators.
- Add image/PDF upload only if secure processing can be completed.
- Add OCR path and extraction job if feasible.
- Add privacy/third-party processing disclosure and consent.
- Add error/timeout/fallback behaviour.

Exit criteria:

- Pasted text generates an editable proposal.
- Ambiguous dates/amounts remain unresolved instead of being invented.
- Proposal is not saved until user confirms.
- Provider failure leaves a usable manual fallback.
- Demo uses fictional source content.

## Phase 5 — Cinematic experience and PWA polish

**Target:** 27–29 November  
**Goal:** Make the visual experience exceptional and coherent across devices.

Tasks:

- Audit all screens against the design specification.
- Refine the haunted manor artwork/environment.
- Refine fog, candlelight, lighting, shadows and texture layers.
- Implement meaningful state-driven environmental changes.
- Polish interaction choreography for create/complete/undo/overdue.
- Implement audio toggles, volume and persistent preferences.
- Keep audio off by default.
- Implement reduced-motion mode and keyboard/focus behaviours.
- Refine mobile navigation and responsive layout.
- Implement PWA manifest/installability.
- Consider a share target or push only after core PWA behaviour is stable.
- Run visual screenshots on desktop, tablet and mobile.

Exit criteria:

- All five main destinations feel like one designed product.
- Horror elements are not random or purely decorative.
- The product remains usable with sound/motion off.
- Mobile layouts are clean.
- No overlays hide text or controls.
- Loading, error, empty and success states are designed.

## Phase 6 — Integration, QA, privacy and deployment hardening

**Target:** 30 November–2 December  
**Goal:** Make the project installable, demonstrable and trustworthy.

Tasks:

- Run full lint, typecheck, unit, integration, E2E and production build.
- Use Playwright MCP or browser testing from Kiro to test the actual deployed UI.
- Run property-based tests for recurrence and parsing invariants.
- Review authentication and ownership boundaries.
- Review upload validation and external AI consent.
- Review logs for PII/secrets.
- Verify export and deletion.
- Test notification delivery and failure states.
- Add `LICENSE` and check all asset licences.
- Prepare public GitHub repository.
- Ensure `.kiro/` is tracked and not ignored.
- Deploy to a stable public URL.
- Add judge demo credentials and reset instructions.
- Test the full judge flow from a clean browser session.
- Confirm the deployed service can remain accessible through the judging period ending 29 January 2027.

Exit criteria:

- Clean production build.
- Public demo works.
- Public GitHub repository has source, assets, instructions and open-source license.
- `.kiro/` is in repository root and included in Git.
- All known limitations are documented honestly.
- Judges can test without paying or requesting access.

## Phase 7 — Submission, video and final freeze

**Target:** 3–4 December  
**Goal:** Submit a clear, complete, memorable entry before the cutoff.

Tasks:

- Freeze features; only fix critical defects.
- Record the final demo video under three minutes.
- Upload it to YouTube with public visibility.
- Confirm the video shows the real application running on its intended platform.
- Remove third-party trademarks/copyrighted music unless permission exists.
- Prepare concise Devpost description and feature list.
- Prepare Kiro usage write-up using the actual usage log.
- Add source repository, live demo URL and judge instructions.
- Verify category is Costume Contest.
- Save a Devpost draft early.
- Submit before the internal freeze.
- Check that the submission is actually submitted, not only saved as a draft.

Exit criteria:

- Submission confirmation visible on Devpost.
- All links open publicly.
- Video plays and is under three minutes.
- App remains available for judging.

---

# 13. Kiro execution prompts

Use these as starting prompts inside Kiro. Adapt after the repository audit; do not paste every prompt at once.

## Prompt 0 — audit first, no coding

```text
You are the engineering lead for THE HAUNT. Read KIRO-MASTER-BRIEF.md, README.md, docs/ and the complete .kiro directory. Inspect the actual source code and run all existing checks that are possible. Do not modify application code yet.

Create docs/IMPLEMENTATION-AUDIT.md. Separate verified implementation, UI-only/scaffolded implementation, incomplete implementation, and unverified behaviour. Specifically verify persistence, recurrence semantics, reminder delivery, capture parsing, audio, reduced motion, responsiveness, tests, PWA status and backend status. Identify what can be reused and the smallest safe implementation path to the MVP. Report risks, proposed specs and any scope conflicts. Do not claim Kiro has implemented anything merely because a .kiro file exists.
```

## Prompt 1 — Kiro configuration and specs

```text
Use the repository audit and KIRO-MASTER-BRIEF.md to refine the project-level Kiro setup. Validate the current Kiro configuration schema against the installed Kiro version. Ensure .kiro/ remains tracked. Refine steering with appropriate inclusion modes, custom agents with explicit resources, and fast useful hooks. Create/review Feature Specs with requirements.md, design.md and tasks.md for product-foundation, commitment-domain, recurrence-engine, reminders-and-notifications, intelligent-capture, cinematic-experience, pwa-and-mobile, privacy-and-security and release-and-demo. Keep tasks small, testable and sequenced. Do not implement the entire project in one pass.
```

## Prompt 2 — domain and persistence

```text
Implement Phase 1 and the relevant commitment-domain spec. Preserve the current visual experience. Establish validated domain types and a persistence boundary first. Implement the smallest secure backend/database approach that fits the repository. Ensure every commitment read/write enforces user ownership. Add migrations and fictional demo seed data. Add tests before marking tasks complete. Do not implement recurrence or reminder scheduling as a shortcut inside React components.
```

## Prompt 3 — recurrence correctness

```text
Implement the recurrence-engine spec. Model recurring commitments as a series/master rule and individual occurrences. Define month-end, leap-year, timezone and daylight-saving semantics explicitly. Make occurrence generation idempotent. Add example-based and property-based tests for monotonicity, uniqueness, start/end boundaries, month-end and leap-year behaviour. Do not use fixed millisecond arithmetic for calendar recurrence. Do not change completed historical occurrences when editing a future series.
```

## Prompt 4 — reminders

```text
Implement reminders-and-notifications. The database is the source of truth; queue jobs are execution mechanisms. Make jobs idempotent and cancel/reschedule them when a commitment changes. Implement an in-app notification centre and one verified external delivery channel if time permits. Distinguish queued, attempted, sent, delivered, failed and cancelled states where supported. Never tell the user a reminder was delivered unless the provider confirms it. Add failure/retry tests and a test notification UI.
```

## Prompt 5 — intelligent capture

```text
Implement intelligent-capture as a proposal/review workflow. Start with text/paste capture. Define a strict runtime schema for CommitmentProposal. Keep deterministic parsing separate from LLM-backed extraction. Never invent missing dates, amounts, currencies or recurrence. Display uncertainty and require user confirmation before persistence. Add provider timeout, malformed output, rate-limit and unavailable-provider fallbacks. Add file/OCR processing only after upload validation, privacy consent, private storage and cleanup are designed and tested.
```

## Prompt 6 — cinematic art direction

```text
Implement cinematic-experience against KIRO-MASTER-BRIEF.md and .kiro/steering/visual-design.md. Preserve functional usability. The visual direction is extreme cinematic supernatural horror: haunted Victorian manor, moonlight, fog, candlelight, deep shadow, antique surfaces and rare supernatural motion. Use coherent layered environment assets and design tokens, not a collection of unrelated Halloween stickers. Make supernatural transitions meaningful for add/complete/overdue states. Sound must be off by default, controllable and never required. Honour reduced motion, keyboard access and mobile layouts. Do not sacrifice contrast or form usability.
```

## Prompt 7 — independent QA

```text
Act as the independent quality guardian. Review the actual implementation against the specs and KIRO-MASTER-BRIEF.md. Do not assume a feature works because it looks complete. Run lint, typecheck, unit, integration, E2E, property-based and production build checks where available. Use browser automation/MCP to test the real UI. Review security, ownership, dates, recurrence, reminder status, upload handling, AI confirmation, accessibility, reduced motion, sound controls and mobile responsiveness. Return findings by severity with file/line evidence and smallest safe fixes.
```

## Prompt 8 — release readiness

```text
Prepare THE HAUNT for Kiroween submission. Verify the official current rules and deadline. Verify that .kiro/ exists at the root and is committed; inspect .gitignore. Verify LICENSE and third-party asset licences. Verify public GitHub repository, deployed demo, judge credentials/reset instructions, source completeness and deployment stability. Verify the public YouTube video is under 3 minutes and contains real application footage. Draft the Kiro usage write-up from docs/KIRO-USAGE-LOG.md only; do not invent usage. Create docs/RELEASE-CHECKLIST.md and list every incomplete item honestly.
```

---

# 14. Demo data and scripted product story

Use fictional demo data only.

Suggested South African demo account commitments:

| Commitment | Type | Amount | Due | Recurrence |
|---|---|---:|---|---|
| Fibre account | Bill | R899.00 | 25 November 2026 | Monthly |
| School fees | Bill | R1,850.00 | 1 December 2026 | Monthly |
| Vehicle licence renewal | Renewal | — | 18 March 2027 | Annual (only if supported) |
| Streaming membership | Subscription | R99.00 | 28 November 2026 | Monthly |
| Dentist appointment | Appointment | — | 20 November 2026 | Once-off |
| Service the car | Task | — | 30 November 2026 | Once-off |

Use plausible but fictional provider names. Do not use real logos or third-party marks without permission.

## Recommended live demo sequence

1. Open the mansion dashboard and orient the viewer in a sentence.
2. Show today's commitments and upcoming items.
3. Paste a fictional reminder/bill message into Capture a Whisper.
4. Show the extracted proposal and uncertainty handling.
5. Confirm it and show it in The Hall and The Clocktower.
6. Open a recurring item and show next occurrence(s).
7. Trigger or demonstrate a test reminder with accurate status.
8. Complete an item; show the spectral completion and Crypt history.
9. Briefly demonstrate sound/reduced-motion controls.
10. Close with the product promise.

Do not spend precious video time on login, settings tours or architecture diagrams. Show the product working.

---

# 15. Kiroween submission strategy and compliance

**Target category:** Costume Contest.

The official rules require a working application built using Kiro (IDE, CLI, Web and/or Kiro Crew). Insufficient Kiro use can result in disqualification. The work must be new and created during the official submission period (30 October–4 December 2026). Review the official rules before submission: https://kiroween.devpost.com/rules

## Required submission components

- Working application URL.
- Clear text description of features and functionality.
- Public YouTube demonstration video under three minutes.
- Video must show the real app running on its intended platform.
- Public GitHub repository URL (not GitLab/Bitbucket).
- Repository must contain source code, assets and instructions.
- Repository must have a visible open-source license.
- Repository must contain `.kiro/` at the project root.
- `.kiro/` must not be ignored by `.gitignore`.
- Judge credentials and testing instructions if login is required.
- Kiro usage write-up explaining how Kiro capabilities materially influenced development.
- Project must remain available for free judge evaluation through the judging period, which ends 29 January 2027.

## Deadline conversion

Official deadline: Friday, 4 December 2026, 2:00 PM Pacific Time. In South Africa (SAST, UTC+2), this is **Saturday, 5 December 2026, 00:00**. Use the earlier internal freeze; do not target the converted midnight.

The official Kiro credit request deadline is Tuesday, 1 December 2026, 12:00 PM Pacific Time, which is **Tuesday, 1 December 2026, 22:00 SAST**. Request credits before this cutoff if eligible and needed.

## Judging criteria — equal weighting

| Criterion | Weight | How THE HAUNT should demonstrate it |
|---|---:|---|
| Potential Impact | 20% | Real daily problem; practical life-admin use cases; clear demo of saved effort and reduced missed commitments |
| Technological Implementation | 20% | Meaningful Kiro Specs, Steering, Hooks, agents, MCP/Power where useful, robust domain logic, tests and evidence |
| Design | 20% | Cohesive haunted mansion identity, accessible interaction, polished mobile/desktop UI, meaningful animations/audio |
| Innovation/Idea | 20% | Capture-to-commitment workflow, recurrence/reminder correctness and state-responsive horror environment |
| Presentation | 20% | Under-three-minute end-to-end product demo, clear story, actual working app and memorable visual reveal |

## Kiro write-up must answer

- Which Kiro surfaces were used (IDE, CLI, Web, Crew) and why?
- How Specs structured requirements/design/tasks and improved iteration.
- Which custom agents were created and what bounded work they performed.
- Which Hooks automated real workflows and how they improved reliability.
- How Steering changed consistency and reduced repetitive prompting.
- Which MCP servers were connected, what tools they exposed and what was accomplished.
- Which Powers were used and what specialist knowledge/tooling they supplied.
- Whether property-based testing found issues that example-based tests missed.
- What changed compared with unstructured prompting/vibe coding.

Write this from the actual Kiro usage log and captured evidence.

## Optional bonus opportunities — only if genuinely eligible

- **Blog Post Bonus:** public blog post about Kiro and the project, published during the submission period, explicitly stating it is part of Kiroween 2026.
- **Social Blitz:** public social post must begin with `#KiroweenHackathon26`, describe a favourite Kiro feature and how it changed the development approach, and be linked in the submission.
- **Best Demo:** prioritise a memorable, clear video; this bonus depends on judging rank and is not guaranteed.
- **Best Kiro Crew App:** only relevant if a separate qualifying Kiro Crew app is newly built, has a public GitHub repo and is described as required. Do not mistake use of custom agents for eligibility.
- **Startup/Student/Ghost of Kiroween Past:** pursue only if the entrant genuinely meets the eligibility conditions and can provide accurate information.

## Project provenance and new-project rule

The current prototype archive was assembled on **13 November 2026**, within the stated submission period. Its initial scaffold was generated with ChatGPT assistance outside Kiro. Do not attribute that initial scaffold to Kiro. If the archive is used, accurately record this provenance and describe the actual subsequent Kiro work in `docs/KIRO-USAGE-LOG.md` and the Devpost write-up.

Do not incorporate code, assets or substantial project work created before 30 October 2026 unless the rules' disclosure requirement is followed and eligibility is confirmed. If any earlier drafts or assets are reused, document exactly what they were, when they were created and how they were used. Do not disguise reused work as new.

---

# 16. Definition of done

THE HAUNT is ready to submit when all applicable items below are verified:

## Product

- [ ] A user understands the purpose within 10 seconds.
- [ ] A user can create and manage commitments.
- [ ] Dates and timezones behave correctly for supported cases.
- [ ] Recurrence is reliable and tested.
- [ ] Reminders behave as advertised and delivery states are truthful.
- [ ] Capture creates a proposal, and user confirmation is required.
- [ ] Search/filter and completed history work.
- [ ] Export and deletion are available or documented as an intentional limitation.

## Design

- [ ] All core screens follow the same visual system.
- [ ] Haunted environment is cinematic and distinctive.
- [ ] Horror interactions reinforce product function.
- [ ] Typography and contrast remain readable.
- [ ] Mobile experience is polished.
- [ ] Sound is off by default and user-controlled.
- [ ] Reduced-motion mode works.
- [ ] Keyboard and screen-reader basics are verified.

## Engineering

- [ ] Lint passes.
- [ ] Typecheck passes.
- [ ] Unit tests pass.
- [ ] Integration tests pass where implemented.
- [ ] E2E smoke tests pass on the deployed app.
- [ ] Production build passes.
- [ ] No critical/high security issue remains unresolved.
- [ ] No secrets or personal data are committed.
- [ ] Database migrations and seed process are reproducible.
- [ ] Logs are useful without leaking sensitive data.

## Kiro

- [ ] Specs exist and show real requirements/design/tasks progression.
- [ ] Steering exists and is actually used.
- [ ] Hooks are valid, enabled and have useful execution evidence.
- [ ] Custom agents are used for bounded real tasks.
- [ ] MCP is used if it contributes real capability; otherwise explain why not.
- [ ] Powers are used if useful; otherwise explain why not.
- [ ] Property-based testing is attempted for high-value invariants.
- [ ] Kiro usage log and screenshots are accurate.
- [ ] `.kiro/` is committed at repository root and not ignored.

## Submission

- [ ] Public GitHub repository exists with source, instructions and license.
- [ ] Public working demo URL exists.
- [ ] Judges can access the demo without payment or private access approval.
- [ ] Judge login/reset instructions are included if required.
- [ ] Demo stays available through the judging period ending 29 January 2027.
- [ ] Public YouTube video is under three minutes and shows the app working.
- [ ] Devpost description and Kiro write-up are complete.
- [ ] Submission is actually submitted before the deadline.

---

# 17. Source-of-truth and reference links

Use official, current documentation as the authority for tool syntax and competition requirements. Re-check pages before final submission because rules and software capabilities can change.

- Kiroween 2026 Official Rules: https://kiroween.devpost.com/rules
- Kiroween 2026 Challenge Page: https://kiroween.devpost.com/
- Kiro — How Kiro works: https://kiro.dev/docs/how-kiro-works/
- Kiro — Specs: https://kiro.dev/docs/specs/
- Kiro — Steering: https://kiro.dev/docs/steering/
- Kiro — Hooks: https://kiro.dev/docs/hooks/
- Kiro — MCP: https://kiro.dev/docs/mcp/
- Kiro — Custom agents: https://kiro.dev/docs/custom-agents/
- Kiro — Powers: https://kiro.dev/docs/powers/
- Kiro Crew quick start: https://kiro.dev/docs/crew/

**Final instruction:** Build a dependable life-admin product wrapped in an exceptional cinematic horror experience. Do not let the theme weaken the product, and do not let the feature list destroy the deadline. Finish the smallest complete experience, prove it works, and make the Kiro engineering story visible and honest.
