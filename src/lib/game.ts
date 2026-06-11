// Game utilities: seeded RNG, board generation, scoring, dictionary loader
import { useEffect, useState } from "react";
import { NINE_LETTER_ANCHORS } from "./anchors";

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

export function generateBoard(seedKey: string): { tiles: string[]; anchor: string } {
  const rnd = mulberry32(hashSeed("wg9-" + seedKey));
  const anchor = NINE_LETTER_ANCHORS[Math.floor(rnd() * NINE_LETTER_ANCHORS.length)];
  const letters = anchor.toUpperCase().split("");
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
  return 25;
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

// Check word can be built from a multiset of available tiles
export function canBuildFrom(word: string, tiles: string[]): boolean {
  const pool: Record<string, number> = {};
  for (const t of tiles) {
    const k = t.toLowerCase();
    pool[k] = (pool[k] ?? 0) + 1;
  }
  for (const ch of word.toLowerCase()) {
    if (!pool[ch]) return false;
    pool[ch]--;
  }
  return true;
}

// Dictionary loader: fetches /words.txt once, caches in module scope
let dictPromise: Promise<Set<string>> | null = null;
function loadDictionary(): Promise<Set<string>> {
  if (!dictPromise) {
    dictPromise = fetch("/words.txt")
      .then((r) => r.text())
      .then((txt) => new Set(txt.split(/\r?\n/).filter(Boolean)))
      .catch(() => new Set<string>());
  }
  return dictPromise;
}

export function useDictionary(): { dict: Set<string> | null; ready: boolean } {
  const [dict, setDict] = useState<Set<string> | null>(null);
  useEffect(() => {
    let mounted = true;
    loadDictionary().then((d) => {
      if (mounted) setDict(d);
    });
    return () => {
      mounted = false;
    };
  }, []);
  return { dict, ready: dict !== null };
}
