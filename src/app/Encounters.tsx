import type { PointerEvent } from 'react';
import type { Lang, Mode } from '../types';
import { asset } from '../assets';
import { Icon } from './Icon';

const encounters = [
  {
    mode: 'chase',
    art: 'coin-alley.webp',
    icon: 'maze',
    title: ['Tuyul Chase', 'Tuyul Chase'],
    type: ['Kejar-kejaran', 'Arcade pursuit'],
    note: [
      'Kembalikan koin warga sebelum tuyul menyusulmu.',
      'Return the villagers’ coins before the tuyul catches you.',
    ],
  },
  {
    mode: 'sweeper',
    art: 'lantern-floor.webp',
    icon: 'grid',
    title: ['Tuyul Sweeper', 'Tuyul Sweeper'],
    type: ['Teka-teki logika', 'Logic puzzle'],
    note: [
      'Baca jejak di tegel. Temukan tempat tuyul bersembunyi.',
      'Read the tracks in the tiles. Find where the spirits hide.',
    ],
  },
  {
    mode: 'escape',
    art: 'whisper-house.webp',
    icon: 'door',
    title: ['Lolos dari Kuntilanak', 'Escape the Kuntilanak'],
    type: ['Menyelinap', 'Stealth escape'],
    note: [
      'Dengarkan langkah di balik pintu sebelum menyeberang.',
      'Listen at the door before you cross the floor.',
    ],
  },
] as const;

// The card's lamp glow follows the pointer. Touch keeps the resting position.
function carryLight(event: PointerEvent<HTMLButtonElement>) {
  if (event.pointerType === 'touch') return;
  const card = event.currentTarget,
    bounds = card.getBoundingClientRect();
  card.style.setProperty('--light-x', ((event.clientX - bounds.left) / bounds.width) * 100 + '%');
  card.style.setProperty('--light-y', ((event.clientY - bounds.top) / bounds.height) * 100 + '%');
}

export function Encounters({ lang, open }: { lang: Lang; open: (mode: Mode, trigger: HTMLElement) => void }) {
  const i = lang === 'id' ? 0 : 1;
  return (
    <section id="encounters" className="encounters" aria-labelledby="encounter-title" tabIndex={-1}>
      <div className="shell-wrap">
        <div className="encounter-heading">
          <div>
            <p className="shell-kicker">{['Mode latihan', 'Practice modes'][i]}</p>
            <h2 id="encounter-title">{['Pilih tantanganmu', 'Choose your encounter'][i]}</h2>
          </div>
          <p>
            {
              [
                'Coba tiap permainan. Jurnal kampanyemu tersimpan terpisah.',
                'Try each game. Your campaign journal is kept separately.',
              ][i]
            }
          </p>
        </div>
        <div className="encounter-list">
          {encounters.map((e) => (
            <button
              type="button"
              data-open={e.mode}
              className="encounter"
              key={e.mode}
              onClick={(event) => open(e.mode, event.currentTarget)}
              onPointerMove={carryLight}
            >
              <img src={asset(e.art)} alt="" loading="lazy" width="1250" height="418" />
              <span className="encounter-light" aria-hidden="true" />
              <span className="encounter-content">
                <span className="encounter-type">
                  <Icon name={e.icon} />
                  {e.type[i]}
                </span>
                <span className="encounter-title">{e.title[i]}</span>
                <span className="encounter-note">{e.note[i]}</span>
              </span>
              <span className="encounter-play">
                <Icon name="play" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
