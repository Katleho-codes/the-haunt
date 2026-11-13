import type { Settings } from "@/lib/domain/schema";

/**
 * Decide whether to play motion. "system" follows the device preference; the other two are explicit overrides.
 * CSS applies the same rule through `prefers-reduced-motion` and `data-motion`; this is for script-driven effects.
 */
export function shouldReduceMotion(motion: Settings["motion"], systemPrefersReduced: boolean): boolean {
  if (motion === "reduced") return true;
  if (motion === "full") return false;
  return systemPrefersReduced;
}
