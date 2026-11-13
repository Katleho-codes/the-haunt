import type { CommitmentCategory, Recurrence } from "@/lib/types";

export interface CaptureProposal {
  title: string;
  category: CommitmentCategory;
  dueAt: string | null;
  recurrence: Recurrence;
  amount: number | null;
  currency: string;
  description: string;
  confidence: "high" | "medium" | "low";
}

const months: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7,
  sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10,
  dec: 11, december: 11,
};

function findDate(text: string): Date | null {
  const lower = text.toLowerCase();
  const now = new Date();
  if (/\btoday\b/.test(lower)) return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  if (/\btomorrow\b/.test(lower)) return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12);
  const inDays = lower.match(/\bin\s+(\d{1,3})\s+days?\b/);
  if (inDays) return new Date(now.getFullYear(), now.getMonth(), now.getDate() + Number(inDays[1]), 12);
  const iso = lower.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12);
  const numeric = lower.match(/\b(\d{1,2})[/.](\d{1,2})[/.](20\d{2})\b/);
  if (numeric) return new Date(Number(numeric[3]), Number(numeric[2]) - 1, Number(numeric[1]), 12);
  const named = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(20\d{2}))?\b/);
  if (named) {
    const month = months[named[2]] ?? months[named[2].slice(0, 3)];
    let year = named[3] ? Number(named[3]) : now.getFullYear();
    const date = new Date(year, month, Number(named[1]), 12);
    if (!named[3] && date < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      year += 1;
      date.setFullYear(year);
    }
    return date;
  }
  const dayOnly = lower.match(/\b(?:on\s+)?the\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (dayOnly && /\b(monthly|every month|each month)\b/.test(lower)) {
    let year = now.getFullYear();
    let month = now.getMonth();
    if (Number(dayOnly[1]) <= now.getDate()) month += 1;
    if (month > 11) { month = 0; year += 1; }
    return new Date(year, month, Math.min(28, Number(dayOnly[1])), 12);
  }
  return null;
}

export function parseCapture(raw: string): CaptureProposal {
  const text = raw.trim();
  const lower = text.toLowerCase();
  const due = findDate(text);
  const recurrence: Recurrence = /\b(fortnightly|every two weeks|every 2 weeks)\b/.test(lower)
    ? "fortnightly"
    : /\b(weekly|every week)\b/.test(lower)
      ? "weekly"
      : /\b(quarterly|every 3 months|every three months)\b/.test(lower)
        ? "quarterly"
        : /\b(annually|annual|yearly|every year)\b/.test(lower)
          ? "yearly"
          : /\b(monthly|every month|each month)\b/.test(lower)
            ? "monthly"
            : "none";
  const moneyMatch = text.match(/(?:R|ZAR\s?)(\s?\d[\d\s,]*(?:\.\d{1,2})?)/i)
    ?? text.match(/(?:\$|USD\s?)(\s?\d[\d,]*(?:\.\d{1,2})?)/i)
    ?? text.match(/(?:€|EUR\s?)(\s?\d[\d,]*(?:\.\d{1,2})?)/i)
    ?? text.match(/(?:£|GBP\s?)(\s?\d[\d,]*(?:\.\d{1,2})?)/i);
  const amount = moneyMatch ? Number(moneyMatch[1].replace(/[\s,]/g, "")) : null;
  const currency = /\$|\bUSD\b/i.test(text) ? "USD" : /€|\bEUR\b/i.test(text) ? "EUR" : /£|\bGBP\b/i.test(text) ? "GBP" : "ZAR";
  const category: CommitmentCategory = /\b(subscription|netflix|showmax|spotify|fibre|membership)\b/.test(lower)
    ? "subscription"
    : /\b(pay|payment|bill|fees|invoice|rent|premium)\b/.test(lower)
      ? "payment"
      : /\b(renew|licence|license|expiry|expire|registration)\b/.test(lower)
        ? "renewal"
        : /\b(appointment|dentist|doctor|meeting|check-up)\b/.test(lower)
          ? "appointment"
          : /\b(school|house|meter|clean|repair|maintenance)\b/.test(lower)
            ? "household"
            : "personal";
  const confidence = due && (recurrence !== "none" || amount !== null) ? "high" : due ? "medium" : "low";
  const title = text.length > 68 ? `${text.slice(0, 65).trim()}…` : text;
  return {
    title: title || "Untitled commitment",
    category,
    dueAt: due ? due.toISOString() : null,
    recurrence,
    amount,
    currency,
    description: due ? "Captured from your note. Review the details before saving." : "No clear date was found. Choose a due date before saving.",
    confidence,
  };
}
