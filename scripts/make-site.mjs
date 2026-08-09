/**
 * Dựng trang tĩnh để đưa lên GitHub Pages:
 *
 *   site/index.html    trang giới thiệu + liên kết
 *   site/privacy.html  chính sách quyền riêng tư (bắt buộc phải có URL công khai
 *                      thì cả Google Play lẫn App Store mới cho nộp)
 *   site/play/         bản chơi thử ngay trên trình duyệt
 *
 * PRIVACY.md là nguồn duy nhất, trang HTML sinh ra từ đó nên không bao giờ lệch.
 *
 *   npm run site
 */
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
mkdirSync(SITE, { recursive: true });

const CSS = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 48px 20px 96px;
    background: #150f27; color: #d8d2e6;
    font: 16px/1.7 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif;
  }
  main { max-width: 720px; margin: 0 auto; }
  h1 { color: #ff4b5e; font-size: 34px; line-height: 1.2; margin: 0 0 8px; }
  h2 { color: #f4eefc; font-size: 21px; margin: 40px 0 10px; }
  h3 { color: #f4eefc; font-size: 17px; margin: 28px 0 6px; }
  a { color: #5ecbff; }
  hr { border: 0; border-top: 1px solid #2f2545; margin: 44px 0; }
  code { background: #241c3d; padding: 2px 6px; border-radius: 4px; font-size: 90%; }
  ul { padding-left: 22px; }
  li { margin: 6px 0; }
  .badge {
    display: inline-block; margin: 24px 8px 0 0; padding: 11px 22px;
    background: #e0241f; color: #fff; text-decoration: none;
    border-radius: 999px; font-weight: bold;
  }
  .badge.ghost { background: transparent; border: 1px solid #4a3c6e; color: #d8d2e6; }
  .muted { color: #8f86a8; font-size: 14px; }
  .hero { text-align: center; margin-bottom: 8px; }
  .hero img { width: 132px; height: 132px; border-radius: 30px; }
`;

const page = (title, body, lang = 'vi') => `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${CSS}</style>
</head>
<body><main>${body}</main></body>
</html>
`;

// --- chính sách quyền riêng tư, dựng từ PRIVACY.md ---
const privacyMd = readFileSync(join(ROOT, 'PRIVACY.md'), 'utf8');
writeFileSync(
  join(SITE, 'privacy.html'),
  page('123 — Chính sách quyền riêng tư / Privacy Policy', marked.parse(privacyMd)),
);

// --- trang chủ ---
const hasBuild = existsSync(join(ROOT, 'dist', 'index.html'));
writeFileSync(
  join(SITE, 'index.html'),
  page(
    '123 — Bóng Đen Đang Đếm',
    `<div class="hero">
       <img src="icon.png" alt="">
       <h1>123</h1>
       <p class="muted">Bóng Đen Đang Đếm · The Shadow Is Counting</p>
     </div>
     <p>Nó đang đếm. Nó sắp quay lại. Giữ tay để đứng im, buông tay là chạy.</p>
     <p class="muted">It's counting. It's about to turn. Hold to freeze, let go to run.</p>
     <p>
       ${hasBuild ? '<a class="badge" href="play/">Chơi thử · Play now</a>' : ''}
       <a class="badge ghost" href="privacy.html">Quyền riêng tư · Privacy</a>
     </p>`,
  ),
);

cpSync(join(ROOT, 'assets', 'icon-only.png'), join(SITE, 'icon.png'));
if (hasBuild) cpSync(join(ROOT, 'dist'), join(SITE, 'play'), { recursive: true });

console.log(`site/  →  index.html, privacy.html${hasBuild ? ', play/' : ' (chưa có dist, bỏ qua bản chơi thử)'}`);
