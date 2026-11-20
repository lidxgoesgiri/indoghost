import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { asset } from '../assets';
import { CampaignProvider, useCampaign } from '../campaign/Campaign';
import { modeName, nights, number } from '../campaign/story';
import Story from '../story/Story';
import { Bestiary } from './Bestiary';
import { Encounters } from './Encounters';
import { Flyers } from './Flyers';
import { FieldGuide } from './FieldGuide';
import { Icon } from './Icon';
import { Opening } from '../opening/Opening';
import { needsOpening, rememberEntry } from '../opening/session';

const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
function subscribeMotion(update: () => void) {
  motionPreference.addEventListener('change', update);
  return () => motionPreference.removeEventListener('change', update);
}
const readMotion = () => motionPreference.matches;

function Village() {
  const { open, status, modalOpen, setSound, setLanguage, scene, sting } = useCampaign();
  const [guideOpen, setGuideOpen] = useState(false);
  const [opening, setOpening] = useState(needsOpening);
  const systemReduced = useSyncExternalStore(subscribeMotion, readMotion);
  const entered = useRef(false);
  const suspended = opening || modalOpen || guideOpen;
  const finishOpening = useCallback(() => {
    entered.current = true;
    setOpening(false);
  }, []);
  useLayoutEffect(() => {
    if (opening || !entered.current) return;
    entered.current = false;
    const destination = document.getElementById(location.hash.slice(1));
    if (destination) destination.scrollIntoView({ behavior: 'instant' });
    (destination ?? document.getElementById('village'))?.focus({ preventScroll: true });
  }, [opening]);
  const guideTrigger = useRef<HTMLElement | null>(null);
  const id = status.lang === 'id';
  const title = status.completedAll
    ? id
      ? 'Kembali ke fajar'
      : 'Revisit the dawn'
    : status.completed
      ? (id ? 'Lanjut malam ' : 'Continue night ') + String(status.next).padStart(2, '0')
      : id
        ? 'Mulai ronda'
        : 'Start night watch';
  // Say what the primary action starts, so the campaign is never confused with practice.
  const hint = status.completedAll
    ? id
      ? 'Tujuh malam tuntas'
      : 'All seven nights cleared'
    : (id ? 'Malam ' : 'Night ') +
      number(status.next) +
      (id ? ' dari 07 · ' : ' of 07 · ') +
      modeName(nights[status.next - 1].mode, status.lang);
  useEffect(() => {
    document.documentElement.lang = status.lang;
    document.documentElement.dataset.reduced = String(status.reducedMotion);
  }, [status.lang, status.reducedMotion]);
  function closeGuide() {
    setGuideOpen(false);
    requestAnimationFrame(() => guideTrigger.current?.focus({ preventScroll: true }));
  }
  return (
    <>
      {opening && (
        <Opening
          lang={status.lang}
          reducedMotion={systemReduced || status.reducedMotion}
          sound={status.sound}
          onEnter={(enabled) => {
            rememberEntry();
            if (enabled || status.sound) setSound(enabled);
          }}
          onFinish={finishOpening}
        />
      )}
      <a className="skip-link" href="#encounters">
        {id ? 'Langsung ke pilihan permainan' : 'Skip to the games'}
      </a>
      <header className="village-header">
        <div className="shell-wrap header-layout">
          <a className="brand-mark" aria-label="IndoGhost" href="#village">
            <img src={asset('kayon.svg')} alt="" width="29" height="40" />
            <span>IndoGhost</span>
          </a>
          <nav className="main-nav" aria-label={id ? 'Navigasi utama' : 'Main navigation'}>
            <a href="#village" aria-current="page">
              {id ? 'Desa' : 'The village'}
            </a>
            <button data-open="map" onClick={(e) => open('map', e.currentTarget)}>
              {id ? 'Peta malam' : 'Night map'}
            </button>
            <button data-open="journal" onClick={(e) => open('journal', e.currentTarget)}>
              {id ? 'Jurnal' : 'Journal'}
            </button>
          </nav>
          <div className="header-tools">
            {/* The accessible name stays "Sound"; aria-pressed carries the state, the chip shows it. */}
            <button id="sound" aria-pressed={status.sound} onClick={() => setSound(!status.sound)}>
              <Icon name={status.sound ? 'volume' : 'mute'} />
              <span className="tool-label">{id ? 'Suara' : 'Sound'}</span>
              <span className="tool-state" aria-hidden="true">
                {id ? (status.sound ? 'aktif' : 'mati') : status.sound ? 'on' : 'off'}
              </span>
            </button>
            <span aria-hidden="true" className="header-divider" />
            <button
              id="language"
              aria-label={id ? 'ID · Switch to English' : 'EN · Ganti ke bahasa Indonesia'}
              title={id ? 'Switch to English' : 'Ganti ke bahasa Indonesia'}
              onClick={() => setLanguage(id ? 'en' : 'id')}
            >
              <Icon name="globe" />
              {status.lang.toUpperCase()}
            </button>
            <button
              data-open="settings"
              aria-label={id ? 'Pengaturan' : 'Settings'}
              title={id ? 'Pengaturan' : 'Settings'}
              onClick={(e) => open('settings', e.currentTarget)}
            >
              <Icon name="settings" />
            </button>
          </div>
        </div>
      </header>
      <main>
        <Story
          lang={status.lang}
          reducedMotion={status.reducedMotion}
          suspended={suspended}
          dread={status.horror}
          sound={status.sound}
          playLabel={title}
          playHint={hint}
          onPlay={(trigger) => open('play', trigger)}
          onSound={() => setSound(true)}
          onScene={scene}
          onBeat={sting}
          onGuide={(trigger) => {
            guideTrigger.current = trigger;
            setGuideOpen(true);
          }}
        />
        <Bestiary lang={status.lang} open={open} playLabel={title} />
        <Encounters lang={status.lang} open={open} />
      </main>
      <footer className="village-footer">
        <div className="shell-wrap">
          <span className="brand-mark">
            <img src={asset('kayon.svg')} alt="" width="19" height="28" />
            IndoGhost
          </span>
          <button data-open="credits" onClick={(e) => open('credits', e.currentTarget)}>
            {id ? 'Kredit' : 'Credits'}
          </button>
          <button data-open="settings" onClick={(e) => open('settings', e.currentTarget)}>
            {id ? 'Pengaturan' : 'Settings'}
          </button>
        </div>
      </footer>
      <Flyers active={!status.reducedMotion && !suspended} dread={status.horror} />
      {guideOpen && <FieldGuide lang={status.lang} close={closeGuide} />}
    </>
  );
}

export function App() {
  return (
    <CampaignProvider>
      <Village />
    </CampaignProvider>
  );
}
