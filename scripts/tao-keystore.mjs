/**
 * Tạo khoá ký Android rồi in ra đúng 4 giá trị cần dán vào GitHub Secrets.
 *
 *   npm run keystore
 *
 * Tệp .jks được ghi ra NGOÀI thư mục dự án. Dự án là repo git công khai, để khoá
 * ký lọt vào đó là hỏng vĩnh viễn.
 *
 * Script chỉ gọi `keytool` và chuyển tiếp bàn phím sang nó — mật khẩu bạn gõ đi
 * thẳng vào keytool, không đi qua đây, không được ghi lại ở đâu cả.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const OUT = 'D:/keys-lamlestudio/upload-key.jks';
const ALIAS = 'upload';

/**
 * Tìm đường dẫn đầy đủ tới keytool. Gọi thẳng tệp thực thi thay vì mượn shell —
 * mượn shell thì tham số bị nối chuỗi chứ không được thoát, Node cảnh báo đúng.
 */
function findExe(name, extraDirs = []) {
  const exe = process.platform === 'win32' ? `${name}.exe` : name;
  const dirs = [...extraDirs, ...(process.env.PATH ?? '').split(process.platform === 'win32' ? ';' : ':')];
  for (const d of dirs) {
    if (!d) continue;
    const p = join(d, exe);
    if (existsSync(p)) return p;
  }
  return null;
}

const KEYTOOL = findExe('keytool', process.env.JAVA_HOME ? [join(process.env.JAVA_HOME, 'bin')] : []);
if (!KEYTOOL) {
  console.log('✗ Không tìm thấy keytool. Nó đi kèm JDK — đặt JAVA_HOME rồi chạy lại.');
  process.exit(1);
}

const line = (s = '') => console.log(s);
const rule = () => line('─'.repeat(72));

if (existsSync(OUT)) {
  line(`Đã có sẵn khoá tại ${OUT}`);
  line('Không tạo đè — mất khoá cũ là mất quyền cập nhật app.');
  line('Muốn tạo lại thì đổi tên tệp cũ đi trước.');
} else {
  mkdirSync(dirname(OUT), { recursive: true });

  rule();
  line('TẠO KHOÁ KÝ');
  rule();
  line('keytool sẽ hỏi bạn 3 câu:');
  line('  1. Enter keystore password        → đặt mật khẩu, GHI LẠI NGAY');
  line('  2. Re-enter new password          → gõ lại y hệt');
  line('  3. Enter key password for <upload> → bấm ENTER để dùng chung');
  line();
  line('Gõ mật khẩu sẽ không hiện ký tự nào trên màn hình. Đó là bình thường.');
  rule();
  line();

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
    { stdio: 'inherit' },
  );

  if (res.status !== 0 || !existsSync(OUT)) {
    line();
    line('✗ Không tạo được khoá. Xem thông báo lỗi bên trên.');
    line('  Thường gặp: gõ hai lần mật khẩu không khớp, hoặc mật khẩu ngắn hơn 6 ký tự.');
    process.exit(1);
  }
}

// --- chuyển sang base64 và đưa vào clipboard ---
const b64 = readFileSync(OUT).toString('base64');
let copied = false;
const CLIP = findExe('clip', [join(process.env.SystemRoot ?? 'C:/Windows', 'System32')]);
if (CLIP) copied = spawnSync(CLIP, { input: b64 }).status === 0;

line();
rule();
line('XONG. Giờ nạp 4 secret này vào GitHub:');
rule();
line();
line('Mở đúng trang này (đăng nhập tài khoản mrlamsharing1585-TSS):');
line('  https://github.com/mrlamsharing1585-TSS/couting-shadow/settings/secrets/actions/new');
line();
line('Tạo lần lượt 4 secret, mỗi lần điền Name rồi điền Secret rồi bấm Add secret:');
line();
line(`  1. Name: ANDROID_KEYSTORE_BASE64`);
line(
  copied
    ? '     Secret: đã COPY VÀO CLIPBOARD sẵn rồi — bấm Ctrl+V vào ô Secret'
    : `     Secret: chạy lệnh này rồi dán:\n       [Convert]::ToBase64String([IO.File]::ReadAllBytes("${OUT}")) | Set-Clipboard`,
);
line(`     (chuỗi dài ${b64.length.toLocaleString('vi-VN')} ký tự — dán cả cục, đừng cắt bớt)`);
line();
line(`  2. Name: ANDROID_STORE_PASSWORD`);
line('     Secret: mật khẩu bạn vừa gõ');
line();
line(`  3. Name: ANDROID_KEY_ALIAS`);
line(`     Secret: ${ALIAS}`);
line();
line(`  4. Name: ANDROID_KEY_PASSWORD`);
line('     Secret: cùng mật khẩu ở mục 2 (vì bạn đã bấm ENTER ở câu hỏi thứ 3)');
line();
rule();
line('SAO LƯU NGAY, đây là việc quan trọng nhất:');
line(`  Chép tệp ${OUT}`);
line('  ra ít nhất hai nơi tách rời — ổ cứng ngoài và một chỗ lưu trữ riêng tư.');
line('  Mật khẩu cất trong trình quản lý mật khẩu, đừng để chung thư mục với tệp khoá.');
rule();
line();
line('Sau đó: tab Actions → Android → Run workflow.');
