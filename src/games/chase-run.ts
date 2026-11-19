import {
  accessibleNeighbors,
  distances,
  DIRECTIONS,
  ID,
  makeVillage,
  xOf,
  yOf,
  type Direction,
  type Village
} from './chase-model';
import type { Clue } from '../types';

interface Actor {
  at: number;
  from: number;
  moved: number;
}
const actorAt = (at: number): Actor => ({ at, from: at, moved: -1000 });
export type ChaseThreat = 'near' | 'ward' | 'patrol';

/** Grid movement and BFS are deterministic. Phaser supplies elapsed time and presents the result. */
export class ChaseRun {
  readonly village: Village;
  readonly remaining: Set<number>;
  readonly player: Actor;
  readonly ghosts: Array<Actor & { way: number }>;
  time = 0;
  facing: Direction = 'right';
  charges: number;
  phase: 'watch' | 'won' | 'lost' = 'watch';
  private moves = 0;
  private nextMove = 0;
  private nextGhost = 0;
  private wardUntil = 0;

  constructor(
    readonly night: number,
    clues: Clue[],
    private cue: (name: string) => void
  ) {
    this.village = makeVillage(night, clues);
    this.remaining = new Set(this.village.coins);
    this.player = actorAt(this.village.spawn);
    this.ghosts = this.village.starts.map((at, way) => ({ ...actorAt(at), way }));
    this.charges = night >= 5 ? 3 : 2;
  }
  get ward() {
    return this.wardUntil > this.time;
  }
  get radius() {
    return this.night >= 5 ? 7 : 5;
  }
  get threat(): ChaseThreat {
    if (this.ward) return 'ward';
    const paths = distances(this.player.at, this.village.walls);
    return this.ghosts.some((ghost) => (paths.get(ghost.at) ?? Infinity) <= this.radius) ? 'near' : 'patrol';
  }
  position(actor: Actor, duration: number, reduced: boolean): [number, number] {
    const ratio = reduced ? 1 : Math.min(1, Math.max(0, (this.time - actor.moved) / duration));
    return [
      xOf(actor.from) + (xOf(actor.at) - xOf(actor.from)) * ratio + 0.5,
      yOf(actor.from) + (yOf(actor.at) - yOf(actor.from)) * ratio + 0.5
    ];
  }
  private setPosition(actor: Actor, next: number) {
    actor.from = actor.at;
    actor.at = next;
    actor.moved = this.time;
  }
  move(direction: Direction) {
    if (this.phase !== 'watch' || this.time < this.nextMove) return;
    this.facing = direction;
    const [dx, dy] = DIRECTIONS[direction],
      next = ID(xOf(this.player.at) + dx, yOf(this.player.at) + dy);
    if (this.village.walls.has(next)) {
      this.nextMove = this.time + 70;
      return;
    }
    if (this.moves++ === 0) this.nextGhost = this.time + 1800;
    this.nextMove = this.time + 140;
    this.setPosition(this.player, next);
    if (this.remaining.delete(next)) this.cue(this.remaining.size ? 'coin' : 'gate');
    if (!this.ward && this.ghosts.some((g) => g.at === next)) this.phase = 'lost';
    else if (next === this.village.gate && !this.remaining.size) this.phase = 'won';
  }
  raise() {
    if (this.phase !== 'watch' || this.ward || !this.charges) return;
    this.charges--;
    this.wardUntil = this.time + 4000;
    this.cue('lantern');
  }
  private patrol() {
    const { walls, waypoints } = this.village;
    const path = distances(this.player.at, walls);
    for (const ghost of this.ghosts) {
      let metric = path;
      if (!this.ward && (path.get(ghost.at) ?? Infinity) > this.radius) {
        let goal = waypoints[ghost.way % waypoints.length];
        if (goal === ghost.at) {
          ghost.way++;
          goal = waypoints[ghost.way % waypoints.length];
        }
        metric = distances(goal, walls);
      }
      const choices = accessibleNeighbors(ghost.at, walls).filter(
        (at) => !this.ghosts.some((other) => other !== ghost && other.at === at)
      );
      const score = (at: number) => metric.get(at) ?? Infinity;
      choices.sort((a, b) => (this.ward ? score(b) - score(a) : score(a) - score(b)));
      if (choices.length) this.setPosition(ghost, choices[0]);
      if (!this.ward && ghost.at === this.player.at) {
        this.phase = 'lost';
        return;
      }
    }
  }
  step(delta: number, held?: Direction) {
    if (this.phase !== 'watch') return;
    this.time += Math.min(70, Math.max(0, delta));
    if (this.wardUntil && !this.ward) {
      this.wardUntil = 0;
      if (this.ghosts.some((g) => g.at === this.player.at)) {
        this.phase = 'lost';
        return;
      }
    }
    if (held) this.move(held);
    if (this.phase === 'watch' && this.moves >= 3 && this.time >= this.nextGhost) {
      this.nextGhost = this.time + Math.max(510, 935 - this.night * 49);
      this.patrol();
    }
  }
}
