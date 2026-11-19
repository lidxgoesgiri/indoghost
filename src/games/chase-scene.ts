import Phaser from 'phaser';
import { WIDTH, HEIGHT, TILE, KEYS, xOf, yOf, type Direction } from './chase-model';
import { terrain, drawCoin, drawGate, drawPlayer, drawTuyul } from './chase-art';
import { ChaseRun, type ChaseThreat } from './chase-run';
import { TEXT } from './chase-copy';
import type { GameOptions, GamePreferences } from '../types';

export interface ChaseHUD {
  coins: number;
  total: number;
  charges: number;
  threat: ChaseThreat;
  at: number;
  ward: boolean;
}
type Sprite = Phaser.GameObjects.Image;
export class ChaseScene extends Phaser.Scene {
  private hero?: Sprite;
  private gate?: Sprite;
  private spirits: Sprite[] = [];
  private coins = new Map<number, Sprite>();
  private held: Array<{ code: string; dir: Direction }> = [];
  private touch?: Direction;
  private finished = false;
  private ready = false;
  private snapshot = '';
  private threatKey = '';
  private threat: ChaseThreat = 'patrol';
  private appliedThreat = -1;
  private disposed = false;
  private pausedByShell = false;

  constructor(
    readonly run: ChaseRun,
    private options: GameOptions,
    private preferences: () => GamePreferences,
    private active: () => boolean,
    private hud: (state: ChaseHUD) => void
  ) {
    super('tuyul-chase');
  }
  private makeTexture(key: string, size: number, paint: (ctx: CanvasRenderingContext2D) => void, center = 0) {
    const texture = this.textures.createCanvas(key, size, size);
    if (!texture) throw new Error('Unable to create ' + key);
    const ctx = texture.context;
    ctx.save();
    ctx.translate(size / 2 - center, size / 2 - center);
    paint(ctx);
    ctx.restore();
    texture.refresh();
  }
  create() {
    if (this.disposed) return;
    const { village } = this.run;
    this.textures.addCanvas('village', terrain(village, this.run.night));
    this.add.image(0, 0, 'village').setOrigin(0);
    this.makeTexture('coin', 48, (ctx) => drawCoin(ctx, 0), 24);
    for (const open of [false, true])
      this.makeTexture('gate-' + open, 112, (ctx) => drawGate(ctx, 0, open), 24);
    for (const ward of [false, true]) {
      this.makeTexture('spirit-' + ward, 84, (ctx) => drawTuyul(ctx, 0, 0, ward));
      for (const dir of ['up', 'down', 'left', 'right'] as const)
        this.makeTexture('keeper-' + dir + '-' + ward, 204, (ctx) => drawPlayer(ctx, 0, 0, dir, ward));
    }
    const spriteAt = (cell: number, key: string) =>
      this.add.image((xOf(cell) + 0.5) * TILE, (yOf(cell) + 0.5) * TILE, key);
    this.gate = spriteAt(village.gate, 'gate-false');
    for (const id of village.coins) this.coins.set(id, spriteAt(id, 'coin'));
    this.spirits = village.starts.map((id) => spriteAt(id, 'spirit-false'));
    this.hero = spriteAt(village.spawn, 'keeper-right-false');
    const keyboard = this.input.keyboard;
    keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (!this.active() || this.finished || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input,select,textarea,[contenteditable=true]')) return;
      const dir = KEYS[event.key.length === 1 ? event.key.toLowerCase() : event.key];
      if (dir) {
        event.preventDefault();
        if (!event.repeat && !this.held.some((k) => k.code === event.code)) {
          this.held.push({ dir, code: event.code });
          this.run.move(dir);
          this.present();
        }
      } else if (event.code === 'Space' && !target?.closest('button,a,[role=button]')) {
        event.preventDefault();
        if (!event.repeat) this.lantern();
      }
    });
    keyboard?.on('keyup', (event: KeyboardEvent) => {
      this.held = this.held.filter((k) => k.code !== event.code);
    });
    this.ready = true;
    const canvas = this.game.canvas;
    canvas.setAttribute('role', 'img');
    canvas.tabIndex = 0;
    this.scale.refresh();
    if (this.active()) canvas.focus({ preventScroll: true });
    this.present();
    if (this.pausedByShell) this.pauseRun();
  }
  private present() {
    if (!this.hero || !this.gate || this.disposed || this.finished) return;
    const run = this.run,
      reduced = this.preferences().reducedMotion;
    const renderActor = (sprite: Sprite, actor: typeof run.player, key: string, ms: number) => {
      const [x, y] = run.position(actor, ms, reduced);
      sprite.setPosition(x * TILE, y * TILE);
      if (sprite.texture.key !== key) sprite.setTexture(key);
    };
    renderActor(this.hero, run.player, 'keeper-' + run.facing + '-' + run.ward, 105);
    this.spirits.forEach((spirit, i) => renderActor(spirit, run.ghosts[i], 'spirit-' + run.ward, 230));
    for (const [at, coin] of this.coins)
      if (!run.remaining.has(at)) {
        coin.destroy();
        this.coins.delete(at);
      }
    const gateKey = 'gate-' + !run.remaining.size;
    if (this.gate.texture.key !== gateKey) this.gate.setTexture(gateKey);
    if (run.phase !== 'watch') {
      this.finished = true;
      if (run.phase === 'won') this.options.onWin({ coins: run.village.coins.size, flame: run.charges + 1 });
      else this.options.onLose(TEXT[this.preferences().lang].lost);
      return;
    }
    const threatKey = [run.player.at, ...run.ghosts.map((g) => g.at), run.ward].join('/');
    if (threatKey !== this.threatKey) {
      this.threat = run.threat;
      this.threatKey = threatKey;
    }
    const level = this.threat === 'near' ? 1 : 0;
    if (level !== this.appliedThreat) {
      this.appliedThreat = level;
      this.options.onThreat(level);
    }
    const key = [run.remaining.size, run.charges, run.player.at, this.threat].join('/');
    if (key !== this.snapshot) {
      this.snapshot = key;
      this.hud({
        coins: run.village.coins.size - run.remaining.size,
        total: run.village.coins.size,
        charges: run.charges,
        threat: this.threat,
        at: run.player.at,
        ward: run.ward
      });
    }
  }
  update(_time: number, delta: number) {
    if (!this.ready || !this.active() || this.finished) return;
    this.run.step(delta, this.touch ?? this.held.at(-1)?.dir);
    this.present();
  }
  direction(dir: Direction, hold: boolean) {
    if (!this.active() || this.finished) return;
    if (hold) this.touch = dir;
    this.run.move(dir);
    this.present();
  }
  release() {
    this.touch = undefined;
  }
  lantern() {
    if (this.active() && !this.finished) {
      this.run.raise();
      this.present();
    }
  }
  pauseRun() {
    this.pausedByShell = true;
    this.held = [];
    this.release();
    if (this.ready && !this.disposed) {
      this.scene.pause();
      this.game.loop.sleep();
    }
  }
  resumeRun() {
    this.pausedByShell = false;
    if (this.ready && !this.disposed) {
      this.scene.resume();
      this.game.loop.wake();
      this.game.canvas.focus({ preventScroll: true });
    }
  }
  closeRun() {
    this.disposed = true;
    this.held = [];
    this.release();
  }
}
export function createPhaser(host: HTMLElement, inputTarget: HTMLElement, scene: ChaseScene) {
  return new Phaser.Game({
    type: Phaser.CANVAS,
    width: WIDTH,
    height: HEIGHT,
    parent: host,
    scene: [scene],
    audio: { noAudio: true },
    banner: false,
    backgroundColor: '#222b23',
    autoFocus: false,
    input: { keyboard: { target: inputTarget }, mouse: false, touch: false, gamepad: false },
    scale: { mode: Phaser.Scale.NONE, expandParent: false },
    canvasStyle: 'width:100%;height:auto;display:block',
    fps: { target: 60 }
  });
}
