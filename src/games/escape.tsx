import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { GameOptions } from '../types';
import { mountBoard, type BoardProps } from './board';
import { advance, forecast, freshState, rooms, type TurnAction } from './escape-model';
import { sprites, icons } from './escape-art';
import './escape.css';

type Icon = keyof typeof icons;
type Mark = [Icon, string, string];
const keys: Partial<Record<string, number>> = {
  ArrowUp: -3,
  ArrowDown: 3,
  ArrowLeft: -1,
  ArrowRight: 1,
  w: -3,
  s: 3,
  a: -1,
  d: 1
};
const sides: Record<number, string> = { 1: 'east', [-1]: 'west', 3: 'south', [-3]: 'north' };

function Drawing({
  mark,
  viewBox = '0 0 24 24',
  className
}: {
  mark: string;
  viewBox?: string;
  className?: string;
}) {
  // All paths are local, original floor-plan artwork declared in escape-art.
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
      viewBox={viewBox}
      dangerouslySetInnerHTML={{ __html: mark }}
    />
  );
}
function MarkIcon({ mark: [icon, label, cls] }: { mark: Mark }) {
  return (
    <span className={'ige-token ' + cls} title={label} aria-hidden="true">
      <Drawing mark={icons[icon]} />
    </span>
  );
}
function Board({ options, lang, reducedMotion, active }: BoardProps) {
  const [state, setState] = useState(freshState);
  const [listening, setListening] = useState(false);
  const [eventName, setEvent] = useState('start');
  const game = useRef<HTMLElement>(null);
  const finished = useRef(false);
  const roomButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const focusAfterMove = useRef<number | null>(null);
  const lastThreat = useRef(-1);
  const t = (en: string, id: string) => (lang === 'id' ? id : en);
  const roomName = (i: number) => rooms[i].name[lang === 'en' ? 0 : 1];
  const next = forecast(state);
  const unsafe = rooms[state.player].near.filter(
    (i) => (i !== 7 || state.hasKey) && advance(state, 'move', i).lost
  );
  const threat = state.ghost === state.player ? 1 : unsafe.length ? 0.8 : 0;
  useLayoutEffect(() => {
    game.current?.focus({ preventScroll: true });
  }, []);
  useLayoutEffect(() => {
    if (active() && threat !== lastThreat.current) {
      lastThreat.current = threat;
      options.onThreat(threat);
    }
    if (focusAfterMove.current !== null) {
      roomButtons.current[focusAfterMove.current]?.focus({ preventScroll: true });
      focusAfterMove.current = null;
    }
  }, [active, options, threat, state]);
  function play(action: TurnAction | 'listen', dest = state.player) {
    if (!active() || finished.current) return;
    if (action === 'listen') {
      setListening(true);
      setEvent('listen');
      options.onCue('hint');
      return;
    }
    if (action === 'move' && (!rooms[state.player].near.includes(dest) || (dest === 7 && !state.hasKey))) {
      setEvent(dest === 7 ? 'locked' : 'blocked');
      return;
    }
    const result = advance(state, action, dest);
    if (result.won || result.lost) {
      finished.current = true;
      if (result.lost)
        options.onLose(
          t(
            'The kuntilanak caught you as your paths crossed.',
            'Kuntilanak menangkapmu ketika jalan kalian bertemu.'
          )
        );
      else options.onWin({ coins: 0, flame: 0, clue: 'dawn-seal' });
      return;
    }
    const event =
      !state.hasKey && result.hasKey
        ? 'key'
        : !state.hasStriker && result.hasStriker
          ? 'striker'
          : action === 'knock'
            ? 'knock'
            : action === 'wait'
              ? rooms[dest].cover
                ? 'cover'
                : 'wait'
              : rooms[dest].creaks
                ? 'noise'
                : rooms[dest].cover
                  ? 'cover'
                  : 'walk';
    if (action === 'move' && document.activeElement?.hasAttribute('data-room'))
      focusAfterMove.current = state.player;
    setListening(false);
    setState(result);
    setEvent(event);
    options.onCue(event === 'key' || event === 'striker' ? 'coin' : action === 'knock' ? 'cage' : 'tile');
  }
  function keyboard(event: KeyboardEvent<HTMLElement>) {
    if (!active() || event.altKey || event.metaKey || event.ctrlKey) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const delta = keys[key];
    if (delta === undefined && !['l', 'k', ' '].includes(key)) return;
    if (
      key === ' ' &&
      event.target instanceof Element &&
      event.target.closest('button')?.dataset.action !== 'wait' &&
      event.target.closest('button')
    )
      return;
    event.preventDefault();
    if (event.repeat) return;
    if (delta !== undefined) play('move', state.player + delta);
    else play(key === 'l' ? 'listen' : key === 'k' ? 'knock' : 'wait');
  }
  const messages: Record<string, string> = {
    start: t(
      'Move into a room with a lit border. Curtains offer cover when the spirit passes.',
      'Masuk ke bilik bergaris terang. Tirai melindungimu saat hantu melintas.'
    ),
    listen:
      t('Listen closely. Her next two steps: ', 'Dengarkan. Dua langkah berikutnya: ') +
      roomName(next[0]) +
      ' → ' +
      roomName(next[1]) +
      '.',
    key: t(
      'You found the storeroom key beneath the folded batik.',
      'Kunci gudang ditemukan di bawah lipatan batik.'
    ),
    striker: t(
      'You have the gong striker. Return to the veranda.',
      'Pemukul kentongan sudah di tangan. Kembali ke serambi.'
    ),
    noise: t(
      'The floor creaks. She turns toward the sound.',
      'Lantai berderit. Ia berbalik ke arah bunyi itu.'
    ),
    knock: t(
      'Your knock carries through the house. Move away before she reaches it.',
      'Ketukanmu menggema. Menjauhlah sebelum ia tiba.'
    ),
    cover: t('You draw the curtain and let her pass.', 'Kautarik tirai dan membiarkannya lewat.'),
    walk: t('You slip through the doorway.', 'Kau menyelinap melewati ambang pintu.'),
    wait: t('You hold still and wait one turn.', 'Kau diam menunggu satu giliran.'),
    locked: t('The storeroom needs its key from the linen room.', 'Gudang memerlukan kunci dari bilik kain.'),
    blocked: t('There is no doorway in that direction.', 'Tidak ada pintu ke arah itu.')
  };

  const player: Mark = ['player', t('You', 'Kamu'), 'ige-player'];
  const spirit: Mark = ['spirit', 'Kuntilanak', 'ige-spirit'];
  const tracks: Mark = ['tracks', t('Next patrol step', 'Langkah hantu berikutnya'), 'ige-tracks'];
  const cover: Mark = ['cover', t('Curtain cover', 'Tirai pelindung'), 'ige-feature'];
  const wood: Mark = ['wood', t('Creaking floor', 'Lantai berderit'), 'ige-feature'];
  const controls = [
    ['listen', 'ear', t('Listen ahead', 'Dengarkan'), 'L'],
    [
      'wait',
      'clock',
      rooms[state.player].cover ? t('Hide and wait', 'Bersembunyi') : t('Wait one turn', 'Tunggu'),
      t('Space', 'Spasi')
    ],
    ['knock', 'knock', t('Knock to lure', 'Ketuk pemancing'), 'K']
  ] as const;
  const inventory = [
    ['key', state.hasKey, t('Key', 'Kunci')],
    ['striker', state.hasStriker, t('Striker', 'Pemukul')]
  ] as const;
  return (
    <section
      className={'ig-escape' + (reducedMotion ? ' ige-still' : '')}
      ref={game}
      tabIndex={-1}
      lang={lang}
      onKeyDown={keyboard}
      aria-label={t('Escape the Kuntilanak', 'Lolos dari Kuntilanak')}
    >
      <div className="ige-head">
        <div className="ige-objective">
          <span className="ige-overline">{t('Objective', 'Tujuan')}</span>
          <strong>
            {!state.hasKey
              ? t('Find the key in the linen room.', 'Temukan kunci di bilik kain.')
              : !state.hasStriker
                ? t('Collect the gong striker in the storeroom.', 'Ambil pemukul kentongan di gudang.')
                : t('Return to the veranda.', 'Kembali ke serambi.')}
          </strong>
        </div>
        <div className="ige-inventory">
          {inventory.map(([id, owned, label]) => (
            <span
              key={id}
              className={'ige-item' + (owned ? ' is-owned' : '')}
              aria-label={
                label + ' · ' + (owned ? t('collected', 'terkumpul') : t('missing', 'belum ditemukan'))
              }
            >
              <Drawing mark={icons[id]} />
              {label}
              {owned && <b>✓</b>}
            </span>
          ))}
        </div>
      </div>
      <div className="ige-layout">
        <div className="ige-board">
          <div
            className="ige-house"
            role="group"
            aria-label={t(
              'House floor plan. Select an adjoining room to move.',
              'Denah rumah. Pilih bilik yang terhubung untuk berpindah.'
            )}
          >
            {rooms.map((room, i) => {
              const here = i === state.player,
                adjacent = rooms[state.player].near.includes(i),
                locked = i === 7 && !state.hasKey,
                haunted = state.ghost === i;
              const marks: Mark[] = [];
              if (here) marks.push(player);
              if (haunted) marks.push(spirit);
              if (i === next[0]) marks.push(tracks);
              if (i === 2 && !state.hasKey)
                marks.push(['key', t('Storeroom key', 'Kunci gudang'), 'ige-treasure']);
              else if (i === 7 && !state.hasStriker)
                marks.push(['striker', t('Gong striker', 'Pemukul kentongan'), 'ige-treasure']);
              else if (i === 0 && state.hasStriker) marks.push(['exit', t('Exit', 'Keluar'), 'ige-treasure']);
              if (room.cover) marks.push(cover);
              if (room.creaks) marks.push(wood);
              const label = [
                roomName(i),
                ...marks.map((mark) => mark[1]),
                locked ? t('Locked', 'Terkunci') : '',
                unsafe.includes(i) ? t('On a collision course', 'Jalur bertabrakan') : ''
              ]
                .filter(Boolean)
                .join(' · ');
              const className = [
                'ige-room',
                here ? 'is-here' : '',
                adjacent ? 'is-adjacent' : '',
                locked ? 'is-locked' : '',
                haunted ? 'is-haunted' : '',
                unsafe.includes(i) ? 'is-unsafe' : ''
              ].join(' ');
              return (
                <button
                  type="button"
                  key={i}
                  className={className}
                  data-room={i}
                  disabled={!adjacent}
                  aria-label={label}
                  title={label}
                  aria-description={
                    locked && adjacent ? t('Find the key first.', 'Temukan kuncinya dahulu.') : undefined
                  }
                  ref={(node) => {
                    roomButtons.current[i] = node;
                  }}
                  onClick={() => play('move', i)}
                >
                  <Drawing mark={sprites[i]} viewBox="0 0 82 51" className="ige-furniture" />
                  {room.near.map((j) => (
                    <i key={j} className={'ige-door ige-door-' + sides[j - i]} />
                  ))}
                  <span className="ige-room-name">{roomName(i)}</span>
                  <span className="ige-room-marks">
                    {marks.map((mark) => (
                      <MarkIcon key={mark[0]} mark={mark} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="ige-legend">
            {[player, spirit, tracks, cover, wood].map((mark) => (
              <span key={mark[0]}>
                <MarkIcon mark={mark} />
                {mark[1]}
              </span>
            ))}
            {unsafe.length > 0 && (
              <span className="ige-hazard-key">
                <b>!</b>
                {t('Collision', 'Tabrakan')}
              </span>
            )}
          </div>
        </div>
        <div className="ige-sidebar">
          <div className="ige-forecast">
            <span className="ige-overline">
              {t('Footsteps / Turn ', 'Langkah / Giliran ')}
              {String(state.turn + 1).padStart(2, '0')}
            </span>
            <strong>
              {roomName(listening ? next[0] : state.ghost)} → {roomName(listening ? next[1] : next[0])}
            </strong>
            <span className="ige-watchtype">
              {state.noise === null
                ? t('Following her patrol.', 'Sedang berpatroli.')
                : t('Investigating a sound in ', 'Menyusuri bunyi di ') + roomName(state.noise) + '.'}
            </span>
          </div>
          <div className="ige-controls">
            {controls.map(([key, icon, label, shortcut]) => (
              <button
                type="button"
                key={key}
                className="ige-control"
                data-action={key}
                onClick={() => play(key)}
              >
                <Drawing mark={icons[icon]} />
                <span>{label}</span>
                <kbd>{shortcut}</kbd>
              </button>
            ))}
          </div>
          <p className="ige-live" role="status" aria-live="polite">
            {messages[eventName]}
          </p>
        </div>
      </div>
      <p className="ige-guidance">
        {t(
          'Tap an adjoining room or move with arrow keys / WASD. Moving, waiting, or knocking advances the patrol. Listening is free. Avoid crossing her doorway as she comes through.',
          'Ketuk bilik yang terhubung atau gunakan panah / WASD. Bergerak, menunggu, atau mengetuk memajukan patroli. Mendengarkan bebas giliran. Hindari berpapasan dengannya di pintu.'
        )}
      </p>
    </section>
  );
}
export function start(host: HTMLElement, options: GameOptions) {
  return mountBoard(host, options, Board);
}
