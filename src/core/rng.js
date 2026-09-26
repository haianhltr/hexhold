// Seeded randomness (mulberry32). Every random roll in the game goes through here, so the same
// seed always replays the same game.

function step(a) {
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// A standalone generator, used where the randomness doesn't live in the game state (map generation).
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    return step(a);
  };
}

// Draws from the generator stored in the game state and advances it.
export function rand(state) {
  state.rng = (state.rng + 0x6d2b79f5) >>> 0;
  return step(state.rng);
}

export function randInt(state, n) {
  return Math.floor(rand(state) * n);
}

// Turns any typed seed ("banana", "42") into a 32-bit number.
export function seedFromText(text) {
  const trimmed = String(text).trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed) >>> 0;
  let h = 0x811c9dc5;
  for (let i = 0; i < trimmed.length; i++) {
    h ^= trimmed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function randomSeed() {
  return Math.floor(Math.random() * 1_000_000_000);
}
