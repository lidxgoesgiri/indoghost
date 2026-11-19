import { createRoot } from 'react-dom/client';
import type { ComponentType } from 'react';
import type { GameHandle, GameOptions, GamePreferences } from '../types';

export interface BoardProps extends GamePreferences {
  options: GameOptions;
  active(): boolean;
  register(handle: Pick<GameHandle, 'pause' | 'resume' | 'destroy'>): void;
}

/** Each run owns its mount. A retry can start while the previous React root is being released. */
export function mountBoard(
  host: HTMLElement,
  options: GameOptions,
  Board: ComponentType<BoardProps>
): GameHandle {
  const mount = document.createElement('div');
  mount.className = 'game-mount';
  host.replaceChildren(mount);
  const root = createRoot(mount);
  let preferences: GamePreferences = { lang: options.lang, reducedMotion: options.reducedMotion };
  let paused = false;
  let disposed = false;
  let engine: Pick<GameHandle, 'pause' | 'resume' | 'destroy'> | undefined;
  const active = () => !disposed && !paused;
  const register = (handle: typeof engine) => {
    engine = handle;
    if (paused) engine?.pause();
  };
  const render = () =>
    root.render(<Board {...preferences} options={options} active={active} register={register} />);
  render();
  return {
    pause() {
      paused = true;
      engine?.pause();
    },
    resume() {
      if (disposed) return;
      paused = false;
      engine?.resume();
      mount.querySelector<HTMLElement>('.sweep-tile[tabindex="0"],.ig-escape')?.focus({ preventScroll: true });
    },
    updatePreferences(next) {
      if (!disposed) {
        preferences = next;
        render();
      }
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      engine?.destroy();
      mount.remove();
      // A parent can unmount us during its own commit. Release this independent tree afterwards.
      queueMicrotask(() => root.unmount());
    }
  };
}
