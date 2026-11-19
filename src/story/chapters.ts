export type StoryLanguage = 'id' | 'en';
type Line = Record<StoryLanguage, string>;

interface Chapter {
  image: string;
  frame: readonly [number, number];
  /** Portrait art direction: anchor x, anchor y (from the bottom) and zoom, so the focal point clears the copy. */
  portrait: readonly [number, number, number];
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
    portrait: [0.69, 0, 1.32],
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
    portrait: [0.7, 0, 1.34],
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
    portrait: [0.62, 0.25, 1.2],
    lantern: [0.866, 0.6],
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
    portrait: [0.72, 0, 1.26],
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

export type Dread = 'quiet' | 'balanced' | 'full';

export interface StoryFrame {
  position: number;
  pointerX: number;
  pointerY: number;
  /** 1 while a real pointer (mouse hover or a recent tap) holds the lantern, easing to 0 otherwise. */
  pointerLive: number;
  dread: Dread;
  /** Called when a chapter's scare beat starts, so sound can follow the picture. */
  onBeat?: (chapter: number) => void;
  draw?: (seconds: number) => void;
}
