import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { ID, distances, makeVillage } from './chase-model';
import { deduction, floors, makeFloor } from './sweeper-model';
import {
  advance,
  advancePatrol,
  forecast,
  freshState,
  rooms,
  type HouseState,
  type TurnAction
} from './escape-model';

describe('Chase – peta dan koin dari kampanye pertama', () => {
  const coins = [
    [155, 167, 52, 107, 24],
    [155, 134, 104, 22, 124, 35],
    [155, 160, 133, 129, 87, 39, 26],
    [155, 82, 166, 69, 94, 26, 123, 21]
  ];
  it.each([1, 3, 5, 7])('mempertahankan posisi dan akses pada malam %i', (night) => {
    const map = makeVillage(night, night === 7 ? ['dawn-seal'] : []);
    expect([...map.coins]).toEqual(coins[(night - 1) / 2]);
    const reachable = distances(map.spawn, map.walls);
    for (const cell of [...map.coins, map.gate, ...map.starts]) expect(reachable.has(cell)).toBe(true);
    expect(map.starts).toHaveLength(night >= 5 ? 2 : 1);
  });
  it('jurnal membuka jalan pintas tanpa menghalangi latihan tanpa petunjuk', () => {
    const closed = makeVillage(7, []),
      open = makeVillage(7, ['brass-key']);
    expect(closed.passage).toEqual([]);
    expect(open.passage).toEqual([ID(7, 2), ID(7, 3)]);
    expect(distances(closed.spawn, closed.walls).has(closed.gate)).toBe(true);
  });
});
describe('Sweeper – deduksi dari informasi publik', () => {
  for (const layout of floors)
    it('selalu menuntaskan ' + layout.clue + ' walau ada tanda keliru', () => {
      const floor = makeFloor(layout);
      fc.assert(
        fc.property(fc.array(fc.integer({ min: 0, max: floor.cells.length - 1 })), (badMarkers) => {
          const open = new Set(floor.inscriptions),
            cages = new Set(badMarkers.filter((i) => !open.has(i))),
            exposed = new Set<number>();
          for (let n = 0; open.size < floor.cells.length - floor.spirit.size; n++) {
            expect(n).toBeLessThan(floor.cells.length * 3);
            const hint = deduction(floor, open, cages, exposed);
            if (!hint) throw new Error('Papan buntu');
            if (hint.action === 'open') {
              expect(floor.spirit.has(hint.target)).toBe(false);
              if (!cages.delete(hint.target)) open.add(hint.target);
            } else {
              expect(floor.spirit.has(hint.target)).toBe(true);
              cages.add(hint.target);
            }
          }
        }),
        { numRuns: 100, seed: 91 }
      );
    });
});
describe('Escape – denah, prediksi dan kondisi akhir', () => {
  it('setiap keadaan aktif memiliki jalan pulang; prediksi selalu satu pintu', () => {
    const key = (s: HouseState) =>
      [s.player, s.ghost, s.patrolIndex, s.noise, s.hasKey, s.hasStriker].join('/');
    const initial = freshState(),
      queue = [initial],
      seen = new Set([key(initial)]),
      predecessors = new Map<string, Set<string>>(),
      canWin = new Set<string>();
    let death = false;
    for (let n = 0; n < queue.length; n++) {
      const state = queue[n],
        id = key(state);
      const [first, second] = forecast(state);
      expect(rooms[state.ghost].near).toContain(first);
      expect(rooms[first].near).toContain(second);
      expect(advancePatrol(state).ghost).toBe(first);
      const actions: [TurnAction, number][] = [
        ['wait', state.player],
        ['knock', state.player]
      ];
      for (const dest of rooms[state.player].near) if (dest !== 7 || state.hasKey) actions.push(['move', dest]);
      for (const [action, dest] of actions) {
        const next = advance(state, action, dest),
          nextKey = key(next);
        if (next.lost) {
          death = true;
          continue;
        }
        if (next.won) {
          canWin.add(id);
          continue;
        }
        const parents = predecessors.get(nextKey) ?? new Set<string>();
        parents.add(id);
        predecessors.set(nextKey, parents);
        if (!seen.has(nextKey)) {
          seen.add(nextKey);
          queue.push(next);
        }
      }
    }
    const backward = [...canWin];
    for (let i = 0; i < backward.length; i++)
      for (const parent of predecessors.get(backward[i]) ?? [])
        if (!canWin.has(parent)) {
          canWin.add(parent);
          backward.push(parent);
        }
    expect(death).toBe(true);
    expect(seen.size).toBe(2480);
    expect(canWin.size).toBe(seen.size);
  });
});
