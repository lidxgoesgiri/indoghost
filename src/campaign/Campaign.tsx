import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode
} from 'react';
import type { GameHandle, GameOptions, GameResult, Lang, Mode, Route } from '../types';
import { browserJournal, clues, flames, nightKey, prefsKey, type Preferences } from './save';
import { WatchSound } from './sound';
import { clueNames, modeName, nights, number, translate } from './story';
import { Action, Heading, Journal, NightMap, Notice, Settings, Stats, objective } from './Panels';
import './campaign.css';

interface Status {
  completed: number;
  next: number;
  completedAll: boolean;
  lang: Lang;
  sound: boolean;
  reducedMotion: boolean;
}
interface Campaign {
  status: Status;
  modalOpen: boolean;
  open: (route: Route, trigger?: HTMLElement | null) => void;
  setSound: (sound: boolean) => void;
  setLanguage: (lang: Lang) => void;
}
const Context = createContext<Campaign | null>(null);
export function useCampaign() {
  const value = useContext(Context);
  if (!value) throw new Error('CampaignProvider is required');
  return value;
}
type Screen =
  | 'closed'
  | 'map'
  | 'journal'
  | 'settings'
  | 'credits'
  | 'gate'
  | 'intro'
  | 'loading'
  | 'game'
  | 'pause'
  | 'pause-settings'
  | 'confirm'
  | 'error'
  | 'win'
  | 'defeat-effect'
  | 'defeat'
  | 'ending';
