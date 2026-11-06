// Deterministic number sequence so every player in a multiplayer round sees
// the same prompts in the same order. mulberry32: tiny, fast, good enough.
const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const MAX_NUMBER = 999;
export const MAX_DIGITS = String(MAX_NUMBER).length;

/** The `index`-th number (0..MAX_NUMBER) of the sequence for `seed`. */
export const numberAt = (seed: number, index: number): number => {
  const next = mulberry32(seed);
  let value = 0;
  for (let i = 0; i <= index; i++) {
    value = Math.floor(next() * (MAX_NUMBER + 1));
  }
  return value;
};

export const randomSeed = () => Math.floor(Math.random() * 2 ** 32);
