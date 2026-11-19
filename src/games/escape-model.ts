export interface Room {
  name: [string, string];
  near: number[];
  cover?: boolean;
  creaks?: boolean;
}
export interface HouseState {
  player: number;
  ghost: number;
  patrolIndex: number;
  noise: number | null;
  turn: number;
  hasKey: boolean;
  hasStriker: boolean;
  lost: boolean;
  won: boolean;
}
export type TurnAction = 'move' | 'knock' | 'wait';
// Rows run north to south. Each doorway can be traversed in both directions.
export const rooms: Room[] = [
  { name: ['Veranda', 'Serambi'], near: [1, 3], cover: true },
  { name: ['Parlor', 'Ruang tamu'], near: [0, 2, 4] },
  { name: ['Linen room', 'Bilik kain'], near: [1, 5], cover: true },
  { name: ['Passage', 'Selasar'], near: [0, 4, 6], creaks: true },
  { name: ['Pendopo', 'Pendopo'], near: [1, 3, 5, 7] },
  { name: ['Bedchamber', 'Bilik tidur'], near: [2, 4, 8], creaks: true },
  { name: ['Kitchen', 'Dapur'], near: [3, 7], cover: true },
  { name: ['Storeroom', 'Gudang'], near: [4, 6, 8] },
  { name: ['Washroom', 'Bilik basuh'], near: [5, 7], cover: true }
];
export const patrol = [8, 5, 4, 1, 4, 3, 6, 7];
export function freshState(): HouseState {
  return {
    player: 0,
    ghost: 8,
    patrolIndex: 0,
    noise: null,
    turn: 0,
    hasKey: false,
    hasStriker: false,
    lost: false,
    won: false
  };
}
function stepTowards(start: number, destination: number) {
  if (start === destination) return start;
  const queue = [[start, start]],
    seen = new Set([start]);
  for (let i = 0; i < queue.length; i++) {
    const [current, first] = queue[i];
    for (const neighbor of rooms[current].near) {
      if (seen.has(neighbor)) continue;
      const step = current === start ? neighbor : first;
      if (neighbor === destination) return step;
      seen.add(neighbor);
      queue.push([neighbor, step]);
    }
  }
  return start;
}
export function advancePatrol(state: HouseState) {
  const next = { ...state };
  if (next.noise !== null && next.noise !== next.ghost) {
    next.ghost = stepTowards(next.ghost, next.noise);
    if (next.ghost === next.noise) next.noise = null;
    return next;
  }
  next.noise = null;
  let intendedIndex = (next.patrolIndex + 1) % patrol.length;
  if (patrol[intendedIndex] === next.ghost) {
    next.patrolIndex = intendedIndex;
    intendedIndex = (next.patrolIndex + 1) % patrol.length;
  }
  next.ghost = stepTowards(next.ghost, patrol[intendedIndex]);
  if (next.ghost === patrol[intendedIndex]) next.patrolIndex = intendedIndex;
  return next;
}
export function advance(state: HouseState, action: TurnAction, dest = state.player) {
  const next = advancePatrol(state);
  next.turn++;
  next.player = dest;
  const staying = dest === state.player;
  const sheltered = rooms[dest].cover && action !== 'knock';
  const crossing = !staying && dest === state.ghost && next.ghost === state.player;
  next.lost = crossing || (!sheltered && next.player === next.ghost);
  if (next.lost) return next;
  if (action === 'knock' || (action === 'move' && rooms[dest].creaks)) {
    next.noise = dest === next.ghost ? null : dest;
  }
  if (dest === 2) next.hasKey = true;
  if (dest === 7 && next.hasKey) next.hasStriker = true;
  next.won = next.hasStriker && dest === 0;
  return next;
}
export function forecast(state: HouseState): [number, number] {
  const first = advancePatrol(state);
  return [first.ghost, advancePatrol(first).ghost];
}
