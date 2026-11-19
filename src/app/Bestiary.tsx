import type { Lang, Mode, Route } from '../types';
import { asset } from '../assets';
import { modeName } from '../campaign/story';
import { Icon } from './Icon';

type Line = readonly [string, string];
interface Entry {
  key: string;
  name: string;
  say: string;
  kind: Line;
  art: string;
  focus: string;
  lore: Line;
  play: Line;
  /** Practice games this figure appears in; the night watch itself opens the campaign. */
  games: readonly Mode[];
}

// Folklore first, then what it becomes in Kalisepi: the cultural context explains the mechanics.
const entries: readonly Entry[] = [
  {
    key: 'tuyul',
    name: 'Tuyul',
    say: 'too-yool',
    kind: ['Child spirit · Javanese folklore', 'Makhluk halus · cerita rakyat Jawa'],
    art: 'coin-alley.webp',
    focus: '71% 56%',
    lore: [
      'A small, bald spirit with the body of a child. Folk belief says someone hungry for quick riches keeps a tuyul and sends it out at night to steal from the neighbours, one coin at a time.',
      'Makhluk halus kecil berkepala gundul dengan tubuh seperti anak-anak. Menurut kepercayaan rakyat, orang yang ingin cepat kaya memelihara tuyul dan menyuruhnya mencuri uang tetangga pada malam hari, sekeping demi sekeping.',
    ],
    play: [
      'Chase it through the alleys to bring the coins home, then read the veranda tiles to find where it hides.',
      'Kejar ia di gang untuk membawa pulang koin warga, lalu baca tegel serambi untuk menemukan tempatnya bersembunyi.',
    ],
    games: ['chase', 'sweeper'],
  },
  {
    key: 'kuntilanak',
    name: 'Kuntilanak',
    say: 'koon-tee-lah-nak',
    kind: ['Restless spirit · Malay & Indonesian folklore', 'Arwah penasaran · cerita rakyat Nusantara'],
    art: 'whisper-house.webp',
    focus: '73% 42%',
    lore: [
      'The spirit of a woman who died while with child, seen in a white gown with long black hair. Village lore warns: when her laugh sounds far away, she is already close.',
      'Arwah perempuan yang meninggal saat mengandung, tampak bergaun putih dengan rambut hitam panjang. Kata orang desa: bila tawanya terdengar jauh, ia justru sudah dekat.',
    ],
    play: [
      'Cross the old house by listening. Her footsteps tell you which door is safe, and a knock can draw her away.',
      'Seberangi rumah tua dengan mendengarkan. Langkahnya menunjukkan pintu yang aman, dan ketukan bisa memancingnya menjauh.',
    ],
    games: ['escape'],
  },
  {
    key: 'ronda',
    name: 'Ronda',
    say: 'ron-dah',
    kind: ['The night watch · village tradition', 'Jaga malam · tradisi desa'],
    art: 'kalisepi.webp',
    focus: '69% 50%',
    lore: [
      'Neighbours take turns guarding the village until dawn. The kentongan, a hollow slit drum of bamboo or wood, is struck in set rhythms to raise the alarm.',
      'Warga bergantian menjaga desa hingga fajar. Kentongan, alat pukul berongga dari bambu atau kayu, dibunyikan dengan irama tertentu sebagai tanda bahaya.',
    ],
    play: [
      'That watch is yours now. Carry the lantern for seven nights, bring back the gong striker, and Kalisepi wakes at dawn.',
      'Kini giliranmu berjaga. Bawa lampion selama tujuh malam, pulangkan pemukul kentongan, dan Kalisepi terbangun saat fajar.',
    ],
    games: [],
  },
];

export function Bestiary({
  lang,
  open,
  playLabel,
}: {
  lang: Lang;
  open: (route: Route, trigger: HTMLElement) => void;
  playLabel: string;
}) {
  const i = lang === 'id' ? 1 : 0;
  return (
    <section id="bestiary" className="bestiary" aria-labelledby="bestiary-title" tabIndex={-1}>
      <div className="shell-wrap">
        <div className="bestiary-heading">
          <p className="shell-kicker">{['Mbah Ronda’s field notes', 'Catatan Mbah Ronda'][i]}</p>
          <h2 id="bestiary-title">{['Who walks Kalisepi at night', 'Penghuni malam Kalisepi'][i]}</h2>
          <p>
            {
              [
                'Every game in IndoGhost grows out of a story Indonesian villages still tell after dark.',
                'Setiap permainan IndoGhost tumbuh dari cerita yang masih dituturkan di desa-desa Indonesia selepas gelap.',
              ][i]
            }
          </p>
        </div>
        <ol className="bestiary-list">
          {entries.map((entry, n) => (
            <li className="creature" key={entry.key} data-creature={entry.key}>
              <div className="creature-art" aria-hidden="true">
                <img
                  src={asset(entry.art)}
                  alt=""
                  loading="lazy"
                  width="600"
                  height="750"
                  style={{ objectPosition: entry.focus }}
                />
                <span className="creature-index">{String(n + 1).padStart(2, '0')}</span>
              </div>
              <div className="creature-copy">
                <p className="creature-kind">{entry.kind[i]}</p>
                <h3>
                  {entry.name}
                  <span className="creature-say" lang="en">
                    /{entry.say}/
                  </span>
                </h3>
                <p className="creature-lore">{entry.lore[i]}</p>
                <div className="creature-play">
                  <span className="creature-label">{['In Kalisepi', 'Di Kalisepi'][i]}</span>
                  <p>{entry.play[i]}</p>
                </div>
                <div className="creature-actions">
                  {entry.games.length ? (
                    entry.games.map((mode) => (
                      <button
                        type="button"
                        key={mode}
                        className="creature-link"
                        data-practice={mode}
                        onClick={(event) => open(mode, event.currentTarget)}
                      >
                        {['Practice ', 'Latih '][i] + modeName(mode, lang)}
                        <Icon name="play" />
                      </button>
                    ))
                  ) : (
                    <button
                      type="button"
                      className="creature-link creature-start"
                      data-campaign=""
                      onClick={(event) => open('play', event.currentTarget)}
                    >
                      {playLabel}
                      <Icon name="play" />
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
