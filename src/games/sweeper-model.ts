import type { Clue } from '../types';
export interface Layout {
  width: number;
  height: number;
  spirits: number[];
  inscriptions: number[];
  clue: Clue;
}
type Floor = ReturnType<typeof makeFloor>;
interface ClueArea {
  source: number | null;
  area: number[];
  count: number;
}
export type Deduction = ClueArea &
  ({ action: 'open'; target: number } | { action: 'cage'; target: number; left: number });
export const floors: Layout[] = [
  { width: 5, height: 4, spirits: [0, 1, 8, 14], inscriptions: [3, 7, 9, 12, 17], clue: 'brass-key' },
  {
    width: 5,
    height: 5,
    spirits: [2, 3, 6, 12, 13],
    inscriptions: [0, 1, 7, 18, 19, 23],
    clue: 'pavilion-mark'
  },
  {
    width: 6,
    height: 5,
    spirits: [0, 9, 12, 26, 28, 29],
    inscriptions: [2, 3, 5, 6, 7, 20, 23],
    clue: 'dawn-seal'
  }
];

export function coordinates(index: number, width: number) {
  return String.fromCharCode(65 + (index % width)) + (Math.floor(index / width) + 1);
}

export function makeFloor(level: Layout) {
  const spirit = new Set(level.spirits);
  const cells = Array.from({ length: level.width * level.height }, (_, i) => i);
  const near = cells.map((i) =>
    cells.filter(
      (j) =>
        i !== j &&
        Math.abs((i % level.width) - (j % level.width)) <= 1 &&
        Math.abs(Math.floor(i / level.width) - Math.floor(j / level.width)) <= 1
    )
  );
  return {
    ...level,
    spirit,
    cells,
    near,
    counts: near.map((group) => group.filter((i) => spirit.has(i)).length)
  };
}

// Only cages proved by the public clues participate in a deduction. A misplaced
// player marker can never make Mbah Ronda recommend opening a dangerous tile.
export function deduction(
  floor: Floor,
  open: Set<number>,
  cages: Set<number>,
  exposed: Set<number>
): Deduction | null {
  const confirmed = new Set(exposed);
  const clues: ClueArea[] = [...open].map((i) => ({ source: i, area: floor.near[i], count: floor.counts[i] }));
  clues.push({ source: null, area: floor.cells, count: floor.spirits.length });
  let trap: Deduction | null = null;
  let flaggedSafe: Deduction | null = null;
  let oldSize: number;
  do {
    oldSize = confirmed.size;
    for (const clue of clues) {
      const hidden = clue.area.filter((i) => !open.has(i) && !confirmed.has(i));
      if (!hidden.length) continue;
      const left = clue.count - clue.area.filter((i) => confirmed.has(i)).length;
      if (left === 0) {
        const available = hidden.find((i) => !cages.has(i));
        if (available !== undefined) return { ...clue, action: 'open', target: available };
        flaggedSafe ||= { ...clue, action: 'open', target: hidden[0] };
      }
      if (left === hidden.length) {
        for (const i of hidden) {
          if (cages.has(i)) confirmed.add(i);
          else trap ||= { ...clue, action: 'cage', left, target: i };
        }
      }
    }
  } while (confirmed.size > oldSize);
  return flaggedSafe || trap;
}
