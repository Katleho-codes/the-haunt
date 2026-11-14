/**
 * Rules for audio files named in `sound-map.ts`. No imports, plain TypeScript: this file is used by the app, by the
 * tests and by `scripts/check-audio.mjs` (run with Node's type stripping before every build).
 */

export const AUDIO_DIR = "/audio/";
export const ALLOWED_EXTENSIONS = ["mp3", "ogg", "wav", "m4a"];
export const EFFECT_MAX_BYTES = 150 * 1024;
export const AMBIENT_MAX_BYTES = 2 * 1024 * 1024;
export const TOTAL_MAX_BYTES = 4 * 1024 * 1024;
export const MAX_ENTRY_GAIN = 2;

export function isAmbientEvent(event: string): boolean {
  return event.startsWith("ambience.");
}

/** Largest allowed file for an event. */
export function capFor(event: string): number {
  return isAmbientEvent(event) ? AMBIENT_MAX_BYTES : EFFECT_MAX_BYTES;
}

export function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(2)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

/** Problems with one map entry, in plain words. An empty list means the entry is fine. */
export function checkEntry(entry: { file: string | null; gain: number }): string[] {
  const issues: string[] = [];
  if (typeof entry.gain !== "number" || !Number.isFinite(entry.gain) || entry.gain < 0 || entry.gain > MAX_ENTRY_GAIN) {
    issues.push(`gain must be a number from 0 to ${MAX_ENTRY_GAIN}`);
  }
  if (entry.file === null) return issues;
  const file = entry.file;
  if (typeof file !== "string" || file.length === 0) {
    issues.push("file must be a path such as /audio/click.mp3, or null");
    return issues;
  }
  if (!file.startsWith(AUDIO_DIR)) issues.push(`file must start with ${AUDIO_DIR} (put it in public/audio/)`);
  if (file.length > 200) issues.push("file path is too long");
  if (file.includes("..") || file.includes("\\") || file.slice(1).includes("//")) issues.push("file path must not contain .., \\ or //");
  if (/[?#\s]/.test(file)) issues.push("file path must not contain spaces, ? or #");
  const extension = file.slice(file.lastIndexOf(".") + 1).toLowerCase();
  if (file.lastIndexOf(".") <= file.lastIndexOf("/") || !ALLOWED_EXTENSIONS.includes(extension)) {
    issues.push(`file must end in ${ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(", ")}`);
  }
  return issues;
}

export interface FileSize {
  event: string;
  file: string;
  /** Size on disk, or null when the file does not exist. */
  bytes: number | null;
}

/** Problems with the files on disk: missing files, files over their cap, and all files together over the total cap. */
export function checkSizes(sizes: readonly FileSize[]): string[] {
  const issues: string[] = [];
  const counted = new Map<string, number>();
  for (const { event, file, bytes } of sizes) {
    if (bytes === null) {
      issues.push(`${event}: ${file} does not exist in public${file}`);
      continue;
    }
    const cap = capFor(event);
    if (bytes > cap) issues.push(`${event}: ${file} is ${formatBytes(bytes)}, the limit is ${formatBytes(cap)}`);
    counted.set(file, bytes);
  }
  const total = [...counted.values()].reduce((sum, value) => sum + value, 0);
  if (total > TOTAL_MAX_BYTES) issues.push(`all audio files together are ${formatBytes(total)}, the limit is ${formatBytes(TOTAL_MAX_BYTES)}`);
  return issues;
}
