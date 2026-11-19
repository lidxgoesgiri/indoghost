import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { GameResult, Lang, Mode } from '../types';
import {
  clues,
  flames,
  parseBackup,
  type Backup,
  type JournalStore,
  type Preferences,
  type SaveState
} from './save';
import { clueNames, modeName, nights, number, translate } from './story';

export type T = (en: string, id: string) => string;
export function Heading({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <>
      <p className="igc-kicker">{kicker}</p>
      <h2 id="igc-heading" className="igc-heading" tabIndex={-1}>
        {title}
      </h2>
      {children && <p className="igc-description">{children}</p>}
    </>
  );
}
export function Action({
  children,
  onClick,
  primary = false
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button type="button" className={'igc-button' + (primary ? ' igc-primary' : '')} onClick={onClick}>
      {children}
    </button>
  );
}
export function Stats({ items }: { items: [string | number, string][] }) {
  return (
    <div className="igc-stats">
      {items.map(([value, label]) => (
        <div className="igc-stat" key={label}>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
export function Notice({ notice, t }: { notice: SaveState['notice']; t: T }) {
  if (!notice) return null;
  return (
    <p role="status" className="igc-notice">
      {notice === 'session'
        ? t(
            'Browser storage is unavailable. Your journal will last for this visit.',
            'Penyimpanan browser tidak tersedia. Jurnalmu tersimpan selama kunjungan ini.'
          )
        : t(
            'Part of the journal could not be read. Continue from the last readable night.',
            'Sebagian jurnal tidak terbaca. Lanjutkan dari malam terakhir yang dapat dibaca.'
          )}
    </p>
  );
}
export function Settings({
  prefs,
  gate,
  t,
  onSave
}: {
  prefs: Preferences;
  gate: boolean;
  t: T;
  onSave: (p: Preferences) => void;
}) {
  const [draft, setDraft] = useState(prefs);
  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
    setDraft((previous) => ({ ...previous, [key]: value }));
  const slider = (key: 'level' | 'music' | 'ambience' | 'effects', label: string) => (
    <label key={key} className="igc-setting igc-volume">
      <span>{label}</span>
      <span className="igc-volume-input">
        <input
          type="range"
          aria-label={label}
          min={0}
          max={100}
          step={5}
          disabled={!draft.sound}
          value={Math.round(draft[key] * 100)}
          onChange={(e) => update(key, Number(e.currentTarget.value) / 100)}
        />
        <output>{Math.round(draft[key] * 100)}%</output>
      </span>
    </label>
  );
  return (
    <>
      <Heading
        kicker={
          gate
            ? t('Before the first watch', 'Sebelum ronda pertama')
            : t('Village preferences', 'Preferensi desa')
        }
        title={gate ? t('Choose your atmosphere', 'Pilih suasana rondamu') : t('Settings', 'Pengaturan')}
      >
        {gate &&
          t(
            'Kalisepi contains pursuit, unsettling imagery and optional sudden sounds. Choose what feels right for you.',
            'Kalisepi berisi adegan kejar-kejaran, gambar seram, dan bunyi mendadak yang bisa dimatikan. Pilih suasana yang nyaman untukmu.'
          )}
      </Heading>
      <form
        className="igc-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ ...draft, consent: draft.consent || gate });
        }}
      >
        <label className="igc-setting">
          <span>{t('Horror intensity', 'Intensitas horor')}</span>
          <select
            value={draft.horror}
            aria-describedby="igc-intensity-info"
            onChange={(e) => update('horror', e.currentTarget.value as Preferences['horror'])}
          >
            <option value="quiet">{t('No jumpscares', 'Tanpa jumpscare')}</option>
            <option value="balanced">{t('Balanced horror', 'Horor seimbang')}</option>
            <option value="full">{t('Full horror', 'Horor penuh')}</option>
          </select>
        </label>
        <p id="igc-intensity-info" className="igc-setting-help">
          {
            {
              quiet: t(
                'Defeat goes straight to the result, in silence.',
                'Saat kalah, hasil langsung ditampilkan tanpa suara.'
              ),
              balanced: t(
                'A brief shadow and a soft tone follow a defeat.',
                'Bayangan singkat dan nada lembut muncul setelah kalah.'
              ),
              full: t(
                'A looming silhouette and a stronger sound follow a defeat.',
                'Siluet mendekat dan bunyi yang lebih kuat muncul setelah kalah.'
              )
            }[draft.horror]
          }
        </p>
        <label className="igc-setting">
          <span>{t('Reduce motion', 'Kurangi gerakan')}</span>
          <input
            type="checkbox"
            checked={draft.reducedMotion}
            onChange={(e) => update('reducedMotion', e.currentTarget.checked)}
          />
        </label>
        <label className="igc-setting">
          <span>{t('Enable sound', 'Aktifkan suara')}</span>
          <input
            type="checkbox"
            checked={draft.sound}
            onChange={(e) => update('sound', e.currentTarget.checked)}
          />
        </label>
        {slider('level', t('Volume', 'Volume'))}
        <details className="igc-mixer">
          <summary>{t('Audio mix', 'Campuran audio')}</summary>
          {slider('music', t('Music', 'Musik'))}
          {slider('ambience', t('Ambience', 'Suasana'))}
          {slider('effects', t('Sound effects', 'Efek suara'))}
        </details>
        <label className="igc-setting">
          <span>{t('Language', 'Bahasa')}</span>
          <select value={draft.lang} onChange={(e) => update('lang', e.currentTarget.value as Lang)}>
            <option value="en">English</option>
            <option value="id">Bahasa Indonesia</option>
          </select>
        </label>
        <button type="submit" className="igc-button igc-primary">
          {gate ? t('Enter the village', 'Masuk desa') : t('Save settings', 'Simpan pengaturan')}
        </button>
      </form>
    </>
  );
}
export function NightMap({
  records,
  lang,
  t,
  visit
}: {
  records: GameResult[];
  lang: Lang;
  t: T;
  visit: (night: number) => void;
}) {
  const pins = [
    [8, 76],
    [23, 55],
    [35, 24],
    [50, 56],
    [67, 38],
    [87, 24],
    [90, 77]
  ];
  const rows = nights.map((info, index) => {
    const n = index + 1,
      state = index > records.length ? 'locked' : index < records.length ? 'done' : 'open';
    const status =
      state === 'locked'
        ? t('Clear night ', 'Tuntaskan malam ') + number(index)
        : state === 'done'
          ? t('Replay', 'Ulangi')
          : t('Enter', 'Masuk');
    const title = translate(lang, info.title),
      place = translate(lang, info.place);
    const name = t('Night ', 'Malam ') + number(n) + ' · ' + place + ' · ' + status;
    const content = (
      <>
        <span className="igc-night-num">{number(n)}</span>
        <span className="igc-list-copy">
          <strong>{title}</strong>
          <small>
            {modeName(info.mode, lang)} · {place}
          </small>
        </span>
        <span className="igc-state">{status}</span>
      </>
    );
    const style = { left: pins[index][0] + '%', top: pins[index][1] + '%' };
    return {
      pin:
        state === 'locked' ? (
          <span key={n} className="igc-map-pin" data-state={state} style={style} aria-hidden="true">
            {number(n)}
          </span>
        ) : (
          <button
            key={n}
            type="button"
            className="igc-map-pin"
            data-state={state}
            style={style}
            title={name}
            aria-label={name}
            onClick={() => visit(n)}
          >
            {number(n)}
          </button>
        ),
      row: (
        <li key={n}>
          {state === 'locked' ? (
            <div className="igc-map-row" data-state={state}>
              {content}
            </div>
          ) : (
            <button type="button" className="igc-map-row" data-state={state} onClick={() => visit(n)}>
              {content}
            </button>
          )}
        </li>
      )
    };
  });
  return (
    <>
      <Heading
        kicker={t('Desa Kalisepi / Field map', 'Desa Kalisepi / Peta ronda')}
        title={t('The seven nights', 'Tujuh malam')}
      >
        {t(
          'Follow the watch from the village post to the eastern gate.',
          'Ikuti jalur ronda dari pos desa hingga gerbang timur.'
        )}
      </Heading>
      <div className="igc-village-plan">{rows.map((row) => row.pin)}</div>
      <ol className="igc-list igc-map">{rows.map((row) => row.row)}</ol>
    </>
  );
}
function Restore({ store, t }: { store: JournalStore; t: T }) {
  const [pending, setPending] = useState<Backup | null>(null),
    [message, setMessage] = useState<'invalid' | 'done' | null>(null);
  const readId = useRef(0);
  useEffect(
    () => () => {
      readId.current++;
    },
    []
  );
  async function read(file?: File) {
    const id = ++readId.current;
    setPending(null);
    setMessage(null);
    if (!file) return;
    try {
      if (file.size > 32768) throw new Error('size');
      const imported = parseBackup(await file.text(), store.snapshot().prefs);
      if (id === readId.current) setPending(imported);
    } catch {
      if (id === readId.current) setMessage('invalid');
    }
  }
  return (
    <details className="igc-restore">
      <summary>{t('Import an earlier journal', 'Impor jurnal lama')}</summary>
      <p className="igc-footnote">
        {t(
          'Choose the JSON backup exported from the previous edition. Completed local nights take priority. Preferences transfer to a fresh journal.',
          'Pilih cadangan JSON dari versi sebelumnya. Malam yang sudah tersimpan di sini dipertahankan. Preferensi dipindahkan jika belum ada pengaturan lokal.'
        )}
      </p>
      <label className="igc-import-file">
        {t('Journal file', 'Berkas jurnal')}
        <input
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            void read(event.currentTarget.files?.[0]);
            event.currentTarget.value = '';
          }}
        />
      </label>
      {pending && (
        <div className="igc-note">
          <p>
            {t('Completed nights in backup', 'Malam tuntas dalam cadangan')} · {pending.nights.length}/7
          </p>
          <Action
            primary
            onClick={() => {
              store.merge(pending);
              setPending(null);
              setMessage('done');
            }}
          >
            {t('Merge journal', 'Gabungkan jurnal')}
          </Action>
        </div>
      )}
      <p role="status" aria-live="polite">
        {message === 'invalid'
          ? t(
              'This file is not a valid IndoGhost journal. Choose the original backup.',
              'Berkas ini bukan cadangan jurnal IndoGhost yang valid. Pilih berkas cadangan asli.'
            )
          : message === 'done'
            ? t('Journal merged. Your progress is ready.', 'Jurnal telah digabung. Progresmu siap dimainkan.')
            : ''}
      </p>
    </details>
  );
}
export function Journal({
  state,
  store,
  t,
  play,
  map
}: {
  state: SaveState;
  store: JournalStore;
  t: T;
  play: () => void;
  map: () => void;
}) {
  const {
    nights: records,
    prefs: { lang }
  } = state;
  return (
    <>
      <Heading kicker={t('Village records', 'Arsip desa')} title={t('Night journal', 'Jurnal malam')}>
        {t(
          'The things you brought back from the watch.',
          'Catatan tentang hal-hal yang kaubawa pulang dari ronda.'
        )}
      </Heading>
      <Stats
        items={[
          [records.length + ' / 7', t('Nights cleared', 'Malam tuntas')],
          [flames(records), t('Lantern flame', 'Nyala lampion')],
          [clues(records).length, t('Village clues', 'Petunjuk desa')]
        ]}
      />
      {records.length === 0 ? (
        <p className="igc-note">
          {t(
            'The first page is waiting. Return from the watch post to record your first discovery.',
            'Halaman pertama masih kosong. Pulanglah dari pos ronda untuk mencatat penemuan pertamamu.'
          )}
        </p>
      ) : (
        <ol className="igc-list igc-entries">
          {records
            .map((result, i) => (
              <li key={i}>
                <span className="igc-label">
                  {t('Night ', 'Malam ') + number(i + 1)} / {translate(lang, nights[i].place)}
                </span>
                <h3>{translate(lang, nights[i].title)}</h3>
                <p>{translate(lang, nights[i].entry)}</p>
                {result.clue && (
                  <small className="igc-clue">
                    {t('Clue', 'Petunjuk')} · {translate(lang, clueNames[result.clue])}
                  </small>
                )}
              </li>
            ))
            .reverse()}
        </ol>
      )}
      <div className="igc-actions">
        <Action primary onClick={play}>
          {records.length === 7
            ? t('Revisit the dawn', 'Kunjungi fajar')
            : t('Continue the watch', 'Lanjutkan ronda')}
        </Action>
        <Action onClick={map}>{t('Night map', 'Peta malam')}</Action>
      </div>
      <Restore store={store} t={t} />
    </>
  );
}
export function objective(mode: Mode, t: T) {
  return {
    chase: t(
      'Collect every coin and reach the gate. Move with the arrow keys, WASD, or the direction pad. Use the lantern to drive back a tuyul.',
      'Kumpulkan semua koin lalu capai gerbang. Gunakan tombol panah, WASD, atau tombol arah. Lampion bisa menghalau tuyul.'
    ),
    sweeper: t(
      'Reveal every safe tile. Each number counts tuyul in the eight surrounding tiles. Place cages to mark where they hide.',
      'Buka semua tegel aman. Angka menghitung tuyul di delapan tegel sekelilingnya. Pasang kurungan untuk menandai tempat mereka sembunyi.'
    ),
    escape: t(
      'Find the key, take the gong striker, and return to the veranda. Listen to her patrol and hide when she draws near.',
      'Cari kunci, ambil pemukul kentongan, lalu kembali ke serambi. Dengarkan arah patroli kuntilanak dan bersembunyilah saat ia mendekat.'
    )
  }[mode];
}
