// Checks the sound map and the audio files it names: valid paths, files that exist, and the size limits.
// Runs before every `npm run build` (so also in the Docker build) and as `npm run check:audio`.
// It imports the TypeScript sound map directly, using Node's type stripping (Node 22.18+ or 23.6+; the project uses 24).
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { SOUND_MAP } from "../lib/audio/sound-map.ts";
import { capFor, checkEntry, checkSizes, formatBytes } from "../lib/audio/file-rules.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");
const problems = [];
const rows = [];
const used = new Set();

for (const [event, entry] of Object.entries(SOUND_MAP)) {
  for (const issue of checkEntry(entry)) problems.push(`${event}: ${issue}`);
  if (entry.file === null) {
    rows.push([event, "built-in", "", ""]);
    continue;
  }
  const path = join(publicDir, entry.file);
  const bytes = existsSync(path) ? statSync(path).size : null;
  used.add(path);
  rows.push([event, entry.file, bytes === null ? "MISSING" : formatBytes(bytes), formatBytes(capFor(event))]);
}

const sizes = Object.entries(SOUND_MAP)
  .filter(([, entry]) => entry.file !== null && checkEntry(entry).length === 0)
  .map(([event, entry]) => {
    const path = join(publicDir, entry.file);
    return { event, file: entry.file, bytes: existsSync(path) ? statSync(path).size : null };
  });
problems.push(...checkSizes(sizes));

const width = [0, 1, 2, 3].map((i) => Math.max(...rows.map((r) => r[i].length), ["event", "file", "size", "limit"][i].length));
const line = (cells) => cells.map((c, i) => c.padEnd(width[i])).join("  ");
console.log(line(["event", "file", "size", "limit"]));
for (const row of rows) console.log(line(row));

// Files in public/audio that the map does not use are only a warning: they are served but never played.
const audioDir = join(publicDir, "audio");
if (existsSync(audioDir)) {
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]));
  for (const file of walk(audioDir)) {
    if (!used.has(file) && !file.endsWith(".gitkeep") && !file.endsWith(".md")) console.warn(`warning: ${relative(root, file)} is not used in lib/audio/sound-map.ts`);
  }
}

if (problems.length > 0) {
  console.error(`\nAudio check failed:\n${problems.map((p) => `  - ${p}`).join("\n")}\nSee docs/AUDIO.md.`);
  process.exit(1);
}
console.log("\nAudio check passed.");
