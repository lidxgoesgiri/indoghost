import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { asset } from '../assets';
import { Icon } from '../app/Icon';
import { useOpeningAssets } from './assets';
import './opening.css';

interface OpeningProps {
  lang: 'id' | 'en';
  reducedMotion: boolean;
  sound: boolean;
  onEnter: (sound: boolean) => void;
  onFinish: () => void;
}

export function Opening({ lang, reducedMotion, sound, onEnter, onFinish }: OpeningProps) {
  const { percent, ready, failed, stalled } = useOpeningAssets();
  const [withSound, setWithSound] = useState(sound);
  const [leaving, setLeaving] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const started = useRef(false);
  const done = useRef(false);
  const id = lang === 'id';

  useLayoutEffect(() => {
    const node = dialog.current;
    if (!node) return;
    node.showModal();
    title.current?.focus({ preventScroll: true });
    return () => node.close();
  }, []);

  useLayoutEffect(() => {
    if (reducedMotion || leaving) return;
    const intro = gsap.context(() => {
      gsap
        .timeline()
        .from('.opening-mark', { clipPath: 'inset(100% 0 0 0)', duration: 0.48, ease: 'power2.out' })
        .from(
          '.opening-name-piece',
          { yPercent: 105, rotation: 3, stagger: 0.06, duration: 0.62, ease: 'power3.out' },
          0.02,
        );
    }, dialog);
    return () => intro.revert();
  }, [reducedMotion, leaving]);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onFinish();
  }, [onFinish]);

  useLayoutEffect(() => {
    if (!leaving) return;
    if (reducedMotion) {
      finish();
      return;
    }
    const exit = gsap.context(() => {
      const shot = gsap.timeline({ onComplete: finish });
      shot
        .to('.opening-copy', { yPercent: -12, scale: 1.035, opacity: 0, duration: 0.32 }, 0)
        .to('.opening-top, .opening-foot', { opacity: 0, duration: 0.25 }, 0)
        .to('.opening-plate', { scale: 1.025, duration: 1.05, ease: 'power2.inOut' }, 0)
        .to('.opening-plate', { '--opening-feather': '1%', duration: 0.43 }, 0.58)
        .to('.opening-ink, .opening-red, .opening-fog', { opacity: 0, duration: 0.7 }, 0.07)
        .to('.opening-film', { '--opening-iris': '112%', duration: 0.78, ease: 'power2.inOut' }, 0.22)
        .to('.opening-film', { opacity: 0, duration: 0.12 }, 0.93);
    }, dialog);
    // Covers a suspended GSAP ticker. It never advances asset progress.
    const deadline = window.setTimeout(finish, 1600);
    return () => {
      window.clearTimeout(deadline);
      exit.revert();
    };
  }, [finish, leaving, reducedMotion]);

  function begin(skip: boolean) {
    if (started.current) {
      if (skip) finish();
      return;
    }
    started.current = true;
    onEnter(withSound);
    if (skip || reducedMotion) finish();
    else setLeaving(true);
  }

  const status = failed
    ? id
      ? 'Sebagian aset belum tersedia. Kamu tetap bisa masuk.'
      : 'Some assets are unavailable. You can still enter.'
    : stalled
      ? id
        ? 'Koneksi lambat. Kamu sudah bisa masuk.'
        : 'Slow connection. You can enter now.'
      : ready
        ? id
          ? 'Gerbang terbuka'
          : 'The gate is open'
        : id
          ? 'Menyiapkan gerbang'
          : 'Preparing the gate';

  return (
    <dialog
      ref={dialog}
      className="opening"
      data-opening=""
      data-phase={leaving ? 'entering' : ready ? 'ready' : 'loading'}
      data-reduced={reducedMotion}
      aria-labelledby="opening-name"
      onCancel={(event) => {
        event.preventDefault();
        begin(true);
      }}
    >
      <div className="opening-film">
        <div className="opening-landscape" aria-hidden="true">
          <div className="opening-plate" style={{ backgroundImage: `url("${asset('kalisepi.webp')}")` }} />
          <div className="opening-red" />
          <div className="opening-ink" />
          <div className="opening-fog">
            <i />
            <i />
          </div>
          <div className="opening-grain" />
        </div>
        <div className="opening-top">
          <p className="opening-place">
            <span aria-hidden="true" />
            Desa Kalisepi
          </p>
          <button
            className="opening-audio"
            type="button"
            data-opening-audio=""
            aria-label={id ? 'Suara saat masuk' : 'Sound on entry'}
            aria-pressed={withSound}
            disabled={leaving}
            onClick={() => setWithSound((previous) => !previous)}
          >
            <Icon name={withSound ? 'volume' : 'mute'} />
            <span>
              {id ? 'Suara' : 'Sound'}{' '}
              <strong>{withSound ? (id ? 'aktif' : 'on') : id ? 'mati' : 'off'}</strong>
            </span>
          </button>
        </div>
        <div className="opening-copy">
          <div className="opening-seal" aria-hidden="true">
            <i />
            <img className="opening-mark" src={asset('kayon.svg')} alt="" width="42" height="56" />
            <i />
          </div>
          <h1 className="opening-name" id="opening-name" aria-label="INDOGHOST" ref={title} tabIndex={-1}>
            <span aria-hidden="true" className="opening-name-piece">
              INDO
            </span>
            <em aria-hidden="true" className="opening-name-piece">
              GHOST
            </em>
          </h1>
          <p className="opening-whisper">
            {id ? 'Di balik gerbang, malam sedang menunggu.' : 'Beyond the gate, the night is waiting.'}
          </p>
          <button
            className="opening-enter"
            type="button"
            data-opening-enter=""
            disabled={!ready || leaving}
            onClick={() => begin(false)}
            lang="en"
          >
            ENTER THE VILLAGE{' '}
            <span className="opening-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </div>
        <div className="opening-foot">
          <div className="opening-readout">
            <div
              className="opening-percent"
              role="progressbar"
              aria-label={id ? 'Aset pembuka yang siap' : 'Opening assets ready'}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              {String(percent).padStart(2, '0')}
              <small>%</small>
            </div>
            <p className="opening-status" role="status">
              {status}
            </p>
            <button type="button" data-opening-skip="" className="opening-skip" onClick={() => begin(true)}>
              {id ? 'Lewati pembuka' : 'Skip opening'} <span aria-hidden="true">↗</span>
            </button>
          </div>
          <div className="opening-track" aria-hidden="true">
            <i style={{ transform: `scaleX(${percent / 100})` }} />
          </div>
        </div>
      </div>
    </dialog>
  );
}
