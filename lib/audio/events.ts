/**
 * Every sound THE HAUNT can make, grouped by kind of interaction. Each event has one entry in `sound-map.ts`.
 * Adding an event here makes the typecheck fail until it is added to the map and given a built-in recipe.
 */
export const SOUND_GROUPS = {
  ui: ["ui.click", "ui.navigate", "ui.open", "ui.close", "ui.toggle"],
  commitment: ["commitment.save", "commitment.complete", "commitment.restore", "commitment.archive", "commitment.delete"],
  capture: ["capture.interpret"],
  reminder: ["reminder.arrive", "reminder.snooze", "reminder.dismiss"],
  system: ["system.warning", "system.error"],
  ambience: ["ambience.bed"],
} as const;

export type SoundGroup = keyof typeof SOUND_GROUPS;
export type SoundEvent = (typeof SOUND_GROUPS)[SoundGroup][number];
/** Short one-shot sounds. The ambient bed is handled separately. */
export type EffectEvent = Exclude<SoundEvent, "ambience.bed">;

export const SOUND_EVENTS: readonly SoundEvent[] = Object.values(SOUND_GROUPS).flat();
export const EFFECT_EVENTS: readonly EffectEvent[] = SOUND_EVENTS.filter((event): event is EffectEvent => event !== "ambience.bed");

export const GROUP_LABELS: Record<SoundGroup, string> = {
  ui: "Interface",
  commitment: "Commitments",
  capture: "Capture",
  reminder: "Reminders",
  system: "Warnings",
  ambience: "Ambience",
};

export const SOUND_LABELS: Record<SoundEvent, string> = {
  "ui.click": "Click (any button)",
  "ui.navigate": "Move between rooms",
  "ui.open": "Open a dialog, menu or panel",
  "ui.close": "Close a dialog, menu or panel",
  "ui.toggle": "Switch a setting",
  "commitment.save": "Save or add a commitment",
  "commitment.complete": "Complete a commitment",
  "commitment.restore": "Restore or undo",
  "commitment.archive": "Archive",
  "commitment.delete": "Delete",
  "capture.interpret": "Read a captured note",
  "reminder.arrive": "A reminder arrives",
  "reminder.snooze": "Snooze a reminder",
  "reminder.dismiss": "Dismiss a reminder",
  "system.warning": "Warning (before deleting)",
  "system.error": "Something could not be done",
  "ambience.bed": "Ambient room (loops)",
};

export function isSoundEvent(value: string): value is SoundEvent {
  return (SOUND_EVENTS as readonly string[]).includes(value);
}

export function groupOf(event: SoundEvent): SoundGroup {
  return event.slice(0, event.indexOf(".")) as SoundGroup;
}

/** One line of the sound map. `file: null` uses the built-in synthesized sound. */
export interface SoundEntry {
  /** Path under `public/`, starting with `/audio/`, for example "/audio/click.mp3". */
  file: string | null;
  /** Loudness of this sound relative to the others, 0 to 2. The overall ceiling still applies. */
  gain: number;
}

export type SoundMap = Record<SoundEvent, SoundEntry>;
