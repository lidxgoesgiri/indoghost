import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { GameOptions } from '../types';
import { mountBoard, type BoardProps } from './board';
import { coordinates, deduction, floors, makeFloor } from './sweeper-model';
import { copy } from './sweeper-copy';
import './sweeper.css';

type Tool = 'open' | 'cage';
type Words = (typeof copy)['en'];
type Advice = (words: Words) => string;
interface GameState {
  open: Set<number>;
  cages: Set<number>;
  exposed: Set<number>;
  spent: boolean;
  lives: number;
  tool: Tool;
  hint: { source?: number | null; target: number } | null;
  message: Advice;
}
function Board({ options, lang, active }: BoardProps) {
  const floor = useMemo(
    () => makeFloor(floors[options.night >= 6 ? 2 : options.night >= 4 ? 1 : 0]),
    [options.night]
  );
  const t = copy[lang];
  const safeTotal = floor.cells.length - floor.spirits.length;
  const [state, setState] = useState<GameState>(() => ({
    open: new Set(floor.inscriptions),
    cages: new Set(),
    exposed: new Set(),
    spent: false,
    lives: 2,
    tool: 'open',
    hint: null,
    message: (words) => words.start
  }));
  const first = floor.inscriptions.find((i) => floor.counts[i] === 0) ?? floor.inscriptions[0];
  const [cursor, setCursor] = useState(first);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const finished = useRef(false);
  useLayoutEffect(() => {
    buttons.current[first]?.focus({ preventScroll: true });
  }, [first]);
  const address = (i: number) => coordinates(i, floor.width);
  const playable = () => !finished.current && active();

  function commit(next: GameState) {
    setState(next);
    if (next.open.size === safeTotal) {
      finished.current = true;
      options.onWin({ coins: 0, flame: next.spent ? -1 : 0, clue: floor.clue });
    }
  }
  function activate(i: number, chosen: Tool) {
    if (!playable()) return;
    const pos = address(i);
    const next = { ...state, hint: null };
    setCursor(i);
    if (state.open.has(i)) next.message = (words) => words.count(pos, floor.counts[i]);
    else if (state.exposed.has(i)) next.message = (words) => pos + '. ' + words.caught + '.';
    else if (chosen === 'cage') {
      next.cages = new Set(state.cages);
      const lifted = next.cages.delete(i);
      if (!lifted) next.cages.add(i);
      next.message = (words) => (lifted ? words.lifted(pos) : words.placed(pos));
      options.onCue('cage');
    } else if (state.cages.has(i)) next.message = (words) => words.unblock;
    else if (floor.spirit.has(i)) {
      next.exposed = new Set(state.exposed).add(i);
      next.lives--;
      if (next.lives === 0) {
        finished.current = true;
        setState(next);
        options.onLose(t.defeat);
        return;
      }
      options.onThreat(0.65);
      options.onCue('error');
      next.message = (words) => words.spotted;
    } else {
      next.open = new Set(state.open).add(i);
      next.message = (words) => words.count(pos, floor.counts[i]);
      options.onCue('tile');
    }
    commit(next);
  }
  function ask() {
    if (!playable()) return;
    const hint = deduction(floor, state.open, state.cages, state.exposed);
    if (!hint) return;
    const pos = address(hint.target);
    const message: Advice = (words) => {
      const source = hint.source === null ? words.lampSource : words.tileSource(address(hint.source));
      if (hint.action === 'cage') return words.trap(source, hint.count, hint.left, pos);
      const reason = hint.count === 0 ? words.zero(source, pos) : words.full(source, hint.count, pos);
      return state.cages.has(hint.target) ? reason + ' ' + words.remove(pos) : reason;
    };
    setState({ ...state, hint, message });
    options.onCue('hint');
  }
  function burn() {
    if (!playable() || state.spent || options.flame < 1) return;
    const target = floor.cells.find((i) => !floor.spirit.has(i) && !state.open.has(i));
    if (target === undefined) return;
    const cages = new Set(state.cages);
    cages.delete(target);
    options.onCue('hint');
    commit({
      ...state,
      cages,
      open: new Set(state.open).add(target),
      spent: true,
      hint: { target },
      message: (words) => words.charmed(address(target))
    });
  }
  function keyboard(event: KeyboardEvent<HTMLElement>) {
    if (!playable() || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key.toLowerCase() === 'h') {
      event.preventDefault();
      ask();
      return;
    }
    if (!(event.target instanceof HTMLButtonElement) || event.target.dataset.index === undefined) return;
    const i = Number(event.target.dataset.index),
      col = i % floor.width;
    let next = i;
    switch (event.key) {
      case 'ArrowUp':
        if (i >= floor.width) next -= floor.width;
        break;
      case 'ArrowDown':
        if (i + floor.width < floor.cells.length) next += floor.width;
        break;
      case 'ArrowLeft':
        if (col > 0) next--;
        break;
      case 'ArrowRight':
        if (col < floor.width - 1) next++;
        break;
      case 'Home':
        next -= col;
        break;
      case 'End':
        next += floor.width - col - 1;
        break;
      case 'f':
      case 'F':
        event.preventDefault();
        if (!event.repeat) activate(i, 'cage');
        return;
      default:
        return;
    }
    event.preventDefault();
    buttons.current[next]?.focus();
  }
  function tile(i: number) {
    const open = state.open.has(i);
    const digit = floor.counts[i];
    const kind = open ? 'digit' : state.exposed.has(i) ? 'caught' : state.cages.has(i) ? 'cage' : 'closed';
    const label = open
      ? t.count(address(i), digit)
      : address(i) + '. ' + (kind === 'caught' ? t.caught : kind === 'cage' ? t.marked : t.closed);
    const icon = kind === 'caught' ? 'sweep-footprints' : kind === 'cage' ? 'sweep-cage' : 'sweep-flower';
    return (
      <div role="gridcell" key={i}>
        {i < floor.width && (
          <span aria-hidden="true" className="sweep-col-label">
            {String.fromCharCode(65 + i)}
          </span>
        )}
        <button
          type="button"
          data-index={i}
          data-state={kind}
          aria-label={label}
          tabIndex={cursor === i ? 0 : -1}
          className={[
            'sweep-tile',
            state.hint?.source === i ? 'sweep-source' : '',
            state.hint?.target === i ? 'sweep-target' : ''
          ].join(' ')}
          ref={(node) => {
            buttons.current[i] = node;
          }}
          onFocus={() => setCursor(i)}
          onClick={() => activate(i, state.tool)}
        >
          {open ? (
            <span aria-hidden="true" className="sweep-digit" data-digit={digit}>
              {digit}
            </span>
          ) : (
            <i aria-hidden="true" className={icon} />
          )}
        </button>
      </div>
    );
  }
  return (
    <section className="sweep-game" aria-label={t.room} lang={lang} onKeyDown={keyboard}>
      <div className="sweep-table">
        <div className="sweep-stats">
          <div>
            <span>{t.safe}</span>
            <b data-stat="safe">
              {state.open.size} / {safeTotal}
            </b>
          </div>
          <div>
            <span>{t.chances}</span>
            <b data-stat="lives">{state.lives} / 2</b>
          </div>
          <div
            className={'sweep-room-lamp' + (state.hint?.source === null ? ' sweep-source' : '')}
            title={t.roomScope}
          >
            <span>{t.lamp}</span>
            <b>
              <i aria-hidden="true" className="sweep-lamp" />
              <span data-stat="spirits">{floor.spirits.length}</span>
            </b>
          </div>
        </div>
        <div className="sweep-tile-frame">
          <div
            className="sweep-grid"
            role="grid"
            aria-label={t.grid}
            aria-colcount={floor.width}
            aria-rowcount={floor.height}
            style={{ '--sweep-cols': floor.width } as CSSProperties}
          >
            {Array.from({ length: floor.height }, (_, row) => (
              <div className="sweep-row" role="row" key={row}>
                <span className="sweep-row-label" aria-hidden="true">
                  {row + 1}
                </span>
                {floor.cells.slice(row * floor.width, (row + 1) * floor.width).map(tile)}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="sweep-controls">
        <h3>{t.room}</h3>
        <p className="sweep-rules">{t.rule}</p>
        <div className="sweep-tools" role="group" aria-label={t.method}>
          {(['open', 'cage'] as const).map((tool) => (
            <button
              key={tool}
              type="button"
              data-action={tool}
              aria-pressed={tool === state.tool}
              onClick={() => {
                if (playable()) setState({ ...state, tool });
              }}
            >
              <i aria-hidden="true" className={tool === 'open' ? 'sweep-open-icon' : 'sweep-cage'} />
              {tool === 'open' ? t.reveal : t.cage}
            </button>
          ))}
        </div>
        <div className="sweep-advice">
          <span className="sweep-advice-heading">{t.guidance}</span>
          <p role="status" aria-live="polite" aria-atomic="true">
            {state.message(t)}
          </p>
        </div>
        <div className="sweep-aids">
          <button type="button" data-action="hint" onClick={ask}>
            <span className="sweep-hint-icon" aria-hidden="true">
              ?
            </span>
            {t.hint}
          </button>
          <button type="button" data-action="burn" onClick={burn} disabled={state.spent || options.flame < 1}>
            <i className="sweep-lamp" aria-hidden="true" />
            {t.burn}
          </button>
        </div>
        <p className="sweep-flame-note">{state.spent ? t.spent : options.flame < 1 ? t.empty : t.cost}</p>
        <p className="sweep-keys">{t.keys}</p>
      </div>
    </section>
  );
}
export function start(host: HTMLElement, options: GameOptions) {
  return mountBoard(host, options, Board);
}
