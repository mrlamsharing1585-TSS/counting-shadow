import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
process.chdir('D:/123');

const ok = (b) => (b ? '✓' : '✗ LỖI');
const lines = [];

async function meta(p) {
  const m = await sharp(p).metadata();
  return { w: m.width, h: m.height, ch: m.channels, alpha: m.hasAlpha, kb: Math.round(statSync(p).size / 1024) };
}

// --- icon 512 của Play: 32-bit PNG, cho phép alpha, tối đa 1 MB ---
const icon = await meta('store/play-icon-512.png');
lines.push(`${ok(icon.w === 512 && icon.h === 512 && icon.kb < 1024)} Play icon 512×512 — ${icon.w}×${icon.h}, ${icon.kb} KB`);

// --- ảnh bìa: 1024×500, PNG 24-bit KHÔNG được có kênh alpha ---
const feat = await meta('store/play-feature-1024x500.png');
lines.push(
  `${ok(feat.w === 1024 && feat.h === 500 && !feat.alpha)} Ảnh bìa Play 1024×500, không alpha — ` +
    `${feat.w}×${feat.h}, ${feat.ch} kênh, alpha: ${feat.alpha}`,
);

// --- icon App Store 1024: Apple TỪ CHỐI icon có kênh alpha ---
const ios = await meta('assets/icon-only.png');
lines.push(
  `${ok(ios.w === 1024 && ios.h === 1024 && !ios.alpha)} Icon App Store 1024×1024, không alpha — ` +
    `${ios.w}×${ios.h}, ${ios.ch} kênh, alpha: ${ios.alpha}`,
);

// --- ảnh chụp: 2–8 tấm, mỗi cạnh 320–3840 px ---
for (const dir of ['store/en/android', 'store/vi/android', 'store/en/ios-6.7', 'store/vi/ios-6.7']) {
  if (!existsSync(dir)) { lines.push(`✗ LỖI thiếu ${dir}`); continue; }
  const files = readdirSync(dir).filter((f) => f.endsWith('.png'));
  const ms = await Promise.all(files.map((f) => meta(join(dir, f))));
  const sizes = [...new Set(ms.map((m) => `${m.w}×${m.h}`))];
  const inRange = ms.every((m) => Math.min(m.w, m.h) >= 320 && Math.max(m.w, m.h) <= 3840);
  const maxKb = Math.max(...ms.map((m) => m.kb));
  lines.push(
    `${ok(files.length >= 2 && files.length <= 8 && sizes.length === 1 && inRange && maxKb < 8192)} ` +
      `${dir} — ${files.length} tấm, ${sizes.join('/')}, lớn nhất ${maxKb} KB`,
  );
}

// --- đếm ký tự phần chữ ---
const listing = readFileSync('store/listing.md', 'utf8');
const block = (label) => {
  const i = listing.indexOf(label);
  if (i < 0) return null;
  const start = listing.indexOf('```', i) + 3;
  return listing.slice(start, listing.indexOf('```', start)).trim();
};
const checks = [
  ['**Tên ứng dụng** (≤30 ký tự)', 30, 'Tên VI'],
  ['**Mô tả ngắn** (≤80 ký tự — Google Play)', 80, 'Mô tả ngắn VI'],
  ['**Phụ đề** (≤30 ký tự — App Store)', 30, 'Phụ đề VI'],
  ['**App name** (≤30)', 30, 'Tên EN'],
  ['**Short description** (≤80)', 80, 'Mô tả ngắn EN'],
  ['**Subtitle** (≤30 — App Store)', 30, 'Phụ đề EN'],
  ['**Keywords** (App Store, ≤100)', 100, 'Từ khoá EN'],
  ['**Từ khoá** (App Store, ≤100 ký tự, ngăn bằng dấu phẩy, không dấu cách)', 100, 'Từ khoá VI'],
];
for (const [label, max, name] of checks) {
  const text = block(label);
  if (text === null) { lines.push(`✗ LỖI không tìm thấy mục "${name}"`); continue; }
  lines.push(`${ok(text.length <= max)} ${name}: ${text.length}/${max} ký tự`);
}
for (const [label, name] of [['**Mô tả dài**', 'Mô tả dài VI'], ['**Full description**', 'Mô tả dài EN']]) {
  const text = block(label);
  lines.push(`${ok(text && text.length <= 4000)} ${name}: ${text?.length}/4000 ký tự`);
}

console.log(lines.join('\n'));
console.log('\n' + (lines.some((l) => l.includes('LỖI')) ? '>>> CÓ LỖI, xem dòng đánh dấu' : '>>> tất cả đạt yêu cầu cửa hàng'));
