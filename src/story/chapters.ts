export type StoryLanguage = 'id' | 'en';
type Line = Record<StoryLanguage, string>;

interface Chapter {
  image: string;
  frame: readonly [number, number];
  lantern: readonly [number, number];
  location: Line;
  title: Line;
  italic: Line;
  text: Line;
}

export const chapters: readonly Chapter[] = [
  {
    image: 'kalisepi.webp',
    frame: [0.66, 0.5],
    lantern: [0.69, 0.48],
    location: { id: 'Gerbang desa', en: 'The village gate' },
    title: { id: 'Indo', en: 'Indo' },
    italic: { id: 'Ghost', en: 'Ghost' },
    text: {
      id: 'Gerbang Kalisepi menutup saat petang. Malam ini, lampion ronda desa jatuh ke tanganmu.',
      en: 'At dusk, the gates of Kalisepi close. Tonight, the village watch lantern passes into your hands.',
    },
  },
  {
    image: 'coin-alley.webp',
    frame: [0.65, 0.48],
    lantern: [0.82, 0.79],
    location: { id: 'Gang koin', en: 'The coin alley' },
    title: { id: 'Gemerincing', en: 'The missing' },
    italic: { id: 'di gang.', en: 'coins.' },
    text: {
      id: 'Satu per satu, koin warga jatuh di gang. Di balik pagar bambu, sepasang kaki kecil mulai berlari.',
      en: 'Coins spill from the villagers’ doorways. Behind the bamboo fence, a pair of small bare feet breaks into a run.',
    },
  },
  {
    image: 'lantern-floor.webp',
    frame: [0.65, 0.5],
    lantern: [0.78, 0.6],
    location: { id: 'Serambi tegel', en: 'The tiled veranda' },
    title: { id: 'Jejak di', en: 'Beneath the' },
    italic: { id: 'bawah tegel.', en: 'tiles.' },
    text: {
      id: 'Jejak basah berhenti di tengah serambi. Dekatkan lampion. Tiap tegel menyimpan petunjuk tentang siapa yang bersembunyi.',
      en: 'Wet footprints stop halfway across the veranda. Lower the lantern. Each tile holds a clue to what is hiding underneath.',
    },
  },
  {
    image: 'whisper-house.webp',
    frame: [0.69, 0.5],
    lantern: [0.79, 0.48],
    location: { id: 'Pendopo tua', en: 'The old pavilion' },
    title: { id: 'Tawa di balik', en: 'Behind the' },
    italic: { id: 'pintu.', en: 'door.' },
    text: {
      id: 'Kentongan desa masih bungkam. Di ruang sebelah, seseorang tertawa. Dengarkan langkahnya sebelum kau membuka pintu.',
      en: 'The village gong is silent. In the next room, someone laughs. Listen for her footsteps before you open the door.',
    },
  },
];

export interface StoryFrame {
  position: number;
  pointerX: number;
  pointerY: number;
  draw?: (seconds: number) => void;
}
