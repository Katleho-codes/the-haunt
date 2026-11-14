import { isSoundEvent, type EffectEvent } from "@/lib/audio/events";

/** The parts of a DOM element the resolver uses, so it can be tested without a browser. */
export interface ElementLike {
  closest(selector: string): ElementLike | null;
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
}

/** Things a person presses. Text fields are not included: typing makes no sound. */
export const PRESSABLE = 'button, a[href], [role="button"], [role="menuitem"], [role="switch"], [role="tab"], select, summary';

/**
 * Which generic sound a click on `target` should make, if no specific sound already played for it.
 * - `data-sound="<event>"` on the control or an ancestor picks that event; `data-sound="none"` silences it.
 * - Switches play `ui.toggle`; any other pressable control plays `ui.click`.
 * - Disabled controls and clicks outside any control make no sound.
 */
export function clickSoundFor(target: ElementLike | null): EffectEvent | null {
  if (!target) return null;
  const control = target.closest(PRESSABLE);
  if (!control) return null;
  if (control.hasAttribute("disabled") || control.getAttribute("aria-disabled") === "true") return null;
  const marked = target.closest("[data-sound]");
  if (marked) {
    const value = marked.getAttribute("data-sound");
    if (value === "none") return null;
    if (value && isSoundEvent(value) && value !== "ambience.bed") return value;
  }
  return control.getAttribute("role") === "switch" ? "ui.toggle" : "ui.click";
}
