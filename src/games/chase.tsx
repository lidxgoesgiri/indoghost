import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { GameOptions } from '../types';
import { mountBoard, type BoardProps } from './board';
import { ChaseRun } from './chase-run';
import { ChaseScene, createPhaser, type ChaseHUD } from './chase-scene';
import { COLS, ROWS, xOf, yOf, type Direction } from './chase-model';
import { TEXT } from './chase-copy';
import './chase.css';

const arrows: Array<[Direction, string]> = [
  ['up', '↑'],
  ['left', '←'],
  ['down', '↓'],
  ['right', '→']
];
function Board({ options, lang, reducedMotion, active, register }: BoardProps) {
  const root = useRef<HTMLElement>(null),
    stage = useRef<HTMLDivElement>(null);
  const ref = useRef<ChaseScene | null>(null),
    prefs = useRef({ lang, reducedMotion });
  const pointer = useRef<number | null>(null);
  const run = useMemo(() => new ChaseRun(options.night, options.clues, options.onCue), [options]);
  const [hud, setHud] = useState<ChaseHUD>({
    coins: 0,
    total: run.remaining.size,
    charges: run.charges,
    threat: 'patrol',
    at: run.player.at,
    ward: false
  });
  const t = TEXT[lang],
    gate = run.village.gate;
  const corner =
    yOf(gate) > ROWS / 2
      ? xOf(gate) > COLS / 2
        ? t.lowerEast
        : t.lowerWest
      : xOf(gate) > COLS / 2
        ? t.east
        : t.west;
  const objective =
    (hud.coins === hud.total ? t.open : t.goal).replace('{corner}', corner) +
    (run.village.passage.length ? ' ' + t.passage : '');
  const label =
    t.map +
    '. ' +
    t.you +
    '. ' +
    t.at.replace('{x}', String(xOf(hud.at))).replace('{y}', String(yOf(hud.at))) +
    ' ' +
    objective;
  useLayoutEffect(() => {
    prefs.current = { lang, reducedMotion };
    stage.current?.querySelector('canvas')?.setAttribute('aria-label', label);
  }, [lang, reducedMotion, label]);
  useLayoutEffect(() => {
    if (!root.current || !stage.current) return;
    const scene = new ChaseScene(run, options, () => prefs.current, active, setHud);
    ref.current = scene;
    const game = createPhaser(stage.current, root.current, scene);
    game.canvas.setAttribute('aria-label', label);
    let destroyed = false;
    const destroy = () => {
      if (destroyed) return;
      destroyed = true;
      ref.current = null;
      scene.closeRun();
      // Phaser disposes textures, scene input and renderer on the next step.
      game.destroy(true);
      if (game.isRunning && !game.loop.running) game.loop.wake();
    };
    register({
      pause() {
        pointer.current = null;
        scene.pauseRun();
      },
      resume() {
        scene.resumeRun();
      },
      destroy
    });
    return destroy;
    // Run identity lasts for the whole attempt. Text and motion preferences are read through the ref.
  }, [run, options, active, register]);
  const release = (id: number) => {
    if (pointer.current === id) {
      pointer.current = null;
      ref.current?.release();
    }
  };
  return (
    <section className="chase-game" lang={lang} ref={root}>
      <div className="chase-hud">
        <div>
          <span>{t.coins}</span>
          <strong data-value="coins">
            {hud.coins} / {hud.total}
          </strong>
        </div>
        <div>
          <span>{t.oil}</span>
          <strong data-value="oil">{hud.charges}</strong>
        </div>
        <div>
          <span>{t.threat}</span>
          <strong data-value="threat" data-state={hud.threat}>
            {t[hud.threat]}
          </strong>
        </div>
      </div>
      <div className="chase-stage" ref={stage} />
      <div className="chase-legend" aria-hidden="true">
        {[
          ['player', t.legendPlayer],
          ['coin', t.legendCoin],
          ['ghost', t.legendTuyul],
          ['gate', t.cross]
        ].map(([icon, title]) => (
          <span key={icon}>
            <i className={'chase-token-' + icon} />
            {title}
          </span>
        ))}
      </div>
      <p className="chase-objective" aria-live="polite" aria-atomic="true">
        {objective}
      </p>
      <div className="chase-inputs">
        <div className="chase-pad" role="group" aria-label={t.move}>
          {arrows.map(([dir, glyph]) => (
            <button
              key={dir}
              type="button"
              data-dir={dir}
              className={'chase-dir chase-dir-' + dir}
              aria-label={t.move + ' · ' + t[dir]}
              onPointerDown={(event) => {
                if (event.button !== 0 || pointer.current !== null) return;
                event.preventDefault();
                pointer.current = event.pointerId;
                event.currentTarget.setPointerCapture(event.pointerId);
                ref.current?.direction(dir, true);
              }}
              onPointerUp={(event) => release(event.pointerId)}
              onPointerCancel={(event) => release(event.pointerId)}
              onLostPointerCapture={(event) => release(event.pointerId)}
              onClick={(event) => {
                if (event.detail === 0) ref.current?.direction(dir, false);
              }}
            >
              {glyph}
            </button>
          ))}
        </div>
        <div className="chase-instructions">
          <p className="chase-keys">{t.move} · WASD / ↑ ← ↓ →</p>
          <p className="chase-hint">{t.hint}</p>
        </div>
        <button
          type="button"
          className="chase-lamp"
          disabled={hud.charges === 0 || hud.ward}
          title={t.lamp + ' (' + t.space + ')'}
          onClick={() => ref.current?.lantern()}
        >
          <span className="chase-lamp-mark" aria-hidden="true" />
          <span className="chase-lamp-label">{t.lamp}</span>
          <kbd aria-hidden="true">{t.space}</kbd>
        </button>
      </div>
      <div className="chase-sr" aria-live="polite" aria-atomic="true">
        {hud.coins} / {hud.total} {t.coins}. {t.threat} · {t[hud.threat]}.
      </div>
    </section>
  );
}
export function start(host: HTMLElement, options: GameOptions) {
  return mountBoard(host, options, Board);
}
