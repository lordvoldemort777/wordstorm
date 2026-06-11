// Game utilities: seeded RNG, board generation, scoring

import { WORDS } from "./words";

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Pool of 9-letter words from the dictionary that contain at least 3 vowels
// (ensures the board feels playable, not consonant soup)
let NINE_POOL: string[] | null = null;
function getNinePool(): string[] {
  if (NINE_POOL) return NINE_POOL;
  const vowels = new Set("aeiou");
  NINE_POOL = [];
  for (const w of WORDS) {
    if (w.length !== 9) continue;
    let v = 0;
    for (const c of w) if (vowels.has(c)) v++;
    if (v >= 3) NINE_POOL.push(w);
  }
  if (NINE_POOL.length === 0) {
    // Fallback safety net
    NINE_POOL = ["education", "important", "beautiful", "wonderful", "celebrate", "discovery"];
  }
  return NINE_POOL;
}

export function generateBoard(seedKey: string): { tiles: string[]; anchor: string } {
  const pool = getNinePool();
  const rnd = mulberry32(hashSeed("wg9-" + seedKey));
  const anchor = pool[Math.floor(rnd() * pool.length)];
  const letters = anchor.toUpperCase().split("");
  // Fisher-Yates with seeded RNG
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  return { tiles: letters, anchor };
}

export function scoreFor(len: number): number {
  if (len < 3) return 0;
  if (len === 3) return 1;
  if (len === 4) return 2;
  if (len === 5) return 4;
  if (len === 6) return 6;
  if (len === 7) return 10;
  if (len === 8) return 15;
  return 25; // 9 letters
}

export const SCORE_TABLE: { len: string; pts: number }[] = [
  { len: "3", pts: 1 },
  { len: "4", pts: 2 },
  { len: "5", pts: 4 },
  { len: "6", pts: 6 },
  { len: "7", pts: 10 },
  { len: "8", pts: 15 },
  { len: "9", pts: 25 },
];
