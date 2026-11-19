import type { Clue } from '../types';
export type Direction = 'up' | 'left' | 'down' | 'right';
export const COLS = 17;
export const ROWS = 11;
export const TILE = 48;
export const WIDTH = COLS * TILE;
export const HEIGHT = ROWS * TILE;
export const DIRECTIONS: Record<Direction, [number, number]> = {
  up: [0, -1],
  left: [-1, 0],
  down: [0, 1],
  right: [1, 0]
};
export const KEYS: Partial<Record<string, Direction>> = {
  ArrowUp: 'up',
  w: 'up',
  ArrowLeft: 'left',
  a: 'left',
  ArrowDown: 'down',
  s: 'down',
  ArrowRight: 'right',
  d: 'right'
};
const VILLAGES: [number, number, number, number][][] = [
  [
    [2, 2, 3, 2],
    [7, 2, 3, 2],
    [12, 2, 3, 2],
    [2, 6, 2, 2],
    [6, 5, 3, 2],
    [11, 6, 4, 2]
  ],
  [
    [2, 2, 3, 2],
    [7, 2, 2, 3],
    [11, 2, 4, 2],
    [2, 6, 3, 2],
    [7, 7, 3, 2],
    [12, 5, 2, 3]
  ],
  [
    [2, 2, 2, 3],
    [6, 2, 4, 2],
    [12, 2, 3, 3],
    [2, 7, 3, 2],
    [7, 5, 2, 3],
    [11, 7, 4, 2]
  ]
];
export const ID = (x: number, y: number) => y * COLS + x;
export const xOf = (id: number) => id % COLS;
export const yOf = (id: number) => Math.floor(id / COLS);

export function rng(seed: number) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function accessibleNeighbors(cell: number, walls: Set<number>) {
  return Object.values(DIRECTIONS)
    .map(([dx, dy]) => ID(xOf(cell) + dx, yOf(cell) + dy))
    .filter((next) => !walls.has(next));
}

export function distances(start: number, walls: Set<number>) {
  const result = new Map([[start, 0]]);
  const queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i];
    for (const next of accessibleNeighbors(at, walls)) {
      if (result.has(next)) continue;
      result.set(next, (result.get(at) ?? 0) + 1);
      queue.push(next);
    }
  }
  return result;
}

export function makeVillage(night: number, clues: readonly Clue[]) {
  const flipX = night % 2 === 0;
  const flipY = night === 4 || night === 6;
  const cell = (x: number, y: number) => ID(flipX ? COLS - 1 - x : x, flipY ? ROWS - 1 - y : y);
  const blocks: [number, number, number, number][] = VILLAGES[(night - 1) % VILLAGES.length].map(
    ([x, y, w, h]) => [flipX ? COLS - x - w : x, flipY ? ROWS - y - h : y, w, h]
  );
  const walls = new Set<number>();
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) walls.add(ID(x, y));
    }
  }
  for (const [x, y, w, h] of blocks) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) walls.add(ID(i, j));
  }
  // A walled garden replaces one roof in the finale. A journal entry reveals its covered passage.
  const passage = night === 7 ? [cell(7, 2), cell(7, 3)] : [];
  const unlocked = passage.length > 0 && Array.isArray(clues) && clues.length > 0;
  if (unlocked) passage.forEach((id) => walls.delete(id));
  const spawn = cell(1, 9),
    gate = cell(15, 1);
  const starts = [cell(15, 4), cell(8, 1)];
  if (night < 5) starts.splice(1);
  const coins = new Set([cell(2, 9)]);
  const reachable = distances(spawn, walls);
  const random = rng(71 * night + 305);
  const shuffled = [...reachable.keys()].map((at) => [at, random()]).sort((a, b) => a[1] - b[1]);
  // Space the coins across the village without hiding them in the newly opened passage.
  const goal = Math.min(8, 4 + Math.ceil(night / 2));
  for (const [at] of shuffled) {
    if (coins.size >= goal) break;
    if (at === gate || passage.includes(at) || starts.includes(at) || (reachable.get(at) ?? 0) < 4) continue;
    const around = distances(at, walls);
    if ([...coins].every((coin) => (around.get(coin) ?? 0) >= 4)) coins.add(at);
  }
  const waypoints = [cell(15, 5), cell(11, 1), cell(1, 4), cell(5, 9), cell(15, 9)].filter(
    (at) => !walls.has(at)
  );
  return { walls, blocks, spawn, gate, starts, coins, waypoints, passage: unlocked ? passage : [] };
}

export type Village = ReturnType<typeof makeVillage>;
