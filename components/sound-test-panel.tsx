"use client";

import { Play } from "lucide-react";
import { useState } from "react";
import type { SoundEngine } from "@/lib/audio/engine";
import { GROUP_LABELS, SOUND_GROUPS, SOUND_LABELS, type SoundEvent, type SoundGroup } from "@/lib/audio/events";

interface SoundTestPanelProps {
  engine: SoundEngine;
  /** Changes when file load states change, so the panel re-renders. */
  version: number;
  effectsOn: boolean;
  ambienceOn: boolean;
}

function describe(engine: SoundEngine, event: SoundEvent): { badge: string; detail: string | null; failed: boolean } {
  const status = engine.status(event);
  if (status.configured === null) return { badge: "Built-in", detail: null, failed: false };
  if (status.file.state === "ready") return { badge: "Your file", detail: status.configured, failed: false };
  if (status.file.state === "failed") return { badge: "Built-in", detail: `${status.configured}: ${status.file.detail}`, failed: true };
  if (status.file.state === "loading") return { badge: "Loading", detail: status.configured, failed: false };
  return { badge: "Your file", detail: `${status.configured} (loads when sound is first used)`, failed: false };
}

/**
 * Sound test in The Keeper's Room. One Play button per sound, grouped. Pressing Play is a deliberate request, so it
 * plays even when interaction sounds are switched off; the panel says so.
 */
export function SoundTestPanel({ engine, version, effectsOn, ambienceOn }: SoundTestPanelProps) {
  const [last, setLast] = useState<string | null>(null);
  const groups = Object.keys(SOUND_GROUPS) as SoundGroup[];

  function play(event: SoundEvent) {
    const result = event === "ambience.bed" ? engine.previewAmbience(10) : engine.play(event, { force: true });
    setLast(result.played
      ? `${SOUND_LABELS[event]}: playing (${result.source === "file" ? "your file" : "built-in"})${event === "ambience.bed" && !ambienceOn ? " for 10 seconds" : ""}.`
      : `${SOUND_LABELS[event]}: not played (${result.reason}).`);
  }

  return (
    <details className="sound-test" data-sound-version={version}>
      <summary>Sound test</summary>
      <p className="sound-test-note">
        Play any sound to hear it. {effectsOn ? "" : "Interaction sounds are off, but a test still plays. "}
        To change one, edit <code>lib/audio/sound-map.ts</code> (see <code>docs/AUDIO.md</code>).
      </p>
      {groups.map((group) => (
        <div className="sound-test-group" key={group}>
          <h4>{GROUP_LABELS[group]}</h4>
          <ul>
            {SOUND_GROUPS[group].map((event) => {
              const info = describe(engine, event);
              return (
                <li key={event} className="sound-test-row">
                  <button type="button" className="sound-test-play" data-sound="none" aria-label={`Play: ${SOUND_LABELS[event]}`} onClick={() => play(event)}>
                    <Play size={12} aria-hidden="true" />
                  </button>
                  <span className="sound-test-name">{SOUND_LABELS[event]}<code>{event}</code></span>
                  <span className={info.failed ? "sound-test-badge sound-test-badge-failed" : "sound-test-badge"}>{info.badge}</span>
                  {info.detail && <span className="sound-test-detail">{info.detail}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="sound-test-status" role="status" aria-live="polite">{last ?? ""}</p>
    </details>
  );
}
