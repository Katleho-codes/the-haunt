/**
 * One decorative drawing behind each room heading. Original artwork (drawn here in SVG), hidden from screen readers,
 * ignores clicks, and moves slowly or not at all. All motion stops when reduced motion is on (see globals.css).
 */
export type MotifRoom = "archive" | "clocktower" | "crypt";

const TICKS = Array.from({ length: 12 }, (_, i) => i);

function Clocktower() {
  return (
    <>
      {/* Tall case clock: hood, face, waist with a glass door, base. */}
      <path className="motif-line" d="M30 70 V22 Q30 8 60 6 Q90 8 90 22 V70 Z" />
      <path className="motif-line motif-faint" d="M26 22 H94" />
      <circle className="motif-line" cx="60" cy="42" r="22" />
      <circle className="motif-line motif-faint" cx="60" cy="42" r="18" />
      {TICKS.map((i) => {
        const a = (i * Math.PI) / 6;
        const inner = i % 3 === 0 ? 13 : 15.5;
        return <line key={i} className="motif-line motif-tick" x1={60 + Math.sin(a) * inner} y1={42 - Math.cos(a) * inner} x2={60 + Math.sin(a) * 18} y2={42 - Math.cos(a) * 18} />;
      })}
      <line className="motif-hand" x1="60" y1="42" x2="60" y2="30" />
      <line className="motif-hand motif-hand-short" x1="60" y1="42" x2="68" y2="47" />
      <circle className="motif-fill" cx="60" cy="42" r="1.6" />
      <path className="motif-line" d="M36 70 H84 V148 H36 Z" />
      <path className="motif-line motif-faint" d="M44 78 H76 V140 H44 Z" />
      <path className="motif-line" d="M30 148 H90 V156 H30 Z" />
      {/* Pendulum: swings slowly inside the glass door. */}
      <g className="motif-pendulum">
        <line className="motif-line" x1="60" y1="74" x2="60" y2="124" />
        <circle className="motif-bob" cx="60" cy="128" r="7" />
      </g>
    </>
  );
}

function Crypt() {
  return (
    <>
      <defs>
        <filter id="motif-wisp-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>
      {/* Spirit wisps rising and fading, one after another. */}
      <path className="motif-wisp motif-wisp-1" filter="url(#motif-wisp-blur)" d="M48 78 C40 64 56 56 48 42 C42 32 52 24 50 14" />
      <path className="motif-wisp motif-wisp-2" filter="url(#motif-wisp-blur)" d="M66 80 C74 66 60 58 68 44 C74 34 64 26 68 16" />
      <path className="motif-wisp motif-wisp-3" filter="url(#motif-wisp-blur)" d="M58 82 C52 70 64 62 58 50 C54 42 60 36 58 28" />
      {/* Stone tablet with worn engraving. */}
      <path className="motif-stone" d="M28 152 V84 Q28 58 60 56 Q92 58 92 84 V152 Z" />
      <path className="motif-line" d="M28 152 V84 Q28 58 60 56 Q92 58 92 84 V152" />
      <path className="motif-line motif-faint" d="M60 70 V88 M53 76 H67" />
      <path className="motif-line motif-faint" d="M40 100 H80 M44 108 H76 M48 116 H72 M42 126 H62" />
      <path className="motif-line motif-faint" d="M33 141 Q38 137 44 141 M70 143 Q76 138 84 142" />
      <path className="motif-line" d="M18 152 H102" />
    </>
  );
}

const SPINES = [
  { x: 24, w: 8, h: 30 }, { x: 33, w: 6, h: 34 }, { x: 40, w: 9, h: 28 }, { x: 50, w: 7, h: 32 },
  { x: 58, w: 10, h: 26 }, { x: 69, w: 6, h: 33 }, { x: 76, w: 8, h: 29 },
];

function Archive() {
  return (
    <>
      {/* A bookcase of ledgers with a candle on top. */}
      <path className="motif-line" d="M18 46 H102 V156 H18 Z" />
      <path className="motif-line motif-faint" d="M18 84 H102 M18 120 H102" />
      {SPINES.map((s, i) => <rect key={i} className="motif-spine" x={s.x} y={84 - s.h} width={s.w} height={s.h} />)}
      <rect className="motif-spine" x="86" y="58" width="7" height="26" transform="rotate(-14 86 84)" />
      {SPINES.slice(0, 5).map((s, i) => <rect key={`b${i}`} className="motif-spine" x={s.x + 2} y={120 - s.h + 2} width={s.w + 1} height={s.h - 2} />)}
      <path className="motif-line" d="M72 116 H98 V120 H72 Z M74 112 H96 V116 H74 Z" />
      <path className="motif-line motif-faint" d="M26 152 H60 M26 148 H52" />
      {/* Candle and flame. */}
      <path className="motif-line" d="M50 46 V30 H58 V46" />
      <path className="motif-flame" d="M54 28 C50 22 53 16 54 10 C56 16 59 22 54 28 Z" />
      <circle className="motif-glow" cx="54" cy="20" r="11" />
    </>
  );
}

export function RoomMotif({ room }: { room: MotifRoom }) {
  return (
    <svg className={`room-motif room-motif-${room}`} viewBox="0 0 120 160" aria-hidden="true" focusable="false" data-motif={room}>
      {room === "clocktower" ? <Clocktower /> : room === "crypt" ? <Crypt /> : <Archive />}
    </svg>
  );
}
