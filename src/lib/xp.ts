// app/lib/xp.ts

// --- Tunables ---------------------------------------------------------------
// Max prestige stars you want in v1
export const MAX_PRESTIGE = 3;

// Level cap grows slightly each prestige: 20 → 25 → 30 → 35
const BASE_CAP = 20;
const CAP_STEP = 5;
// Progress helper: how far into the current level the user is.
export function xpProgress(level: number, xp: number) {
  const needed = xpNeededFor(level);              // existing helper in your file
  const current = Math.max(0, Math.min(xp, needed));
  const pct = needed > 0 ? current / needed : 0;  // 0..1

  return { current, needed, pct };
}




// XP required to go from L to L+1. Simple, readable curve.
export function xpNeededFor(level: number): number {
  // e.g., L1→2 = 100, L2→3 = 120, L3→4 = 140, ...
  return 100 + (level - 1) * 20;
}

// Level cap for a given prestige
export function levelCapFor(prestige: number = 0): number {
  return BASE_CAP + Math.max(0, prestige) * CAP_STEP;
}

// Apply an XP delta (positive or negative), handling level ups/downs.
// Returns the new { level, xp } *within* the current level (not total XP).
export function applyXpDelta(level: number, xp: number, delta: number) {
  let L = Math.max(1, Math.floor(level) || 1);
  let X = Math.max(0, Math.floor(xp) || 0);

  // Apply delta
  X += Math.floor(delta);

  // Handle level up
  while (X >= xpNeededFor(L)) {
    X -= xpNeededFor(L);
    L += 1;
  }

  // Handle potential negative XP (borrow from previous levels)
  while (X < 0 && L > 1) {
    L -= 1;
    X += xpNeededFor(L);
  }

  // Clamp
  if (L < 1) L = 1;
  if (X < 0) X = 0;

  return { level: L, xp: X };
}
