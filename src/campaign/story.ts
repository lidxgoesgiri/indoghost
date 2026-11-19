import type { Clue, Lang, Mode } from '../types';
export type Pair = readonly [string, string];
export interface Chapter {
  title: Pair;
  place: Pair;
  mode: Mode;
  intro: Pair;
  entry: Pair;
}
export const translate = (lang: Lang, pair: Pair) => pair[lang === 'id' ? 1 : 0];
export const number = (value: number) => String(value).padStart(2, '0');
export function modeName(mode: Mode, lang: Lang) {
  return {
    chase: 'Tuyul Chase',
    sweeper: 'Tuyul Sweeper',
    escape: lang === 'id' ? 'Lolos dari Kuntilanak' : 'Escape the Kuntilanak'
  }[mode];
}
export const nights: Chapter[] = [
  {
    title: ['The missing coins', 'Koin yang hilang'],
    place: ['The watch post', 'Pos ronda'],
    mode: 'chase',
    intro: [
      'Coins have rolled from the offering bowl into the alleys. Bring them back before the village gate shuts.',
      'Koin dari mangkuk warga berserakan di gang. Bawa pulang semuanya sebelum gerbang desa menutup.'
    ],
    entry: [
      'The coins were cold, but the little footprints beside them were still warm.',
      'Koin-koin itu dingin, tetapi jejak kaki kecil di sampingnya masih hangat.'
    ]
  },
  {
    title: ['Footprints in the floor', 'Jejak di lantai'],
    place: ['The tiled veranda', 'Serambi tegel'],
    mode: 'sweeper',
    intro: [
      'Something small is hiding under the veranda tiles. Read the footprints to recover the key beneath the floor.',
      'Ada makhluk kecil di bawah tegel serambi. Baca jejaknya untuk mengambil kunci yang tersimpan di sana.'
    ],
    entry: [
      'A brass key was tucked into a loose tile. Its teeth are worn smooth on one side.',
      'Kunci kuningan terselip di bawah tegel yang longgar. Geriginya aus di satu sisi.'
    ]
  },
  {
    title: ['The lantern house', 'Rumah lampion'],
    place: ['The bamboo lanes', 'Gang bambu'],
    mode: 'chase',
    intro: [
      'The house beyond the bamboo grove has gone dark. Follow the coins through the lanes and carry your lantern home.',
      'Rumah di seberang rumpun bambu sudah gelap. Susuri jejak koin dan bawa lampionmu sampai ke gerbang.'
    ],
    entry: [
      'The lantern glass bears the same notch as the key. Someone once carried them together.',
      'Ada takik di kaca lampion yang serupa dengan gerigi kunci. Dulu seseorang membawa keduanya bersama-sama.'
    ]
  },
  {
    title: ['The whispering walls', 'Dinding berbisik'],
    place: ['The inner courtyard', 'Pelataran dalam'],
    mode: 'sweeper',
    intro: [
      'Behind the courtyard wall, soft knocks travel from tile to tile. Count their neighbors to uncover the pavilion mark.',
      'Di balik tembok pelataran, terdengar ketukan dari tegel ke tegel. Hitung tetangganya untuk menemukan tanda pendopo.'
    ],
    entry: [
      'Beneath the courtyard was a drawing of the pavilion. A narrow side passage was circled in charcoal.',
      'Di bawah pelataran ada gambar pendopo. Sebuah lorong sempit di tepinya dilingkari dengan arang.'
    ]
  },
  {
    title: ['The locked pavilion', 'Pendopo terkunci'],
    place: ['The pavilion path', 'Jalur pendopo'],
    mode: 'chase',
    intro: [
      'The pavilion latch will only lift once the villagers’ coins are returned. Your pursuer knows this path.',
      'Palang pendopo baru bisa dibuka setelah koin warga kembali. Makhluk yang mengejarmu mengenal jalur ini.'
    ],
    entry: [
      'All night, the wooden gong stayed silent. The missing striker must be somewhere inside the pavilion.',
      'Kentongan itu diam sepanjang malam. Pemukulnya pasti tersimpan di dalam pendopo.'
    ]
  },
  {
    title: ['Laughter behind the door', 'Tawa di balik pintu'],
    place: ['The old pavilion', 'Pendopo tua'],
    mode: 'escape',
    intro: [
      'A woman in white wanders the old pavilion. The village gong’s striker is in the storeroom. Listen for her before crossing the floor.',
      'Sesosok perempuan berbaju putih menyusuri pendopo tua. Pemukul kentongan desa ada di gudang. Dengarkan langkahnya sebelum menyeberang.'
    ],
    entry: [
      'The missing striker bears a dawn seal. At first light, the village must hear the gong again.',
      'Ada segel fajar pada pemukul kentongan yang hilang. Saat fajar, desa harus mendengar kentongan itu lagi.'
    ]
  },
  {
    title: ['Until dawn', 'Sampai fajar'],
    place: ['The eastern gate', 'Gerbang timur'],
    mode: 'chase',
    intro: [
      'Take the striker to the eastern gate. Your journal marks a shortcut through the last patrol. One final round will wake Kalisepi.',
      'Bawa pemukul kentongan ke gerbang timur. Jurnalmu menandai jalan pintas melewati patroli terakhir. Satu ronda lagi akan membangunkan Kalisepi.'
    ],
    entry: [
      'The gong rang three times. For the first time in seven nights, someone opened their shutters.',
      'Kentongan berbunyi tiga kali. Untuk pertama kalinya dalam tujuh malam, seseorang membuka jendela.'
    ]
  }
];
export const clueNames: Record<Clue, Pair> = {
  'brass-key': ['Brass key', 'Kunci kuningan'],
  'pavilion-mark': ['Pavilion mark', 'Tanda pendopo'],
  'dawn-seal': ['Dawn seal', 'Segel fajar']
};
export const expectedClues: Partial<Record<number, Clue>> = {
  2: 'brass-key',
  4: 'pavilion-mark',
  6: 'dawn-seal'
};
