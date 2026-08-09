/**
 * Thử mật khẩu với kho khoá ngay trên máy, biết kết quả trong một giây.
 *
 *   node scripts/kiem-mat-khau.mjs
 *
 * Thử trên GitHub Actions mỗi lần mất gần một phút, mà nếu sai thì cũng chỉ nhận
 * lại đúng câu "sai mật khẩu". Ở đây gõ tới khi đúng thì thôi.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { join } from 'node:path';

const JKS = process.env.KEYSTORE_OUT || 'D:/keys-lamlestudio/upload-key.jks';

function findExe(name, extraDirs = []) {
  const exe = process.platform === 'win32' ? `${name}.exe` : name;
  const sep = process.platform === 'win32' ? ';' : ':';
  for (const d of [...extraDirs, ...(process.env.PATH ?? '').split(sep)]) {
    if (d && existsSync(join(d, exe))) return join(d, exe);
  }
  return null;
}

const KEYTOOL = findExe('keytool', process.env.JAVA_HOME ? [join(process.env.JAVA_HOME, 'bin')] : []);
const line = (s = '') => console.log(s);
const rule = () => line('─'.repeat(72));

if (!KEYTOOL || !existsSync(JKS)) {
  line(!KEYTOOL ? '✗ Không tìm thấy keytool.' : `✗ Không thấy kho khoá tại ${JKS}`);
  process.exit(1);
}

/** Trả về danh sách alias nếu mở được, null nếu sai mật khẩu. */
function thu(pw) {
  const r = spawnSync(KEYTOOL, ['-list', '-keystore', JKS, '-storepass', pw], { encoding: 'utf8' });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  if (r.status !== 0) return null;
  return [...out.matchAll(/^(.+?),.*(?:PrivateKeyEntry|SecretKeyEntry)/gm)].map((m) => m[1].trim());
}

rule();
line('THỬ MẬT KHẨU VỚI KHO KHOÁ');
rule();
line(`Kho khoá: ${JKS}`);
line('Gõ mật khẩu rồi Enter. Gõ sẽ hiện chữ. Bỏ trống rồi Enter để thoát.');
line();

const rl = createInterface({ input: process.stdin, output: process.stdout });
// Đóng stdin (Ctrl+C, hoặc chạy qua đường ống) thì rl.question không bao giờ
// trả về — phải tự thoát, nếu không tiến trình treo im lìm.
let xong = false;
rl.on('close', () => {
  if (!xong) process.exit(0);
});

let lan = 0;
for (;;) {
  const pw = await rl.question('Mật khẩu: ');
  if (pw === '') break;
  lan++;

  const aliases = thu(pw) ?? thu(pw.trim());
  if (aliases) {
    const sach = thu(pw) ? pw : pw.trim();
    xong = true;
    rl.close();
    line();
    rule();
    line('✓ ĐÚNG MẬT KHẨU');
    rule();
    if (sach !== pw) line('Lưu ý: phải cắt khoảng trắng thừa mới đúng. Dán bản đã cắt vào secret.');
    line(`Alias trong kho: ${aliases.join(', ') || '(không có khoá riêng nào)'}`);
    line();
    line('Nạp lại hai secret này cho khớp:');
    line(`  ANDROID_STORE_PASSWORD = ${sach}`);
    line(`  ANDROID_KEY_PASSWORD   = ${sach}`);
    line(`  ANDROID_KEY_ALIAS      = ${aliases[0] ?? 'upload'}`);
    line();
    line('Sửa tại: https://github.com/mrlamsharing1585-TSS/counting-shadow/settings/secrets/actions');
    rule();
    process.exit(0);
  }

  line(`  ✗ sai (lần ${lan})`);
  if (lan === 3) {
    line();
    line('  Không nhớ nổi thì dừng đoán ở đây. Mật khẩu không đọc lại được từ tệp.');
    line('  Tạo khoá mới rất nhanh và lúc này hoàn toàn vô hại, vì app chưa lên cửa hàng:');
    line();
    line('    del D:\\keys-lamlestudio\\upload-key.jks');
    line('    node scripts/tao-keystore.mjs');
    line('    node scripts/xuat-base64.mjs');
    line();
    line('  Rồi nạp lại cả 4 secret. Sau khi app đã phát hành thì KHÔNG làm lại được nữa.');
    line();
  }
}

xong = true;
rl.close();
line('Đã thoát.');
