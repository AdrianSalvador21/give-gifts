import type { CSSProperties } from "react";

const CLOUD = "M20 80 C 0 80, 0 52, 24 52 C 26 30, 60 24, 74 42 C 86 14, 136 12, 146 44 C 166 30, 200 36, 198 58 C 226 54, 250 66, 240 80 Z";
const BLOB = "M150 40 C 400 -40, 720 70, 730 310 C 740 520, 540 560, 480 720 C 430 860, 210 910, 120 770 C 40 640, 220 520, 160 380 C 100 240, -40 100, 150 40 Z";

type DecorProps = { className?: string; style?: CSSProperties };

export function Cloud({ width = 260, className = "", style }: DecorProps & { width?: number }) {
  return (
    <svg aria-hidden width={width} height={(width * 90) / 260} viewBox="0 0 260 90" className={`absolute ${className}`} style={style}>
      <path d={CLOUD} fill="#FFFFFF" />
    </svg>
  );
}

export function Squiggle({ className = "", style }: DecorProps) {
  return (
    <svg aria-hidden width="90" height="60" viewBox="0 0 90 60" className={`absolute ${className}`} style={style}>
      <path d="M8 40 C 18 14, 30 14, 34 30 C 38 46, 52 46, 58 26 C 64 8, 78 10, 84 22" fill="none" stroke="#F5DF16" strokeWidth="10" strokeLinecap="round" />
    </svg>
  );
}

export function VerticalSquiggle({ className = "", style }: DecorProps) {
  return (
    <svg aria-hidden width="70" height="110" viewBox="0 0 70 110" className={`absolute ${className}`} style={style}>
      <path d="M30 8 C 52 20, 10 36, 34 52 C 58 68, 14 82, 36 100" fill="none" stroke="#F5DF16" strokeWidth="12" strokeLinecap="round" />
    </svg>
  );
}

export function Dot({ color, size = 22, className = "", style }: DecorProps & { color: string; size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 22 22" className={`absolute ${className}`} style={style}>
      <circle cx="11" cy="11" r="10" fill={color} />
    </svg>
  );
}

/** Mancha verde orgánica del fondo de cada sección. */
export function Blob({ className = "", style }: DecorProps) {
  return (
    <svg aria-hidden viewBox="0 0 800 900" className={`absolute z-0 ${className}`} style={style}>
      <path d={BLOB} fill="#8ED462" />
    </svg>
  );
}

/** Logotipo: Regalito mini (cajita tinta con moño verde y ojitos). */
export function LogoMark() {
  return (
    <span aria-hidden className="relative block size-9 rounded-[10px] bg-tinta">
      <svg width="26" height="16" viewBox="0 0 26 16" className="absolute -top-[9px] left-[5px]">
        <path d="M13 13 C 8 3, 1 4, 2 9 C 3 14, 9 14, 13 13 Z M13 13 C 18 3, 25 4, 24 9 C 23 14, 17 14, 13 13 Z" fill="#8ED462" stroke="#2C2E2A" strokeWidth="1.5" />
      </svg>
      <span className="absolute top-[15px] left-[10px] size-[5px] rounded-full bg-white" />
      <span className="absolute top-[15px] left-[21px] size-[5px] rounded-full bg-white" />
    </span>
  );
}
