import { useEffect, useState } from 'react';
import { asset } from '../assets';

export interface OpeningAssetProgress {
  percent: number;
  ready: boolean;
  failed: boolean;
  stalled: boolean;
}

const initialProgress: OpeningAssetProgress = { percent: 0, ready: false, failed: false, stalled: false };
const fallbackAfterMs = 8000;

function loadImage(name: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      image.onload = null;
      image.onerror = null;
      signal.removeEventListener('abort', abort);
      if (error) reject(error);
      else resolve();
    };
    const abort = () => {
      finish(new DOMException('Pemuatan pembuka dihentikan.', 'AbortError'));
      image.removeAttribute('src');
    };
    const failed = () => finish(new Error('Gambar pembuka gagal dimuat: ' + name));
    image.onerror = failed;
    image.onload = () => {
      if (typeof image.decode === 'function') void image.decode().then(() => finish(), failed);
      else if (image.naturalWidth > 0) finish();
      else failed();
    };
    signal.addEventListener('abort', abort, { once: true });
    image.src = asset(name);
  });
}

async function loadFont(descriptor: string, sample: string): Promise<void> {
  const faces = await document.fonts?.load(descriptor, sample);
  // Jika @font-face hilang, load() bisa mengembalikan daftar kosong dan browser memakai font sistem.
  if (!faces?.length || faces.some((face) => face.status !== 'loaded')) {
    throw new Error('Font pembuka belum tersedia: ' + descriptor);
  }
}

const openingAssets = [
  (signal: AbortSignal) => loadImage('kalisepi.webp', signal),
  (signal: AbortSignal) => loadImage('kayon.svg', signal),
  () => loadFont('500 1em "Cormorant Garamond"', 'INDOGHOST'),
  () => loadFont('italic 500 1em "Cormorant Garamond"', 'GHOST'),
  () => loadFont('400 1em "Plus Jakarta Sans"', 'ENTER THE VILLAGE 0123456789'),
];

export function observeOpeningAssets(publish: (progress: OpeningAssetProgress) => void) {
  const controller = new AbortController();
  let loaded = 0;
  let failures = 0;
  let deadlinePassed = false;

  function report() {
    if (controller.signal.aborted) return;
    const complete = loaded + failures === openingAssets.length;
    if (complete) clearTimeout(deadline);
    publish({
      percent: Math.round((loaded * 100) / openingAssets.length),
      ready: complete || deadlinePassed,
      failed: failures > 0,
      stalled: deadlinePassed && !complete,
    });
  }
  const deadline = setTimeout(() => {
    deadlinePassed = true;
    report();
  }, fallbackAfterMs);

  // StrictMode bisa membersihkan efek pertama sebelum browser perlu mengirim permintaan.
  queueMicrotask(() => {
    if (controller.signal.aborted) return;
    for (const load of openingAssets) {
      void load(controller.signal).then(
        () => {
          loaded++;
          report();
        },
        () => {
          failures++;
          report();
        },
      );
    }
  });
  return () => {
    clearTimeout(deadline);
    controller.abort();
  };
}

export function useOpeningAssets() {
  const [progress, setProgress] = useState(initialProgress);
  useEffect(() => observeOpeningAssets(setProgress), []);
  return progress;
}
