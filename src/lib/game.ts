// Game utilities: seeded RNG, board generation, scoring

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

// Vowel-rich frequency pool for playable boards
const POOL =
  "AAAAAEEEEEEIIIIOOOOUU" +
  "BCDDFGHHJKLLMMNNPPQRRRSSSTTTVWXYZ";

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function generateBoard(seedKey: string): string[] {
  const rnd = mulberry32(hashSeed("wg-" + seedKey));
  // Ensure at least 5 vowels for playability
  const board: string[] = [];
  const vowels = "AEIOU";
  let vowelCount = 0;
  for (let i = 0; i < 16; i++) {
    const ch = POOL[Math.floor(rnd() * POOL.length)];
    if (vowels.includes(ch)) vowelCount++;
    board.push(ch);
  }
  // Replace consonants with vowels if needed
  let idx = 0;
  while (vowelCount < 5 && idx < 16) {
    if (!vowels.includes(board[idx])) {
      board[idx] = vowels[Math.floor(rnd() * 5)];
      vowelCount++;
    }
    idx++;
  }
  return board;
}

export function scoreFor(len: number): number {
  if (len < 3) return 0;
  if (len === 3) return 1;
  if (len === 4) return 2;
  if (len === 5) return 4;
  if (len === 6) return 6;
  return 10;
}
