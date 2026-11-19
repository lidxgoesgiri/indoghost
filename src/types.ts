export type Lang = 'id' | 'en';
export type Mode = 'chase' | 'sweeper' | 'escape';
export type Clue = 'brass-key' | 'pavilion-mark' | 'dawn-seal';
export type Route = 'play' | 'map' | 'journal' | 'settings' | 'credits' | Mode;

export interface GameResult {
  coins: number;
  flame: number;
  clue?: Clue;
}

export interface GamePreferences {
  lang: Lang;
  reducedMotion: boolean;
}

export interface GameOptions extends GamePreferences {
  night: number;
  flame: number;
  clues: Clue[];
  onCue(cue: string): void;
  onThreat(level: number): void;
  onWin(result: GameResult): void;
  onLose(reason: string): void;
  onPause(): void;
}

export interface GameHandle {
  pause(): void;
  resume(): void;
  destroy(): void;
  updatePreferences(preferences: GamePreferences): void;
}
