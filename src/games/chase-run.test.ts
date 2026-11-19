import { expect, it } from 'vitest';
import { ChaseRun } from './chase-run';

function wait(run: ChaseRun, ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += 10) run.step(Math.min(10, ms - elapsed));
}

it('tidak menggerakkan patroli sebelum tiga langkah awal; musuh akhirnya mengejar', () => {
  const run = new ChaseRun(1, [], () => {});
  const initial = run.ghosts.map((g) => g.at);
  run.move('right');
  wait(run, 5000);
  expect(run.ghosts.map((g) => g.at)).toEqual(initial);
  run.move('right');
  wait(run, 140);
  run.move('right');
  for (let t = 0; run.phase === 'watch' && t < 180000; t += 50) run.step(50);
  expect(run.phase).toBe('lost');
});

it('mengambil satu koin sekali dan membatasi nyala pelindung selama empat detik', () => {
  const cues: string[] = [];
  const run = new ChaseRun(1, [], (name) => cues.push(name));
  run.move('right');
  expect(run.remaining.size).toBe(4);
  expect(cues).toEqual(['coin']);
  run.raise();
  run.raise();
  expect(cues).toEqual(['coin', 'lantern']);
  expect(run.charges).toBe(1);
  wait(run, 3990);
  expect(run.ward).toBe(true);
  wait(run, 10);
  expect(run.ward).toBe(false);
  run.raise();
  expect(run.charges).toBe(0);
  wait(run, 4000);
  run.raise();
  expect(run.ward).toBe(false);
});
