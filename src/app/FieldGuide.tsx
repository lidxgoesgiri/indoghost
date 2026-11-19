import { useEffect, useRef } from 'react';
import type { Lang } from '../types';
import { Icon } from './Icon';

export function FieldGuide({ lang, close }: { lang: Lang; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = lang === 'id';
  useEffect(() => {
    const node = dialog.current!;
    node.showModal();
    return () => node.close();
  }, []);
  const entries = [
    {
      icon: 'maze',
      title: 'Tuyul Chase',
      text: id
        ? 'Gunakan tombol panah, WASD, atau tombol arah di layar. Ambil semua koin lalu capai gerbang. Spasi atau tombol lampion menghalau tuyul sejenak.'
        : 'Move with the arrows, WASD, or the direction pad. Gather every coin and reach the gate. Space or the lantern button sends the tuyul away briefly.',
    },
    {
      icon: 'grid',
      title: 'Tuyul Sweeper',
      text: id
        ? 'Angka menghitung tuyul di delapan tegel sekitar. Buka tegel aman dan tandai tuyul dengan kurungan. Tombol H meminta alasan deduksi dari Mbah Ronda.'
        : 'Each number counts spirits in the eight neighboring tiles. Open safe tiles and mark spirits with cages. Press H to ask Mbah Ronda to explain a deduction.',
    },
    {
      icon: 'door',
      title: id ? 'Lolos dari Kuntilanak' : 'Escape the Kuntilanak',
      text: id
        ? 'Dengarkan arah patroli sebelum melangkah. Ambil kunci di bilik kain dan pemukul kentongan di gudang, lalu kembali ke serambi. Ketukan mengalihkan perhatian kuntilanak.'
        : 'Listen for the patrol before stepping through a door. Take the linen-room key, retrieve the gong striker, and return to the veranda. A knock can lure her away.',
    },
  ] as const;
  return (
    <dialog
      ref={dialog}
      className="field-guide"
      id="guide"
      aria-labelledby="guide-title"
      data-lenis-prevent=""
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="guide-heading">
        <p className="shell-kicker">{id ? 'Catatan Mbah Ronda' : 'Mbah Ronda’s field notes'}</p>
        <button type="button" aria-label={id ? 'Tutup' : 'Close'} onClick={close}>
          <Icon name="close" />
        </button>
      </div>
      <h2 id="guide-title">{id ? 'Cara bermain' : 'How to play'}</h2>
      <p>
        {id
          ? 'Tuntaskan ronda untuk membuka malam berikutnya. Petunjuk dan nyala lampionmu ikut dibawa ke malam selanjutnya.'
          : 'Complete a watch to unlock the next night. Clues and lantern flame travel with you.'}
      </p>
      {entries.map((e) => (
        <section key={e.icon} className="guide-entry">
          <Icon name={e.icon} />
          <div>
            <h3>{e.title}</h3>
            <p>{e.text}</p>
          </div>
        </section>
      ))}
      <button className="guide-back" type="button" onClick={close}>
        {id ? 'Kembali ke desa' : 'Back to the village'}
      </button>
    </dialog>
  );
}
