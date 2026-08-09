const KEY = 'game123.save.v1';

import { detectLang, type Lang } from './i18n';

export interface SaveData {
  best: number;
  bestDistance: number;
  runs: number;
  muted: boolean;
  /** null = chưa chọn tay, cứ theo ngôn ngữ của máy. */
  lang: Lang | null;
}

const DEFAULT: SaveData = { best: 0, bestDistance: 0, runs: 0, muted: false, lang: null };

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<SaveData>) };
  } catch {
    return { ...DEFAULT };
  }
}

/** Ngôn ngữ người chơi đã chọn, chưa chọn thì lấy theo máy. */
export function resolveLang(save: SaveData): Lang {
  return save.lang ?? detectLang();
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* localStorage bị chặn (private mode) — bỏ qua, không ảnh hưởng gameplay */
  }
}
