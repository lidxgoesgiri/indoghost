import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { observeOpeningAssets, type OpeningAssetProgress } from './assets';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

class TestImage {
  src = '';
  naturalWidth = 120;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  pixels = deferred<void>();
  decode = () => this.pixels.promise;
  removeAttribute = vi.fn();
}

function browserAssets() {
  const images: TestImage[] = [];
  const serif = deferred<Array<{ status: string }>>();
  const italic = deferred<Array<{ status: string }>>();
  const sans = deferred<Array<{ status: string }>>();
  const load = vi.fn((descriptor: string) => {
    if (descriptor.startsWith('italic')) return italic.promise;
    return descriptor.includes('Cormorant') ? serif.promise : sans.promise;
  });
  vi.stubGlobal(
    'Image',
    class extends TestImage {
      constructor() {
        super();
        images.push(this);
      }
    },
  );
  vi.stubGlobal('document', { fonts: { load } });
  return { images, serif, italic, sans, load };
}

describe('kesiapan aset pembuka', () => {
  let stop: (() => void) | undefined;
  let updates: OpeningAssetProgress[];
  const flush = () => vi.advanceTimersByTimeAsync(0);
  const start = () => {
    stop = observeOpeningAssets((progress) => updates.push(progress));
  };
  beforeEach(() => {
    vi.useFakeTimers();
    updates = [];
  });
  afterEach(() => {
    stop?.();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('menghitung aset yang benar-benar selesai, termasuk dekode gambar', async () => {
    const { images, serif, italic, sans, load } = browserAssets();
    start();
    await flush();
    expect(images.map((image) => image.src)).toEqual([
      expect.stringMatching(/assets\/kalisepi\.webp$/),
      expect.stringMatching(/assets\/kayon\.svg$/),
    ]);
    expect(load.mock.calls.map(([descriptor]) => descriptor)).toEqual([
      '500 1em "Cormorant Garamond"',
      'italic 500 1em "Cormorant Garamond"',
      '400 1em "Plus Jakarta Sans"',
    ]);
    images.forEach((image) => image.onload?.());
    await flush();
    expect(updates).toHaveLength(0);
    serif.resolve([{ status: 'loaded' }]);
    await flush();
    italic.resolve([{ status: 'loaded' }]);
    await flush();
    images[1].pixels.resolve();
    await flush();
    sans.resolve([{ status: 'loaded' }]);
    await flush();
    images[0].pixels.resolve();
    await flush();
    expect(updates.map((state) => state.percent)).toEqual([20, 40, 60, 80, 100]);
    expect(updates.at(-1)).toEqual({ percent: 100, ready: true, failed: false, stalled: false });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('mengizinkan fallback tanpa menghitung font yang hilang dan gambar rusak', async () => {
    const { images, serif, italic, sans } = browserAssets();
    start();
    await flush();
    serif.resolve([]);
    italic.resolve([{ status: 'loaded' }]);
    sans.resolve([{ status: 'loaded' }]);
    images[0].onload?.();
    images[0].pixels.reject(new Error('Dekode gagal'));
    images[1].onload?.();
    images[1].pixels.resolve();
    await flush();
    expect(updates.at(-1)).toEqual({ percent: 60, ready: true, failed: true, stalled: false });
  });

  it('ambang lambat menawarkan jalan masuk tanpa menaikkan persen atau menandai aset rusak', async () => {
    const { images, serif, italic, sans } = browserAssets();
    start();
    await flush();
    serif.resolve([{ status: 'loaded' }]);
    await vi.advanceTimersByTimeAsync(7999);
    expect(updates.at(-1)).toEqual({ percent: 20, ready: false, failed: false, stalled: false });
    await vi.advanceTimersByTimeAsync(1);
    expect(updates.at(-1)).toEqual({ percent: 20, ready: true, failed: false, stalled: true });
    images.forEach((image) => {
      image.onload?.();
      image.pixels.resolve();
    });
    italic.resolve([{ status: 'loaded' }]);
    sans.resolve([{ status: 'loaded' }]);
    await flush();
    expect(updates.at(-1)).toEqual({ percent: 100, ready: true, failed: false, stalled: false });
  });

  it('mount StrictMode yang dibuang tidak memulai unduhan atau mengirim progres terlambat', async () => {
    const { images, serif, italic, sans, load } = browserAssets();
    start();
    stop?.();
    start();
    await flush();
    expect(load).toHaveBeenCalledTimes(3);
    expect(images).toHaveLength(2);
    images[0].onload?.();
    stop?.();
    images[0].pixels.resolve();
    serif.resolve([{ status: 'loaded' }]);
    italic.resolve([{ status: 'loaded' }]);
    sans.resolve([{ status: 'loaded' }]);
    await vi.advanceTimersByTimeAsync(20000);
    expect(updates).toHaveLength(0);
    expect(images.every((image) => image.onload === null && image.onerror === null)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
