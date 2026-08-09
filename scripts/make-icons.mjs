/**
 * Sinh bộ ảnh nguồn cho icon và splash từ SVG vẽ tay, rồi để
 * `npx capacitor-assets generate` xuất ra đủ mọi kích thước cho Android/iOS.
 *
 *   node scripts/make-icons.mjs
 *
 * Hình lấy đúng khuôn mặt quản trò trong game: quả cầu đỏ, mắt xếch, miệng cau.
 * Vẽ bằng SVG thuần (không có chữ) nên không phụ thuộc font của máy.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
mkdirSync(OUT, { recursive: true });

const BG_TOP = '#2a1c48';
const BG_BOTTOM = '#150f27';
const RED = '#e0241f';
const RED_DARK = '#8e1a17';
const INK = '#180404';

/** Khuôn mặt quản trò, vẽ trong hệ toạ độ 1024×1024, tâm (512, 512). */
function head(r, cx = 512, cy = 512) {
  const k = r / 330; // hệ số theo bán kính chuẩn
  const eye = (ex, dir) => {
    const w = 62 * k;
    const p = [
      [ex - dir * w, cy - 57 * k],
      [ex + dir * w, cy - 14 * k],
      [ex + dir * w, cy + 20 * k],
      [ex - dir * w, cy + 5 * k],
    ];
    return `<polygon points="${p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}"
      fill="#ffffff" stroke="${INK}" stroke-width="${16 * k}" stroke-linejoin="round"/>`;
  };
  const mr = 95 * k;
  const my = cy + 178 * k;
  const a = (deg) => [cx + mr * Math.cos((deg * Math.PI) / 180), my + mr * Math.sin((deg * Math.PI) / 180)];
  const [mx1, my1] = a(212);
  const [mx2, my2] = a(327);

  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#ball)" stroke="${INK}" stroke-width="${26 * k}"/>
    <ellipse cx="${cx - 0.33 * r}" cy="${cy - 0.42 * r}" rx="${0.3 * r}" ry="${0.13 * r}"
             transform="rotate(-24 ${cx - 0.33 * r} ${cy - 0.42 * r})" fill="#ffffff" opacity="0.42"/>
    ${eye(cx - 112 * k, 1)}
    ${eye(cx + 112 * k, -1)}
    <path d="M ${mx1.toFixed(1)} ${my1.toFixed(1)} A ${mr.toFixed(1)} ${mr.toFixed(1)} 0 0 1 ${mx2.toFixed(1)} ${my2.toFixed(1)}"
          fill="none" stroke="${INK}" stroke-width="${34 * k}" stroke-linecap="round"/>`;
}

const defs = `
  <defs>
    <radialGradient id="ball" cx="38%" cy="32%" r="78%">
      <stop offset="0%" stop-color="#ff4a3f"/>
      <stop offset="62%" stop-color="${RED}"/>
      <stop offset="100%" stop-color="${RED_DARK}"/>
    </radialGradient>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${BG_TOP}"/>
      <stop offset="100%" stop-color="${BG_BOTTOM}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ff2f2f" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#ff2f2f" stop-opacity="0"/>
    </radialGradient>
  </defs>`;

const svg = (size, body) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${defs}${body}</svg>`,
  );

const background = `<rect width="1024" height="1024" fill="url(#bg)"/>
  <circle cx="512" cy="512" r="470" fill="url(#glow)"/>`;

const files = [
  // Nền và lớp trên của adaptive icon Android. Android xén tròn/vuông tuỳ máy
  // nên phần quan trọng phải nằm gọn trong vòng an toàn ~66% ở giữa.
  ['icon-background.png', 1024, background],
  ['icon-foreground.png', 1024, head(232)],
  // Icon phẳng cho iOS và cửa hàng.
  ['icon-only.png', 1024, background + head(300)],
  // Splash: Android 12+ chỉ hiện phần giữa nên để hình nhỏ lại.
  ['splash.png', 2732, background + head(150)],
  ['splash-dark.png', 2732, background + head(150)],
];

for (const [name, size, body] of files) {
  await sharp(svg(size, body), { density: 400 })
    .resize(size, size)
    .png()
    .toFile(join(OUT, name));
  console.log(`${name}  ${size}x${size}`);
}

/* --------------------------------------------- ảnh riêng cho trang cửa hàng */

const STORE = join(OUT, '..', 'store');
mkdirSync(STORE, { recursive: true });

// Google Play bắt buộc icon 512×512.
await sharp(svg(1024, background + head(300)), { density: 400 })
  .resize(512, 512)
  .png()
  .toFile(join(STORE, 'play-icon-512.png'));
console.log('store/play-icon-512.png  512x512');

// Google Play bắt buộc ảnh bìa 1024×500. Không dùng chữ để khỏi phụ thuộc font
// của máy — chữ sẽ do trang cửa hàng tự hiển thị bên dưới.
const featureSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  ${defs}
  <rect width="1024" height="500" fill="url(#bg)"/>
  <ellipse cx="512" cy="250" rx="520" ry="300" fill="url(#glow)"/>
  <g transform="translate(512,250) scale(0.62) translate(-512,-512)">${head(300)}</g>
  <g opacity="0.5">
    <circle cx="150" cy="120" r="9" fill="#5ecbff"/>
    <circle cx="880" cy="150" r="7" fill="#5ecbff"/>
    <circle cx="205" cy="390" r="6" fill="#5ecbff"/>
    <circle cx="835" cy="365" r="10" fill="#5ecbff"/>
  </g>
</svg>`);
await sharp(featureSvg, { density: 400 }).resize(1024, 500).png().toFile(join(STORE, 'play-feature-1024x500.png'));
console.log('store/play-feature-1024x500.png  1024x500');
