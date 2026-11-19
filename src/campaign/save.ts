import type { Clue, GameResult, Lang } from '../types';
import { expectedClues } from './story';

export const prefsKey = 'indoghost.preferences.v1';
export const nightKey = (n: number) => 'indoghost.night.v1.' + n;
export type Horror = 'quiet' | 'balanced' | 'full';
export interface Preferences {
  lang: Lang;
  reducedMotion: boolean;
  consent: boolean;
  horror: Horror;
  sound: boolean;
  level: number;
  music: number;
  ambience: number;
  effects: number;
}
export interface SaveState {
  prefs: Preferences;
  hasPrefs: boolean;
  nights: GameResult[];
  notice: '' | 'damaged' | 'session';
}
export interface Backup {
  nights: GameResult[];
  preferences: Preferences | null;
}
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const volume = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
const isHorror = (value: unknown): value is Horror =>
  value === 'quiet' || value === 'full' || value === 'balanced';
export const defaults = (lang: Lang, reducedMotion: boolean): Preferences => ({
  lang,
  reducedMotion,
  sound: false,
  level: 0.55,
  music: 0.75,
  ambience: 0.75,
  effects: 0.8,
  horror: 'balanced',
  consent: false
});
function preferences(value: unknown, base: Preferences): Preferences {
  if (!object(value)) return base;
  return {
    lang: value.lang === 'id' ? 'id' : value.lang === 'en' ? 'en' : base.lang,
    reducedMotion: typeof value.reducedMotion === 'boolean' ? value.reducedMotion : base.reducedMotion,
    sound: value.sound === true,
    consent: value.consent === true,
    horror: isHorror(value.horror) ? value.horror : base.horror,
    level: volume(value.level, base.level),
    music: volume(value.music, base.music),
    ambience: volume(value.ambience, base.ambience),
    effects: volume(value.effects, base.effects)
  };
}
export function isRecord(value: unknown, night: number): value is GameResult {
  if (!object(value)) return false;
  return (
    typeof value.coins === 'number' &&
    Number.isSafeInteger(value.coins) &&
    value.coins >= 0 &&
    typeof value.flame === 'number' &&
    Number.isSafeInteger(value.flame) &&
    value.flame >= -1 &&
    (value.clue == null || (typeof value.clue === 'string' && value.clue === expectedClues[night]))
  );
}
export const flames = (records: GameResult[]) =>
  Math.max(
    0,
    records.reduce((total, item) => total + item.flame, 0)
  );
export const clues = (records: GameResult[]): Clue[] =>
  records.flatMap((item) => (item.clue ? [item.clue] : []));
export function parseBackup(source: string, base: Preferences): Backup {
  if (source.length > 32768) throw new Error('size');
  const data: unknown = JSON.parse(source);
  if (!object(data) || data.format !== 'indoghost-v1' || !Array.isArray(data.nights) || data.nights.length > 7)
    throw new Error('schema');
  const restored = data.nights.map((entry: unknown, index: number) => {
    if (!isRecord(entry, index + 1)) throw new Error('night');
    return { coins: entry.coins, flame: entry.flame, ...(entry.clue ? { clue: entry.clue } : {}) };
  });
  const prefs = data.preferences;
  if (prefs !== null) {
    if (
      !object(prefs) ||
      !['id', 'en'].includes(String(prefs.lang)) ||
      !isHorror(prefs.horror) ||
      typeof prefs.sound !== 'boolean' ||
      typeof prefs.consent !== 'boolean' ||
      typeof prefs.reducedMotion !== 'boolean' ||
      typeof prefs.level !== 'number' ||
      !Number.isFinite(prefs.level) ||
      prefs.level < 0 ||
      prefs.level > 1
    )
      throw new Error('preferences');
    for (const key of ['music', 'ambience', 'effects']) {
      const value = prefs[key];
      if (
        value !== undefined &&
        (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1)
      )
        throw new Error('mix');
    }
  }
  return { nights: restored, preferences: prefs === null ? null : preferences(prefs, base) };
}

export class JournalStore {
  private state: SaveState;
  private listeners = new Set<() => void>();
  constructor(
    private storage: StoragePort | null,
    private base: Preferences
  ) {
    this.state = { prefs: base, hasPrefs: false, nights: [], notice: storage ? '' : 'session' };
    this.refresh();
  }
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(next: SaveState) {
    this.state = next;
    for (const fn of this.listeners) fn();
  }
  refresh = () => {
    if (!this.storage) return;
    let notice: SaveState['notice'] = '';
    const nights: GameResult[] = [];
    let prefs = this.base,
      hasPrefs = false;
    try {
      const rawPrefs = this.storage.getItem(prefsKey);
      if (rawPrefs !== null) {
        try {
          const parsed: unknown = JSON.parse(rawPrefs);
          if (!object(parsed)) throw new Error();
          prefs = preferences(parsed, this.base);
          hasPrefs = true;
        } catch {
          notice = 'damaged';
        }
      }
      for (let n = 1; n <= 7; n++) {
        const raw = this.storage.getItem(nightKey(n));
        if (raw === null) break;
        try {
          const item: unknown = JSON.parse(raw);
          if (!isRecord(item, n)) throw new Error();
          nights.push(item);
        } catch {
          notice = 'damaged';
          break;
        }
      }
    } catch {
      this.storage = null;
      this.publish({ ...this.state, notice: 'session' });
      return;
    }
    this.publish({ prefs, hasPrefs, nights, notice });
  };
  private write(key: string, value: unknown) {
    try {
      this.storage?.setItem(key, JSON.stringify(value));
    } catch {
      this.storage = null;
    }
  }
  setPreferences(prefs: Preferences) {
    this.write(prefsKey, prefs);
    this.publish({
      ...this.state,
      prefs,
      hasPrefs: true,
      notice: this.storage ? this.state.notice : 'session'
    });
  }
  record(night: number, result: GameResult) {
    this.refresh();
    if (night !== this.state.nights.length + 1 || night > 7 || !isRecord(result, night)) return false;
    this.write(nightKey(night), result);
    this.publish({
      ...this.state,
      nights: [...this.state.nights, result],
      notice: this.storage ? '' : 'session'
    });
    return true;
  }
  merge(backup: Backup) {
    this.refresh();
    const before = this.state.nights.length;
    if (!this.state.hasPrefs && backup.preferences) this.setPreferences(backup.preferences);
    for (let i = before; i < backup.nights.length; i++) this.record(i + 1, backup.nights[i]);
    return this.state.nights.length - before;
  }
}
export function browserJournal() {
  const base = defaults(
    /^(id|in)(-|$)/i.test(navigator.language) ? 'id' : 'en',
    matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  try {
    return new JournalStore(window.localStorage, base);
  } catch {
    return new JournalStore(null, base);
  }
}
