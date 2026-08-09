/**
 * Tạo khoá ký Android rồi in ra đúng 4 giá trị cần dán vào GitHub Secrets.
 *
 *   npm run keystore
 *
 * Tệp .jks được ghi ra NGOÀI thư mục dự án. Dự án là repo git công khai, để khoá
 * ký lọt vào đó là hỏng vĩnh viễn.
 *
 * Vì sao script tự hỏi mật khẩu thay vì để keytool hỏi: keytool không hiện ký tự
 * nào lúc gõ và bắt gõ lại lần hai để xác nhận — hai thứ đó cộng lại khiến hầu
 * hết lần thử đầu đều thất bại vì "They don't match" hoặc "password is too
 * short". Ở đây gõ có hiện chữ, chỉ hỏi một lần, rồi script tự đưa vào keytool
 * qua stdin. Mật khẩu không đi qua tham số dòng lệnh nên không lọt vào lịch sử
 * lệnh cũng như danh sách tiến trình.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { dirname, join } from 'node:path';

// KEYSTORE_OUT chỉ dùng để chạy thử; bình thường luôn ghi ra ngoài thư mục dự án.
const OUT = process.env.KEYSTORE_OUT || 'D:/keys-lamlestudio/upload-key.jks';
const ALIAS = 'upload';

const line = (s = '') => console.log(s);
const rule = () => line('─'.repeat(72));

/** Gọi thẳng tệp thực thi thay vì mượn shell — mượn shell thì tham số bị nối chuỗi. */
function findExe(name, extraDirs = []) {
  const exe = process.platform === 'win32' ? `${name}.exe` : name;
  const sep = process.platform === 'win32' ? ';' : ':';
  for (const d of [...extraDirs, ...(process.env.PATH ?? '').split(sep)]) {
    if (d && existsSync(join(d, exe))) return join(d, exe);
  }
  return null;
}

const KEYTOOL = findExe('keytool', process.env.JAVA_HOME ? [join(process.env.JAVA_HOME, 'bin')] : []);
if (!KEYTOOL) {
  line('✗ Không tìm thấy keytool. Nó đi kèm JDK — đặt JAVA_HOME rồi chạy lại.');
  process.exit(1);
}

if (existsSync(OUT)) {
  line(`Đã có sẵn khoá tại ${OUT}`);
  line('Không tạo đè — mất khoá cũ là mất quyền cập nhật app.');
  line('Muốn tạo lại thì đổi tên tệp cũ đi trước.');
} else {
  rule();
  line('TẠO KHOÁ KÝ CHO ANDROID');
  rule();
  line(`Khoá sẽ được ghi ra: ${OUT}`);
  line('Nằm ngoài thư mục dự án, nên không có đường nào lọt lên GitHub.');
  line();

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let pw = '';
  while (pw.length < 6) {
    pw = (await rl.question('Đặt mật khẩu cho khoá (tối thiểu 6 ký tự, gõ sẽ hiện chữ): ')).trim();
    if (pw.length < 6) line(`  → mới ${pw.length} ký tự, cần ít nhất 6. Gõ lại.`);
  }
  rl.close();

  line();
  line('Đang tạo khoá…');

  const res = spawnSync(
    KEYTOOL,
    [
      '-genkeypair', '-v',
      '-keystore', OUT,
      '-alias', ALIAS,
      '-keyalg', 'RSA',
      '-keysize', '4096',
      '-validity', '10000',
      '-dname', 'CN=LAMLESTUDIO, OU=Mobile, O=LAMLESTUDIO, L=Ho Chi Minh, C=VN',
    ],
    // keytool đọc mật khẩu từ stdin: lần 1 đặt, lần 2 xác nhận, dòng trống thứ
    // ba là "dùng chung mật khẩu cho khoá".
    { input: `${pw}\n${pw}\n\n`, encoding: 'utf8' },
  );

  if (res.status !== 0 || !existsSync(OUT)) {
    line();
    line('✗ Không tạo được khoá. keytool báo:');
    line((res.stderr || res.stdout || '(không có thông báo)').trim());
    process.exit(1);
  }

  line('✓ Đã tạo xong.');
  line();
  rule();
  line('MẬT KHẨU CỦA BẠN — chép vào trình quản lý mật khẩu NGAY BÂY GIỜ:');
  line();
  line(`      ${pw}`);
  line();
  line('Quên mật khẩu này là không ký được bản cập nhật nữa.');
  rule();
}

// --- chuyển sang base64 và đưa vào clipboard ---
const b64 = readFileSync(OUT).toString('base64');
const CLIP = findExe('clip', [join(process.env.SystemRoot ?? 'C:/Windows', 'System32')]);
const copied = CLIP ? spawnSync(CLIP, { input: b64 }).status === 0 : false;

line();
rule();
line('NẠP 4 SECRET NÀY VÀO GITHUB');
rule();
line();
line('Mở trang (phải đang đăng nhập tài khoản mrlamsharing1585-TSS):');
line('  https://github.com/mrlamsharing1585-TSS/counting-shadow/settings/secrets/actions/new');
line();
line('Điền Name, điền Secret, bấm Add secret. Làm 4 lần:');
line();
line('  1. Name   : ANDROID_KEYSTORE_BASE64');
line(
  copied
    ? `     Secret : bấm Ctrl+V — chuỗi ${b64.length.toLocaleString('vi-VN')} ký tự đã nằm sẵn trong clipboard`
    : `     Secret : chạy lệnh sau rồi dán\n              [Convert]::ToBase64String([IO.File]::ReadAllBytes("${OUT}")) | Set-Clipboard`,
);
line();
line('  2. Name   : ANDROID_STORE_PASSWORD');
line('     Secret : mật khẩu bạn vừa đặt');
line();
line('  3. Name   : ANDROID_KEY_ALIAS');
line(`     Secret : ${ALIAS}`);
line();
line('  4. Name   : ANDROID_KEY_PASSWORD');
line('     Secret : cùng mật khẩu ở mục 2');
line();
rule();
line('SAO LƯU — việc quan trọng nhất:');
line(`  Chép tệp ${OUT} ra ít nhất hai nơi tách rời.`);
line('  Mất tệp này là mất quyền cập nhật app trên App Store.');
rule();
line();
line('Xong rồi thì: tab Actions → Android → Run workflow.');
