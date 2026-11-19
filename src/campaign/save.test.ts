import { describe, expect, it } from 'vitest';
import { defaults, flames, clues, JournalStore, nightKey, parseBackup, prefsKey } from './save';
import { scoreStep } from './sound';
import type { GameResult } from '../types';

const base = defaults('en', false);
const oldPrefs = { lang: 'id', horror: 'quiet', sound: false, level: 0.3, reducedMotion: true, consent: true };
const first = { coins: 5, flame: 2 },
  second: GameResult = { coins: 0, flame: -1, clue: 'brass-key' };
function storage(initial: Record<string, string> = {}) {
  return {
    getItem: (key: string) => initial[key] ?? null,
    setItem: (key: string, value: string) => {
      initial[key] = value;
    }
  };
}
const backup = (nights: unknown[], prefs: unknown = oldPrefs) =>
  JSON.stringify({ format: 'indoghost-v1', preferences: prefs, nights });

describe('jurnal v1 dan pengaturan kampanye', () => {
  it('memuat data v1 lama dan mengisi bus musik yang baru', () => {
    const store = new JournalStore(
      storage({
        [prefsKey]: JSON.stringify(oldPrefs),
        [nightKey(1)]: JSON.stringify(first),
        [nightKey(2)]: JSON.stringify(second)
      }),
      base
    );
    expect(store.snapshot().prefs).toMatchObject({ ...oldPrefs, music: 0.75, ambience: 0.75, effects: 0.8 });
    expect(flames(store.snapshot().nights)).toBe(1);
    expect(clues(store.snapshot().nights)).toEqual(['brass-key']);
  });
  it('menahan bab terkunci serta mencegah hadiah replay ganda antartab', () => {
    const disk = storage(),
      a = new JournalStore(disk, base),
      b = new JournalStore(disk, base);
    expect(a.record(2, second)).toBe(false);
    expect(a.record(1, first)).toBe(true);
    expect(b.record(1, { coins: 99, flame: 99 })).toBe(false);
    expect(b.record(2, second)).toBe(true);
    a.refresh();
    expect(a.snapshot().nights).toEqual([first, second]);
  });
  it('mengambil awalan yang bisa dipulihkan bahkan saat preferensi ikut rusak', () => {
    const store = new JournalStore(
      storage({ [prefsKey]: '{', [nightKey(1)]: JSON.stringify(first), [nightKey(2)]: '{' }),
      base
    );
    expect(store.snapshot()).toMatchObject({ notice: 'damaged', nights: [first], prefs: base });
    expect(store.record(2, second)).toBe(true);
    expect(store.snapshot().nights).toEqual([first, second]);
  });
  it('tetap menyimpan progres sesi ketika browser menolak penulisan', () => {
    const store = new JournalStore(
      {
        getItem: () => null,
        setItem: () => {
          throw new Error('quota');
        }
      },
      base
    );
    expect(store.record(1, first)).toBe(true);
    expect(store.record(2, second)).toBe(true);
    store.refresh();
    expect(store.snapshot()).toMatchObject({ notice: 'session', nights: [first, second] });
  });
  it('memvalidasi seluruh impor dahulu dan mempertahankan bab dan preferensi lokal', () => {
    const store = new JournalStore(storage(), base);
    store.record(1, { coins: 5, flame: 3 });
    store.setPreferences({ ...base, lang: 'en', music: 0.2 });
    const good = parseBackup(backup([first, second]), base);
    expect(store.merge(good)).toBe(1);
    expect(store.merge(good)).toBe(0);
    expect(store.snapshot().nights).toEqual([{ coins: 5, flame: 3 }, second]);
    expect(store.snapshot().prefs.music).toBe(0.2);
    expect(() => parseBackup(backup([first, { ...second, clue: 'dawn-seal' }]), base)).toThrow();
    expect(() => parseBackup(backup([first, null]), base)).toThrow();
    expect(() => parseBackup(backup([first], { ...oldPrefs, level: 99 }), base)).toThrow();
    expect(() => parseBackup(' '.repeat(33000), base)).toThrow();
  });
  it('memindahkan preferensi lama pada profil baru tanpa memaksa consent', () => {
    const store = new JournalStore(null, base);
    store.merge(parseBackup(backup([first], { ...oldPrefs, consent: false }), base));
    expect(store.snapshot().prefs).toMatchObject({ lang: 'id', horror: 'quiet', consent: false });
  });
});
describe('partitur adaptif', () => {
  it.each(['chase', 'sweeper', 'escape'] as const)(
    '%s menambah detak dan interval disonan saat ancaman mendekat',
    (mode) => {
      const quiet = scoreStep(mode, 0, 1),
        danger = scoreStep(mode, 1, 1);
      expect(danger.spacing).toBeLessThan(quiet.spacing);
      expect(danger.pulseGain).toBeGreaterThan(quiet.pulseGain);
      expect(quiet.dissonance).toBe(false);
      expect(danger.dissonance).toBe(true);
      expect(quiet.melody).not.toBe(scoreStep(mode, 0, 2).melody);
    }
  );
});