interface View {
  screen: Screen;
  night: number;
  practice: boolean;
  level: number;
  confirm: 'restart' | 'leave';
  reason: string;
  result: GameResult;
}
const empty: View = {
  screen: 'closed',
  night: 1,
  practice: false,
  level: 0,
  confirm: 'leave',
  reason: '',
  result: { coins: 0, flame: 0 }
};
const practiceLevels: Record<Mode, number[]> = { chase: [1, 3, 7], sweeper: [2, 4, 6], escape: [6] };
const loaders = {
  chase: () => import('../games/chase'),
  sweeper: () => import('../games/sweeper'),
  escape: () => import('../games/escape')
};
const isMode = (route: Route): route is Mode => route === 'chase' || route === 'sweeper' || route === 'escape';

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [store] = useState(browserJournal);
  const saved = useSyncExternalStore(store.subscribe, store.snapshot);
  const { prefs, nights: records } = saved;
  const [sound] = useState(() => new WatchSound(prefs));
  const [ui, setUi] = useState<View>(empty);
  const current = useRef(ui),
    trigger = useRef<HTMLElement | null>(null),
    dialog = useRef<HTMLDialogElement>(null);
  const host = useRef<HTMLDivElement>(null),
    engine = useRef<GameHandle | null>(null),
    attempt = useRef(0),
    threat = useRef(0);
  const { screen, practice, night, level } = ui,
    info = nights[night - 1],
    mode = info.mode,
    lang = prefs.lang;
  const status: Status = {
    completed: records.length,
    next: Math.min(7, records.length + 1),
    completedAll: records.length === 7,
    lang,
    sound: prefs.sound,
    reducedMotion: prefs.reducedMotion
  };
  const setView = useCallback((patch: Partial<View>) => {
    current.current = { ...current.current, ...patch };
    setUi(current.current);
  }, []);
  function stop() {
    attempt.current++;
    const instance = engine.current;
    engine.current = null;
    instance?.destroy();
    host.current?.replaceChildren();
    sound.stop();
  }
  function leave() {
    stop();
    setView({ screen: 'closed' });
  }
  const open = useCallback(
    (route: Route, button?: HTMLElement | null) => {
      if (current.current.screen !== 'closed') return;
      store.refresh();
      trigger.current =
        button ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      const state = store.snapshot(),
        trial = isMode(route);
      const chapter = trial ? practiceLevels[route][0] : Math.min(7, state.nights.length + 1);
      let destination: Screen = state.prefs.consent ? 'intro' : 'gate';
      if (route === 'map' || route === 'journal' || route === 'settings' || route === 'credits')
        destination = route;
      else if (!trial && state.nights.length === 7) destination = 'ending';
      setView({ ...empty, screen: destination, night: chapter, practice: trial });
    },
    [setView, store]
  );
  function visit(n: number) {
    setView({ screen: store.snapshot().prefs.consent ? 'intro' : 'gate', night: n, level: 0, practice: false });
  }
  function setLanguage(language: Lang) {
    store.setPreferences({ ...store.snapshot().prefs, lang: language });
  }
  function setSound(enabled: boolean) {
    const next = { ...store.snapshot().prefs, sound: enabled };
    sound.setPreferences(next);
    if (enabled) {
      sound.unlock();
      sound.cue('enable');
    }
    store.setPreferences(next);
  }
  function pause() {
    if (current.current.screen !== 'game') return;
    engine.current?.pause();
    sound.stop();
    setView({ screen: 'pause' });
  }
  function resume() {
    if (!engine.current) {
      setView({ screen: 'intro' });
      return;
    }
    sound.unlock();
    setView({ screen: 'game' });
    engine.current.resume();
    sound.start(nights[current.current.night - 1].mode, threat.current);
  }
  function back() {
    switch (current.current.screen) {
      case 'game':
        pause();
        break;
      case 'pause':
        resume();
        break;
      case 'pause-settings':
      case 'confirm':
        setView({ screen: 'pause' });
        break;
      case 'defeat-effect':
        sound.stop();
        setView({ screen: 'defeat' });
        break;
      default:
        leave();
    }
  }
  function onSave(next: Preferences) {
    const was = store.snapshot().prefs;
    store.setPreferences(next);
    sound.setPreferences(next);
    if (next.sound) {
      sound.unlock();
      if (!was.sound) sound.cue('enable');
    }
    if (screen === 'gate') setView({ screen: 'intro' });
    else if (screen === 'pause-settings') setView({ screen: 'pause' });
    else leave();
  }
  async function start() {
    stop();
    sound.unlock();
    const token = attempt.current;
    threat.current = 0;
    const active = current.current,
      selected = nights[active.night - 1].mode;
    setView({ screen: 'loading' });
    try {
      const game = await loaders[selected]();
      if (attempt.current !== token || !host.current) return;
      const state = store.snapshot(),
        opts: GameOptions = {
          night: active.practice ? practiceLevels[selected][active.level] : active.night,
          lang: state.prefs.lang,
          reducedMotion: state.prefs.reducedMotion,
          flame: active.practice ? 1 : flames(state.nights),
          clues: active.practice ? [] : clues(state.nights),
          onCue(name) {
            if (attempt.current === token) sound.cue(name);
          },
          onThreat(value) {
            if (attempt.current === token) {
              threat.current = value;
              sound.threat(value);
            }
          },
          onPause: pause,
          onLose(reason) {
            if (attempt.current !== token) return;
            stop();
            const quiet = store.snapshot().prefs.horror === 'quiet';
            setView({ screen: quiet ? 'defeat' : 'defeat-effect', reason });
            if (!quiet) sound.result(false);
          },
          onWin(result) {
            if (attempt.current !== token) return;
            stop();
            if (!active.practice) store.record(active.night, result);
            setView({ screen: 'win', result });
            sound.result(true);
          }
        };
      const instance = game.start(host.current, opts);
      if (token !== attempt.current) {
        instance.destroy();
        return;
      }
      engine.current = instance;
      setView({ screen: 'game' });
      sound.start(selected, threat.current);
      if (document.hidden) pause();
    } catch (error) {
      if (attempt.current !== token) return;
      console.error('IndoGhost game initialization', error);
      stop();
      setView({ screen: 'error' });
    }
  }
  useEffect(() => {
    const blur = () => {
      pause();
      sound.stop();
    };
    const visibility = () => {
      if (document.hidden) blur();
    };
    const sync = (event: StorageEvent) => {
      if (!event.key || event.key === prefsKey || event.key.startsWith(nightKey(1).slice(0, -1)))
        store.refresh();
    };
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('storage', sync);
      stop();
      sound.dispose();
    };
  }, [store, sound]);
  useEffect(() => {
    sound.setPreferences(prefs);
    engine.current?.updatePreferences({ lang: prefs.lang, reducedMotion: prefs.reducedMotion });
  }, [prefs, sound]);
  useEffect(() => {
    if (screen !== 'defeat-effect') return;
    if (prefs.horror === 'quiet') {
      sound.stop();
      setView({ screen: 'defeat' });
      return;
    }
    const id = window.setTimeout(() => setView({ screen: 'defeat' }), prefs.horror === 'full' ? 1150 : 800);
    return () => window.clearTimeout(id);
  }, [screen, prefs.horror, sound, setView]);
  useLayoutEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (screen === 'closed') {
      if (node.open) {
        node.close();
        trigger.current?.focus({ preventScroll: true });
        trigger.current = null;
      }
      return;
    }
    if (!node.open) node.showModal();
    node.scrollTop = 0;
    if (screen === 'game') {
      const focus =
        host.current?.querySelector<HTMLElement>('[tabindex="0"]') ??
        host.current?.querySelector<HTMLElement>('button:not(:disabled)');
      focus?.focus({ preventScroll: true });
    } else node.querySelector<HTMLElement>('#igc-heading')?.focus({ preventScroll: true });
  }, [screen, night]);
  const t = (en: string, id: string) => (lang === 'id' ? id : en);
  const chapter = t('Night ', 'Malam ') + number(night);
  const location = translate(lang, info.place),
    modeTitle = modeName(mode, lang);
  const newWatch = () =>
    status.completedAll ? setView({ screen: 'ending', practice: false, night: 7 }) : visit(status.next);
  const to = (target: Screen) => () => setView({ screen: target });
  const map = to('map'),
    journal = to('journal');
  const modalOpen = screen !== 'closed';
  let panel: ReactNode = null;
  switch (screen) {
    case 'gate':
    case 'settings':
    case 'pause-settings':
      panel = <Settings key={screen} prefs={prefs} gate={screen === 'gate'} t={t} onSave={onSave} />;
      break;
    case 'map':
      panel = <NightMap records={records} lang={lang} t={t} visit={visit} />;
      break;
    case 'journal':
      panel = <Journal state={saved} store={store} t={t} play={newWatch} map={map} />;
      break;
    case 'intro':
      panel = (
        <>
          <Heading
            kicker={practice ? t('Practice', 'Latihan') : chapter + ' / ' + modeTitle}
            title={practice ? modeTitle : translate(lang, info.title)}
          >
            {practice
              ? t(
                  'Practice at your own pace. Your campaign journal is kept separately.',
                  'Berlatihlah sepuasmu. Progres kampanye tersimpan secara terpisah.'
                )
              : translate(lang, info.intro)}
          </Heading>
          <div className="igc-objective">
            <span className="igc-label">{t('Objective', 'Tujuan')}</span>
            <p>{objective(mode, t)}</p>
          </div>
          {practice && mode !== 'escape' && (
            <label className="igc-setting igc-practice-level">
              <span>{t('Practice difficulty', 'Tingkat latihan')}</span>
              <select value={level} onChange={(e) => setView({ level: Number(e.currentTarget.value) })}>
                {[
                  t('First watch', 'Ronda pertama'),
                  t('Experienced', 'Berpengalaman'),
                  t('Night keeper', 'Penjaga malam')
                ].map((label, i) => (
                  <option key={i} value={i}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="igc-actions">
            <Action primary onClick={start}>
              {practice
                ? t('Begin practice', 'Mulai latihan')
                : t('Begin night ', 'Mulai malam ') + number(night)}
            </Action>
            <Action onClick={map}>{t('Night map', 'Peta malam')}</Action>
          </div>
        </>
      );
      break;
    case 'game':
    case 'loading':
      panel = (
        <>
          <Heading
            kicker={(practice ? t('Practice', 'Latihan') : chapter) + ' / ' + location}
            title={modeTitle}
          />
          {screen === 'loading' && <p role="status">{t('Opening the path…', 'Membuka jalan…')}</p>}
        </>
      );
      break;
    case 'pause':
      panel = (
        <>
          <Heading kicker={chapter + ' / ' + modeTitle} title={t('Watch paused', 'Ronda dijeda')}>
            {t('The village can wait.', 'Desa bisa menunggu.')}
          </Heading>
          <div className="igc-actions">
            <Action primary onClick={resume}>
              {t('Resume', 'Lanjutkan')}
            </Action>
            <Action onClick={to('pause-settings')}>{t('Settings', 'Pengaturan')}</Action>
            <Action onClick={() => setView({ screen: 'confirm', confirm: 'restart' })}>
              {t('Restart night', 'Ulangi malam')}
            </Action>
            <Action onClick={() => setView({ screen: 'confirm', confirm: 'leave' })}>
              {t('Return to village', 'Kembali ke desa')}
            </Action>
          </div>
        </>
      );
      break;
    case 'confirm':
      panel = (
        <>
          <Heading
            kicker={chapter}
            title={
              ui.confirm === 'restart'
                ? t('Restart this night?', 'Ulangi malam ini?')
                : t('Leave this night?', 'Tinggalkan malam ini?')
            }
          >
            {t(
              'Your current attempt will end. Completed nights stay in your journal.',
              'Percobaan ini akan berakhir. Malam yang sudah selesai tetap tersimpan di jurnalmu.'
            )}
          </Heading>
          <div className="igc-actions">
            <Action primary onClick={resume}>
              {t('Keep playing', 'Lanjut bermain')}
            </Action>
            <Action onClick={ui.confirm === 'restart' ? start : leave}>
              {ui.confirm === 'restart' ? t('Restart', 'Ulangi') : t('Leave night', 'Tinggalkan malam')}
            </Action>
          </div>
        </>
      );
      break;
    case 'error':
      panel = (
        <>
          <Heading kicker={modeTitle} title={t('The path is unavailable', 'Jalur belum terbuka')}>
            {t(
              'The game could not open. Try again or return to the village.',
              'Permainan belum dapat dibuka. Coba lagi atau kembali ke desa.'
            )}
          </Heading>
          <div className="igc-actions">
            <Action primary onClick={start}>
              {t('Try again', 'Coba lagi')}
            </Action>
            <Action onClick={leave}>{t('Return to village', 'Kembali ke desa')}</Action>
          </div>
        </>
      );
      break;
    case 'defeat-effect':
      panel = (
        <>
          <Heading kicker={chapter} title={t('The lantern goes dark', 'Lampion padam')} />
          <div className="igc-shadow" data-intensity={prefs.horror} aria-hidden="true">
            <i>
              <b />
              <b />
            </i>
            <i />
          </div>
          <div className="igc-actions">
            <Action primary onClick={back}>
              {t('Skip reveal', 'Lewati adegan')}
            </Action>
          </div>
        </>
      );
      break;
    case 'defeat':
      panel = (
        <>
          <Heading
            kicker={(practice ? t('Practice', 'Latihan') : chapter) + ' / ' + modeTitle}
            title={t('The watch is lost', 'Ronda terhenti')}
          >
            {ui.reason}
          </Heading>
          <div className="igc-actions">
            <Action primary onClick={start}>
              {t('Retry night', 'Coba lagi')}
            </Action>
            <Action onClick={leave}>{t('Return to village', 'Kembali ke desa')}</Action>
          </div>
        </>
      );
      break;
    case 'win': {
      const last = !practice && night === 7,
        stats: [number | string, string][] = [];
      if (mode === 'chase') stats.push([ui.result.coins, t('Coins returned', 'Koin kembali')]);
      if (ui.result.clue)
        stats.push([translate(lang, clueNames[ui.result.clue]), t('Clue recovered', 'Petunjuk ditemukan')]);
      stats.push([
        practice ? Math.max(0, 1 + ui.result.flame) : flames(records),
        t('Lantern flame', 'Nyala lampion')
      ]);
      panel = (
        <>
          <Heading
            kicker={(practice ? t('Practice', 'Latihan') : chapter) + ' / ' + location}
            title={
              last
                ? t('The gate opens', 'Gerbang terbuka')
                : practice
                  ? t('Practice complete', 'Latihan selesai')
                  : t('Night complete', 'Malam terselesaikan')
            }
          >
            {practice
              ? t('You made it back to the village.', 'Kamu berhasil kembali ke desa.')
              : translate(lang, info.entry)}
          </Heading>
          <Stats items={stats} />
          <div className="igc-actions">
            <Action primary onClick={practice ? leave : last ? to('ending') : () => visit(night + 1)}>
              {practice
                ? t('Return to village', 'Kembali ke desa')
                : last
                  ? t('Welcome the dawn', 'Sambut fajar')
                  : t('Continue to night ', 'Lanjut ke malam ') + number(night + 1)}
            </Action>
            <Action onClick={start}>{t('Replay', 'Main lagi')}</Action>
            <Action onClick={journal}>{t('Night journal', 'Jurnal malam')}</Action>
          </div>
        </>
      );
      break;
    }
    case 'ending':
      panel = (
        <>
          <Heading
            kicker={t('Epilogue / Daybreak', 'Epilog / Fajar')}
            title={t('Kalisepi wakes', 'Kalisepi terbangun')}
          >
            {t(
              'You return the coins to the bowl and strike the village gong. Across the rice fields, shutters open one by one. This time, when the gate swings free, it stays open.',
              'Kaukembalikan semua koin ke mangkuk, lalu kauketuk kentongan desa. Di seberang sawah, jendela terbuka satu per satu. Kali ini gerbang itu tetap terbuka.'
            )}
          </Heading>
          <Stats
            items={[
              [records.length + ' / 7', t('Nights cleared', 'Malam tuntas')],
              [records.reduce((sum, r) => sum + r.coins, 0), t('Coins returned', 'Koin kembali')],
              [clues(records).length, t('Clues recovered', 'Petunjuk ditemukan')]
            ]}
          />
          <div className="igc-actions">
            <Action primary onClick={journal}>
              {t('Read the journal', 'Baca jurnal')}
            </Action>
            <Action onClick={map}>{t('Night map', 'Peta malam')}</Action>
            <Action onClick={leave}>{t('Return to village', 'Kembali ke desa')}</Action>
          </div>
        </>
      );
      break;
    case 'credits': {
      const credits = [
        [
          t('Story and setting', 'Cerita dan latar'),
          t(
            'Desa Kalisepi draws on stories of the tuyul and the tradition of the night watch.',
            'Desa Kalisepi terilhami cerita tuyul dan tradisi ronda malam.'
          )
        ],
        [t('Game design', 'Desain permainan'), 'Tuyul Chase · Tuyul Sweeper · ' + modeName('escape', lang)],
        [
          t('Village artwork', 'Ilustrasi desa'),
          t(
            'Original scenes created with OpenAI ImageGen for IndoGhost.',
            'Pemandangan orisinal yang dibuat dengan OpenAI ImageGen untuk IndoGhost.'
          )
        ],
        [
          t('Typography', 'Tipografi'),
          'Cormorant Garamond · Cormorant Project Authors · SIL Open Font License 1.1'
        ],
        [
          t('Sound', 'Suara'),
          t(
            'Original synthesized score, lantern, tile and watch-gong cues.',
            'Musik, suara lampion, tegel, dan kentongan disintesis khusus untuk permainan ini.'
          )
        ]
      ];
      panel = (
        <>
          <Heading kicker="IndoGhost" title={t('Credits', 'Kredit')}>
            {t(
              'An original browser game set in Desa Kalisepi, a fictional Javanese village.',
              'Game browser orisinal berlatar Desa Kalisepi, sebuah desa Jawa fiktif.'
            )}
          </Heading>
          <dl className="igc-credits">
            {credits.map(([label, value]) => (
              <div key={label}>
                <dt className="igc-label">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="igc-actions">
            <Action primary onClick={leave}>
              {t('Return to village', 'Kembali ke desa')}
            </Action>
          </div>
        </>
      );
      break;
    }
  }
  const isBack = screen === 'pause' || screen === 'confirm' || screen === 'pause-settings';
  return (
    <Context.Provider value={{ status, modalOpen, open, setLanguage, setSound }}>
      {children}
      <dialog
        ref={dialog}
        className={'igc-dialog' + (prefs.reducedMotion ? ' igc-still' : '')}
        data-screen={screen}
        data-mode={mode}
        lang={lang}
        aria-labelledby="igc-heading"
        data-lenis-prevent=""
        onCancel={(event) => {
          event.preventDefault();
          back();
        }}
      >
        <div className="igc-frame">
          <header className="igc-topbar">
            <div className="igc-lockup">
              <span className="igc-brand">IndoGhost</span>
              <span className="igc-world">Desa Kalisepi</span>
            </div>
            <button type="button" className="igc-button igc-top-action" onClick={back}>
              <span aria-hidden="true" className="igc-control-icon">
                {screen === 'game' ? 'Ⅱ' : isBack ? '‹' : '×'}
              </span>
              {screen === 'game' ? t('Pause', 'Jeda') : isBack ? t('Back', 'Kembali') : t('Close', 'Tutup')}
            </button>
          </header>
          <div className="igc-pane">
            {panel}
            {['journal', 'map', 'intro', 'gate', 'settings', 'win'].includes(screen) && (
              <Notice notice={saved.notice} t={t} />
            )}
          </div>
          <div ref={host} className="igc-stage" hidden={screen !== 'game' && screen !== 'loading'} />
        </div>
      </dialog>
    </Context.Provider>
  );
}
