/** Money is held as integer minor units plus a currency. Currencies are never mixed. */

export function minorUnitDigits(currency: string): number {
  try {
    const digits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
    return digits ?? 2;
  } catch {
    return 2;
  }
}

/** Convert a major-unit number (for example 899.5) to minor units, rounding to the nearest unit. */
export function toMinor(major: number, currency: string): number {
  if (!Number.isFinite(major) || major < 0) throw new RangeError("Amount must be a non-negative number");
  const factor = 10 ** minorUnitDigits(currency);
  return Math.round((major + Number.EPSILON) * factor);
}

export function fromMinor(minor: number, currency: string): number {
  return minor / 10 ** minorUnitDigits(currency);
}

export function formatMoney(minor: number | undefined, currency: string | undefined, locale?: string): string {
  if (minor === undefined || !currency) return "—";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(fromMinor(minor, currency));
  } catch {
    return `${currency} ${fromMinor(minor, currency).toFixed(2)}`;
  }
}

export interface AmountItem {
  amountMinor?: number;
  currency?: string;
}

export interface CurrencyTotal {
  currency: string;
  totalMinor: number;
  count: number;
}

/** Sum known amounts per currency. Items without an amount are ignored; currencies stay separate. */
export function sumByCurrency(items: readonly AmountItem[]): CurrencyTotal[] {
  const totals = new Map<string, CurrencyTotal>();
  for (const item of items) {
    if (item.amountMinor === undefined || !item.currency) continue;
    const entry = totals.get(item.currency) ?? { currency: item.currency, totalMinor: 0, count: 0 };
    entry.totalMinor += item.amountMinor;
    entry.count += 1;
    totals.set(item.currency, entry);
  }
  return [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}
