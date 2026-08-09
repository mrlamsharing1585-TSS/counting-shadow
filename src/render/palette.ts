/** Bảng màu dùng chung cho HUD 2D và cảnh 3D. */
export const COLORS = {
  skyTop: '#1d1533',
  skyMid: '#3a2050',
  skyLow: '#120c22',
  skyGlow: '#8a2b4c',

  tileTop: '#e9dab2',
  tileTopAlt: '#ddcb9c',
  tileSide: '#a18f6c',
  slab: '#6b5c42',
  hole: '#191223',
  checkpoint: '#5fe0a4',

  rock: '#5b6270',
  leaf: '#6fb04a',
  leafDark: '#3f7a33',
  trunk: '#6b4a2e',

  // Nhân vật chính: một đứa bé. Màu chọn sao cho vẫn đủ đậm để nổi trên nền
  // đá sáng, nhưng có màu chứ không phải bóng đen như trước.
  kidSkin: '#f2c49b',
  kidHair: '#3b2416',
  kidShirt: '#2f8fd0',
  kidShorts: '#2b3a55',
  kidShoe: '#d9483b',
  kidPack: '#e8a13c',
  boss: '#e0241f',
  bossDark: '#8e1a17',
  danger: '#ff4b5e',

  flame: '#5ecbff',
  clockBody: '#d8342a',
  clockFace: '#fdf5e0',
  orb: '#3fd8ff',
  gold: '#f0b13c',
  monolith: '#241d36',
  rune: '#ff2f4e',

  text: '#f4eefc',
  textDim: 'rgba(244,238,252,0.65)',
} as const;

/** Đổi '#rrggbb' sang số nguyên cho Three.js. */
export function hex(color: string): number {
  return parseInt(color.slice(1), 16);
}
