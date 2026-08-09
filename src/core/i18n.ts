/**
 * Toàn bộ chữ hiển thị cho người chơi gom về đây.
 *
 * Mặc định là tiếng Anh để phát hành đa thị trường; máy nào đặt ngôn ngữ tiếng
 * Việt thì tự chuyển sang tiếng Việt. Người chơi đổi tay được ở màn hình chính,
 * lựa chọn đó được ghi nhớ.
 */
export type Lang = 'en' | 'vi';

export interface Strings {
  /** Tên ngôn ngữ hiển thị trên nút đổi tiếng. */
  label: string;
  progress: (tiles: number, level: number) => string;

  stop: string;
  stopHint: string;
  holdStill: string;
  dontMove: string;
  brakeStill: string;
  brakeBraking: string;
  brakeHold: string;

  checkpoint: string;
  revived: string;
  pickupShield: string;
  pickupClock: (seconds: number) => string;

  hintLane: string;
  hintHold: string;

  tagline: string;
  howToPlay: string[];
  best: (score: number, tiles: number) => string;
  tapToStart: string;

  gameOver: string;
  deathHole: string;
  deathCrash: string;
  deathTimeout: string;
  deathCaught: string;
  scoreSub: (tiles: number) => string;
  newRecord: string;
  bestShort: (score: number) => string;
  tapToRetry: string;

  rotateHint: string;
}

const EN: Strings = {
  label: 'EN',
  progress: (tiles, level) => `${tiles} tiles · lvl ${level}`,

  stop: 'STOP!',
  stopHint: 'hold anywhere on screen',
  holdStill: 'HOLD STILL…',
  dontMove: "DON'T MOVE!",
  brakeStill: 'STILL',
  brakeBraking: 'BRAKING',
  brakeHold: 'HOLD',

  checkpoint: 'CHECKPOINT',
  revived: 'REVIVED!',
  pickupShield: '+1 SHIELD',
  pickupClock: (s) => `+${s}s`,

  hintLane: '◀  swipe to change lane  ▶',
  hintHold: 'hold = stand still',

  tagline: 'THE SHADOW IS COUNTING',
  howToPlay: [
    'Your kid runs forward on their own.',
    '',
    'Swipe left / right to dodge rocks, trees, gaps.',
    'When “STOP!” flashes, hold anywhere on screen',
    'and stay frozen until it turns away again.',
    '',
    'Move while it stares at you and you are done.',
    'Checkpoints refill the clock.',
  ],
  best: (score, tiles) => `BEST ${score} · ${tiles} tiles`,
  tapToStart: 'TAP TO START',

  gameOver: 'GAME OVER',
  deathHole: 'YOU FELL INTO A PIT',
  deathCrash: 'YOU RAN INTO AN OBSTACLE',
  deathTimeout: 'OUT OF TIME',
  deathCaught: 'THE SHADOW SAW YOU MOVE',
  scoreSub: (tiles) => `points · ${tiles} tiles`,
  newRecord: 'NEW RECORD!',
  bestShort: (score) => `Best: ${score}`,
  tapToRetry: 'TAP TO PLAY AGAIN',

  rotateHint: 'Turn your phone upright to play',
};

const VI: Strings = {
  label: 'VI',
  progress: (tiles, level) => `${tiles} ô · cấp ${level}`,

  stop: 'DỪNG LẠI!',
  stopHint: 'giữ tay trên màn hình',
  holdStill: 'ĐỨNG YÊN…',
  dontMove: 'ĐỪNG ĐỘNG ĐẬY!',
  brakeStill: 'ĐỨNG IM',
  brakeBraking: 'PHANH',
  brakeHold: 'GIỮ TAY',

  checkpoint: 'CHECKPOINT',
  revived: 'HỒI SINH!',
  pickupShield: '+1 KHIÊN',
  pickupClock: (s) => `+${s}s`,

  hintLane: '◀  vuốt để đổi làn  ▶',
  hintHold: 'giữ tay = đứng im',

  tagline: 'BÓNG ĐEN ĐANG ĐẾM',
  howToPlay: [
    'Nhân vật tự chạy về phía trước.',
    '',
    'Vuốt trái / phải để né đá, cây, hố.',
    'Khi hiện “DỪNG LẠI!”, giữ tay trên màn hình',
    'để đứng im cho tới lúc bóng đen quay lưng.',
    '',
    'Còn nhúc nhích lúc nó nhìn thẳng là dính sét.',
    'Đi qua checkpoint sẽ nạp đầy lại giờ.',
  ],
  best: (score, tiles) => `KỶ LỤC ${score} · ${tiles} ô`,
  tapToStart: 'CHẠM ĐỂ BẮT ĐẦU',

  gameOver: 'GAME OVER',
  deathHole: 'BẠN ĐÃ RƠI XUỐNG HỐ',
  deathCrash: 'BẠN ĐÃ ĐÂM VÀO CHƯỚNG NGẠI VẬT',
  deathTimeout: 'HẾT THỜI GIAN',
  deathCaught: 'BÓNG ĐEN ĐÃ THẤY BẠN ĐỘNG ĐẬY',
  scoreSub: (tiles) => `điểm · chạy được ${tiles} ô`,
  newRecord: 'KỶ LỤC MỚI!',
  bestShort: (score) => `Kỷ lục: ${score}`,
  tapToRetry: 'CHẠM ĐỂ CHƠI LẠI',

  rotateHint: 'Xoay dọc màn hình để chơi',
};

const TABLE: Record<Lang, Strings> = { en: EN, vi: VI };
export const LANGS: Lang[] = ['en', 'vi'];

let current: Lang = 'en';

/** Đoán ngôn ngữ từ cài đặt máy; không phải tiếng Việt thì dùng tiếng Anh. */
export function detectLang(): Lang {
  const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of tags) {
    if (tag?.toLowerCase().startsWith('vi')) return 'vi';
  }
  return 'en';
}

export function setLang(lang: Lang): void {
  current = TABLE[lang] ? lang : 'en';
  document.documentElement.lang = current;
}

export function getLang(): Lang {
  return current;
}

export function nextLang(): Lang {
  return LANGS[(LANGS.indexOf(current) + 1) % LANGS.length];
}

/** Bảng chữ của ngôn ngữ đang dùng. */
export function t(): Strings {
  return TABLE[current];
}
