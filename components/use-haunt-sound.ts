"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { Mood } from "@/lib/audio/ambient";
import { clickSoundFor } from "@/lib/audio/click-sound";
import { SoundEngine, type PlayResult, type SoundSettings } from "@/lib/audio/engine";
import type { SoundEvent } from "@/lib/audio/events";
import { SOUND_MAP } from "@/lib/audio/sound-map";

/** Set `localStorage["the-haunt.debug.sound"] = "1"` to expose the engine's event log for testing. */
export const SOUND_DEBUG_KEY = "the-haunt.debug.sound";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
    __hauntSound?: { log: () => ReturnType<SoundEngine["getLog"]>; clear: () => void; state: () => ReturnType<SoundEngine["debugState"]> };
  }
}

function createEngine(): SoundEngine {
  return new SoundEngine({
    createContext: () => {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      return Ctor ? new Ctor() : null;
    },
    fetchFile: async (path) => {
      const response = await fetch(path, { cache: "force-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.arrayBuffer();
    },
    map: SOUND_MAP,
  });
}

const noSubscribe = () => () => {};
const zero = () => 0;

/**
 * Connects the sound engine to the page: settings, house mood, the first-gesture unlock, the generic click sound,
 * and pausing while the tab is hidden. Returns `play` for specific actions.
 */
export function useHauntSound(settings: SoundSettings, mood: Mood) {
  const [engine] = useState<SoundEngine | null>(() => (typeof window === "undefined" ? null : createEngine()));
  // Re-render when file load states change, for the Sound test panel.
  const version = useSyncExternalStore(engine?.subscribe ?? noSubscribe, engine?.getVersion ?? zero, zero);

  useEffect(() => {
    engine?.configure({ effects: settings.effects, ambience: settings.ambience, volume: settings.volume });
  }, [engine, settings.effects, settings.ambience, settings.volume]);

  useEffect(() => {
    engine?.setMood(mood);
  }, [engine, mood]);

  useEffect(() => {
    if (!engine) return;
    const unlock = () => engine.unlock();
    // The generic sound is worked out at the START of the click (capture phase): React updates the page during the
    // click, so a toggle such as data-sound={open ? "ui.close" : "ui.open"} would already read the new state later.
    let pending: ReturnType<typeof clickSoundFor> = null;
    const begin = (event: MouseEvent) => {
      engine.beginGesture();
      pending = clickSoundFor(event.target instanceof Element ? event.target : null);
    };
    // Runs after React's own click handlers, so a specific sound has already claimed the press.
    const generic = () => {
      const sound = pending;
      pending = null;
      if (sound && !engine.claimedThisGesture()) engine.play(sound);
    };
    const visibility = () => engine.setHidden(document.visibilityState === "hidden");
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);
    document.addEventListener("click", begin, true);
    document.addEventListener("click", generic);
    document.addEventListener("visibilitychange", visibility);
    visibility();
    let debug = false;
    try { debug = window.localStorage.getItem(SOUND_DEBUG_KEY) === "1"; } catch { /* storage blocked */ }
    if (debug) window.__hauntSound = { log: () => engine.getLog(), clear: () => engine.clearLog(), state: () => engine.debugState() };
    return () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      document.removeEventListener("click", begin, true);
      document.removeEventListener("click", generic);
      document.removeEventListener("visibilitychange", visibility);
      if (debug) delete window.__hauntSound;
    };
  }, [engine]);

  const play = useCallback(
    (event: SoundEvent, options?: { force?: boolean }): PlayResult => engine?.play(event, options) ?? { played: false, reason: "unsupported" },
    [engine],
  );
  /** Apply settings right away, inside the click, so turning sound on can be heard on that same press. */
  const applyNow = useCallback((next: SoundSettings) => engine?.configure(next), [engine]);

  return { engine, play, applyNow, version };
}
