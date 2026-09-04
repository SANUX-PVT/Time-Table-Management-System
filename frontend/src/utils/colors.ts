const PALETTE = [
  { bg: '#eef2ff', fg: '#4338ca', ring: '#818cf8' }, // indigo
  { bg: '#ecfdf5', fg: '#047857', ring: '#34d399' }, // emerald
  { bg: '#fff7ed', fg: '#c2410c', ring: '#fb923c' }, // orange
  { bg: '#fdf2f8', fg: '#be185d', ring: '#f472b6' }, // pink
  { bg: '#eff6ff', fg: '#1d4ed8', ring: '#60a5fa' }, // blue
  { bg: '#f0fdfa', fg: '#0f766e', ring: '#2dd4bf' }, // teal
  { bg: '#fefce8', fg: '#a16207', ring: '#facc15' }, // amber
  { bg: '#faf5ff', fg: '#7e22ce', ring: '#c084fc' }, // violet
  { bg: '#fef2f2', fg: '#b91c1c', ring: '#f87171' }, // red
  { bg: '#f0f9ff', fg: '#0369a1', ring: '#38bdf8' }, // sky
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

const NEUTRAL = { bg: '#eef0f6', fg: '#4a4f66', ring: '#9aa0bd' };

export function colorFor(id?: string) {
  if (!id) return NEUTRAL;
  return PALETTE[hash(id) % PALETTE.length];
}

export const SLOT_TYPE_COLOR: Record<string, { bg: string; fg: string; ring: string }> = {
  BREAK: { bg: '#fff6dd', fg: '#9a6a08', ring: '#facc15' },
  LUNCH: { bg: '#e4f9ee', fg: '#0a7e50', ring: '#34d399' },
  ASSEMBLY: { bg: '#eef0f6', fg: '#4a4f66', ring: '#9aa0bd' },
  ACTIVITY: { bg: '#fdf2f8', fg: '#be185d', ring: '#f472b6' },
};
