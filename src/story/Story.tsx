import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { asset } from '../assets';
import { chapters } from './chapters';
import type { Dread, StoryFrame, StoryLanguage } from './chapters';
import './story.css';

gsap.registerPlugin(ScrollTrigger);
const FieldScene = lazy(() => import('./FieldScene'));
const last = chapters.length - 1;
const number = (n: number) => String(n + 1).padStart(2, '0');
interface Props {
  lang: StoryLanguage;
  reducedMotion: boolean;
  suspended: boolean;
  dread: Dread;
  sound: boolean;
  playLabel: string;
  /** What the primary action actually starts, e.g. "Night 01 of 07 · Tuyul Chase". */
  playHint: string;
  onPlay: (trigger: HTMLElement) => void;
  onGuide: (trigger: HTMLElement) => void;
  onSound: () => void;
  /** The chapter whose ambience should play, or null when the story is out of view or covered. */
  onScene: (chapter: number | null) => void;
  onBeat: (chapter: number) => void;
}

class SceneBoundary extends Component<{ onFailure: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function StoryMark({ kind }: { kind: 'play' | 'book' | 'down' | 'pin' | 'ear' }) {
  const path = {
    play: <path d="m7 4 13 8-13 8z" fill="currentColor" stroke="none" />,
    book: <path d="M12 6C8 4 5 4 3 5v13c3-.8 6.4-.5 9 1.4 2.6-1.9 6-2.2 9-1.4V5c-2-.9-5-.9-9 1Zm0 0v13" />,
    down: <path d="M12 3v17m-6-6 6 6 6-6" />,
    ear: <path d="M4 15v-3a8 8 0 0 1 16 0v3M4 15a2 2 0 0 0 2 2h1v-5H6a2 2 0 0 0-2 2Zm16 0a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2Z" />,
    pin: (
      <>
        <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
        <circle cx="12" cy="10" r="2.2" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {path[kind]}
    </svg>
  );
}

let webGLAvailable: boolean | undefined;
function supportsWebGL() {
  if (webGLAvailable !== undefined) return webGLAvailable;
  try {
    const node = document.createElement('canvas');
    const context = node.getContext('webgl2');
    webGLAvailable = !!context;
    context?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webGLAvailable = false;
  }
  return webGLAvailable;
}

export default function Story({
  lang,
  reducedMotion,
  suspended,
  dread,
  sound,
  playLabel,
  playHint,
  onPlay,
  onGuide,
  onSound,
  onScene,
  onBeat,
}: Props) {
  const id = lang === 'id';
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const frame = useRef<StoryFrame>({ position: 0, pointerX: 0, pointerY: 0, pointerLive: 0, dread });
  const [inView, setInView] = useState(true);
  frame.current.dread = dread;
  frame.current.onBeat = onBeat;
  const smooth = useRef<Lenis | null>(null);
  const cameraTrack = useRef<ScrollTrigger | null>(null);
  const [index, setIndex] = useState(0);
  const [wantCanvas, setWantCanvas] = useState(false);
  const [renderer, setRenderer] = useState<'poster' | 'webgl' | 'fallback'>('poster');
  const realRenderer = reducedMotion ? 'poster' : renderer;
  const failed = useCallback(() => {
    setRenderer('fallback');
    setWantCanvas(false);
  }, []);
  const ready = useCallback(() => setRenderer('webgl'), []);
  const lock = useRef(suspended);
  const chapter = chapters[index];

  useEffect(() => {
    const root = section.current;
    if (!root) return;
    let origin = 0,
      previous = -1;
    const fit = () => {
      const space = Math.round(Math.max(0, origin - window.scrollY));
      if (space !== previous) {
        root.style.setProperty('--story-header-current', space + 'px');
        previous = space;
      }
    };
    const measure = () => {
      origin = root.getBoundingClientRect().top + window.scrollY;
      fit();
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', fit, { passive: true });
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', fit);
    };
  }, []);

  useEffect(() => {
    lock.current = suspended;
    if (suspended) smooth.current?.stop();
    else smooth.current?.start();
  }, [suspended]);

  // Ambience belongs to the village: it follows the chapter on screen and
  // falls silent once the story scrolls away or a dialog takes over.
  useEffect(() => {
    const root = section.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.intersectionRatio > 0.2), {
      threshold: [0, 0.2, 0.4],
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    onScene(suspended || !inView ? null : index);
  }, [index, suspended, inView, onScene]);
  useEffect(() => () => onScene(null), [onScene]);

  useEffect(() => {
    if (reducedMotion || suspended || wantCanvas || renderer === 'fallback') return;
    // Allow the first readable poster and Play control to paint before starting the GPU.
    const timer = window.setTimeout(() => {
      if (supportsWebGL()) setWantCanvas(true);
      else failed();
    }, 130);
    return () => window.clearTimeout(timer);
  }, [reducedMotion, suspended, wantCanvas, renderer, failed]);

  useEffect(() => {
    const root = section.current,
      screen = stage.current,
      plates = art.current;
    if (!root || !screen || !plates) return;
    const motion = frame.current;
    const images = Array.from(plates.querySelectorAll<HTMLElement>('.story-plate'));
    const place = (value: number) => {
      const position = Math.max(0, Math.min(last, value));
      motion.position = position;
      const nearest = Math.round(position);
      setIndex((current) => (current === nearest ? current : nearest));
      const floor = Math.min(last - 1, Math.floor(position));
      const phase = Math.max(0, Math.min(1, (position - floor - 0.18) / 0.62));
      const reveal = phase * phase * (3 - 2 * phase);
      root.style.setProperty('--story-path', String(position / last));
      // 0 at rest, 1 in the middle of a cut: drives the letterbox and the copy dip.
      const cut = Math.sin(Math.PI * reveal);
      root.style.setProperty('--story-cut', cut < 0.004 ? '0' : cut.toFixed(3));
      images.forEach((image, i) => {
        image.style.visibility = i === floor || (i === floor + 1 && reveal > 0) ? 'visible' : 'hidden';
        image.style.clipPath =
          i === floor + 1 && reveal < 1 ? 'circle(' + reveal * 165 + '% at 69% 47%)' : 'none';
      });
      plates.style.setProperty('--story-dolly', String(1.025 + position * 0.035));
      plates.style.setProperty('--story-truck', Math.sin(position * 1.7) * 1.6 + '%');
      root.style.setProperty(
        '--story-foliage',
        String(Math.min(1, Math.max(0, (1.79 - position) / 0.57)) * 0.83),
      );
    };
    if (reducedMotion) {
      place(Math.round(motion.position));
      return;
    }
    const lenis = new Lenis({
      autoRaf: false,
      syncTouch: false,
      smoothWheel: true,
      lerp: 0.15,
      anchors: false,
      prevent: (node) => Boolean(node.closest('dialog,[data-lenis-prevent]')),
    });
    smooth.current = lenis;
    if (lock.current) lenis.stop();
    lenis.on('scroll', ScrollTrigger.update);
    const progress = { position: 0 };
    const shot = gsap.to(progress, {
      position: last,
      ease: 'none',
      onUpdate: () => place(progress.position),
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: () => '+=' + Math.max(1, root.offsetHeight - screen.offsetHeight),
        scrub: true,
        invalidateOnRefresh: true,
      },
    });
    cameraTrack.current = shot.scrollTrigger!;
    place(shot.progress() * last);
    // A mouse carries the lantern while it hovers. A tap sets it down for a
    // moment. Otherwise the lantern drifts on its own, so touch screens and
    // idle visitors still see the light search the scene.
    const aim = { x: 0, y: 0, hover: false, until: 0 };
    const locate = (e: PointerEvent) => {
      const bounds = screen.getBoundingClientRect();
      aim.x = ((e.clientX - bounds.left) / bounds.width) * 2 - 1;
      aim.y = 1 - ((e.clientY - bounds.top) / bounds.height) * 2;
    };
    const point = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || lock.current) return;
      aim.hover = true;
      locate(e);
    };
    const tap = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' || lock.current) return;
      locate(e);
      aim.until = performance.now() + 2600;
    };
    const leave = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') aim.hover = false;
    };
    screen.addEventListener('pointermove', point, { passive: true });
    screen.addEventListener('pointerdown', tap, { passive: true });
    screen.addEventListener('pointerleave', leave);
    let visible = true,
      elapsed = 0,
      renderedAt = 0,
      paintedAt = -1;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(screen);
    const tick = (seconds: number, delta: number) => {
      if (lock.current || document.hidden) return;
      lenis.raf(seconds * 1000);
      if (!visible) return;
      // Follow the display while the camera or the lantern is travelling, and
      // idle at half rate when only the weather is moving.
      const live = aim.hover || performance.now() < aim.until;
      if (!live) {
        aim.x = 0.32 * Math.sin(elapsed * 0.29) + 0.12 * Math.sin(elapsed * 0.71);
        aim.y = -0.1 + 0.2 * Math.sin(elapsed * 0.41 + 1.3);
      }
      const travelling =
        Math.abs(motion.position - paintedAt) > 0.0004 ||
        Math.abs(aim.x - motion.pointerX) + Math.abs(aim.y - motion.pointerY) > (live ? 0.004 : 0.06);
      if (seconds - renderedAt < (travelling ? 1 / 75 : 1 / 31)) return;
      paintedAt = motion.position;
      const dt = Math.min(0.075, seconds - renderedAt || delta / 1000);
      renderedAt = seconds;
      elapsed += dt;
      const ease = 1 - Math.exp(-dt * 5);
      motion.pointerX += (aim.x - motion.pointerX) * ease;
      motion.pointerY += (aim.y - motion.pointerY) * ease;
      motion.pointerLive += ((live ? 1 : 0) - motion.pointerLive) * (1 - Math.exp(-dt * 3));
      if (motion.draw) motion.draw(elapsed);
      else {
        plates.style.setProperty('--story-aim-x', motion.pointerX * 0.7 + '%');
        plates.style.setProperty('--story-aim-y', -motion.pointerY * 0.45 + '%');
        screen.style.setProperty('--story-light-x', (motion.pointerX + 1) * 50 + '%');
        screen.style.setProperty('--story-light-y', (1 - motion.pointerY) * 50 + '%');
      }
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      observer.disconnect();
      screen.removeEventListener('pointermove', point);
      screen.removeEventListener('pointerdown', tap);
      screen.removeEventListener('pointerleave', leave);
      lenis.off('scroll', ScrollTrigger.update);
      lenis.destroy();
      smooth.current = null;
      cameraTrack.current = null;
      shot.scrollTrigger?.kill();
      shot.kill();
    };
  }, [reducedMotion]);

  const go = (to: number) => {
    if (reducedMotion || !cameraTrack.current) {
      frame.current.position = to;
      setIndex(to);
      return;
    }
    const track = cameraTrack.current;
    const target = track.start + ((track.end - track.start) * to) / last;
    smooth.current?.scrollTo(target, { duration: 0.85 });
  };
  const jump = (target: string, gentle = false) => {
    const dest = document.getElementById(target);
    if (!dest) return;
    dest.focus({ preventScroll: true });
    if (smooth.current) smooth.current.scrollTo(dest, gentle ? { duration: 1.1 } : { immediate: true });
    else dest.scrollIntoView({ behavior: gentle && !reducedMotion ? 'smooth' : 'instant', block: 'start' });
  };
  const skip = () => jump('encounters');

  return (
    <section
      id="village"
      tabIndex={-1}
      ref={section}
      className="story-sequence"
      data-story=""
      data-chapter={index}
      data-motion={reducedMotion ? 'reduced' : 'full'}
      data-renderer={realRenderer}
      data-suspended={suspended}
      aria-label={id ? 'Kisah Desa Kalisepi' : 'The story of Desa Kalisepi'}
    >
      <div ref={stage} className="story-stage">
        <div className="story-art" ref={art} aria-hidden="true">
          {chapters.map((scene, i) => (
            <div
              key={scene.image}
              className="story-plate"
              style={{
                backgroundImage: 'url("' + asset(scene.image) + '")',
                ['--frame' as string]: scene.frame[0] * 100 + '% ' + (1 - scene.frame[1]) * 100 + '%',
                ['--frame-tall' as string]: scene.portrait[0] * 100 + '% ' + (1 - scene.portrait[1]) * 100 + '%',
                ['--zoom-tall' as string]: String(scene.portrait[2]),
                ...(reducedMotion
                  ? { visibility: i === index ? 'visible' : 'hidden', clipPath: 'none' }
                  : {}),
              }}
            />
          ))}
          <img
            src={asset('rimbun.webp')}
            className="story-foreground"
            width="1000"
            height="667"
            alt=""
            style={reducedMotion ? { opacity: index < 2 ? 0.83 : 0 } : undefined}
          />
        </div>
        {wantCanvas && !reducedMotion && (
          <div className="story-canvas" aria-hidden="true">
            <SceneBoundary onFailure={failed}>
              <Suspense fallback={null}>
                <FieldScene frame={frame} onFailure={failed} onReady={ready} />
              </Suspense>
            </SceneBoundary>
          </div>
        )}
        <div className="story-atmosphere" aria-hidden="true" />
        <div className="story-shade" aria-hidden="true" />
        <div className="story-shell">
          <div className="story-heading">
            <p className="story-kicker">
              <span aria-hidden="true" />
              <span className="story-kicker-text" key={index}>
                {index === 0
                  ? id
                    ? 'Horor folklor Indonesia'
                    : 'Indonesian folk horror'
                  : (id ? 'Bab ' : 'Chapter ') + number(index) + ' · ' + chapter.location[lang]}
              </span>
            </p>
            {index !== 0 && <h1 className="story-sr">IndoGhost</h1>}
            <div className="story-lines" key={index}>
              {index === 0 ? (
                <h1 className="story-wordmark">
                  Indo<em>Ghost</em>
                </h1>
              ) : (
                <h2 className="story-chapter-title">
                  {chapter.title[lang]} <em>{chapter.italic[lang]}</em>
                </h2>
              )}
              {index === 0 && (
                <p className="story-tagline">
                  {id
                    ? 'Tiap malam membawa mimpi buruknya sendiri.'
                    : 'Every night has a different nightmare.'}
                </p>
              )}
              <p className="story-narration">{chapter.text[lang]}</p>
            </div>
            <div className="story-actions">
              <span className="story-play-wrap">
                <button
                  type="button"
                  className="story-play"
                  data-open="play"
                  data-finale={index === last ? '' : undefined}
                  aria-describedby="story-play-hint"
                  onClick={(e) => onPlay(e.currentTarget)}
                >
                  <StoryMark kind="play" />
                  {playLabel}
                </button>
                <span className="story-play-hint" id="story-play-hint">
                  {playHint}
                </span>
              </span>
              <button
                type="button"
                className="story-guide"
                id="guide-open"
                onClick={(e) => onGuide(e.currentTarget)}
              >
                <StoryMark kind="book" />
                {id ? 'Cara bermain' : 'How to play'}
              </button>
            </div>
            {!sound && (
              <button
                type="button"
                className="story-listen"
                onClick={() => {
                  onSound();
                  // The invitation disappears once sound is on; keep keyboard focus on the main action.
                  requestAnimationFrame(() =>
                    section.current?.querySelector<HTMLElement>('.story-play')?.focus({ preventScroll: true }),
                  );
                }}
              >
                <StoryMark kind="ear" />
                <span>
                  {id ? 'Nyalakan suara desa' : 'Turn on the village sound'}
                  <small>{id ? 'Paling seram dengan headphone' : 'Best with headphones'}</small>
                </span>
              </button>
            )}
          </div>
          <div className="story-navigation">
            <div className="story-place">
              <StoryMark kind="pin" />
              <span>
                Desa Kalisepi<small>{id ? 'Jawa, Indonesia' : 'Java, Indonesia'}</small>
              </span>
            </div>
            <nav className="story-steps" aria-label={id ? 'Bab cerita desa' : 'Village story chapters'}>
              {chapters.map((scene, i) => (
                <button
                  type="button"
                  key={scene.image}
                  data-story-step={i}
                  aria-current={index === i ? 'step' : undefined}
                  title={scene.location[lang]}
                  onClick={() => go(i)}
                >
                  <span className="story-step-line" aria-hidden="true" />
                  <span>{number(i)}</span>{' '}
                  <span className="story-step-name">{scene.location[lang]}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
        <div className="story-foot">
          <div className="story-foot-inner">
            <button
              type="button"
              className="story-explore"
              onClick={() => (index === last ? jump('bestiary', true) : go(index + 1))}
            >
              <span className="story-scroll-icon">
                <StoryMark kind="down" />
              </span>
              {index === last
                ? id
                  ? 'Kenali penghuni desa'
                  : 'Meet who walks the village'
                : reducedMotion
                  ? id
                    ? 'Bab berikutnya'
                    : 'Next chapter'
                  : id
                    ? 'Gulir untuk menyusuri desa'
                    : 'Scroll to explore the village'}
            </button>
            <a
              className="story-skip"
              href="#encounters"
              data-story-skip=""
              onClick={(e) => {
                e.preventDefault();
                skip();
              }}
            >
              {id ? 'Langsung ke mode latihan' : 'Skip to practice modes'}
            </a>
          </div>
          <span className="story-progress" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
