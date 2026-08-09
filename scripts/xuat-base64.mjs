/**
 * Ghi chuỗi ANDROID_KEYSTORE_BASE64 ra một tệp văn bản để chép tay cho chắc.
 *
 *   node scripts/xuat-base64.mjs
 *
 * Clipboard rất dễ bị đè bởi thao tác khác giữa chừng, mà dán nhầm thì báo lỗi
 * `base64: invalid input` ở tận trên máy chủ. Có tệp thì mở ra, Ctrl+A, Ctrl+C,
 * chắc chắn đúng.
 *
 * Tệp sinh ra nằm ngoài thư mục dự án và NÊN XOÁ sau khi dán xong.
 */
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';

const JKS = process.env.KEYSTORE_OUT || 'D:/keys-lamlestudio/upload-key.jks';
const TXT = JKS.replace(/[^/\\]+$/, 'ANDROID_KEYSTORE_BASE64.txt');

if (!existsSync(JKS)) {
  console.log(`✗ Không thấy khoá tại ${JKS}`);
  process.exit(1);
}

const bytes = readFileSync(JKS);
const b64 = bytes.toString('base64');

// Giải mã ngược lại và so từng byte — chắc chắn chuỗi này khôi phục đúng tệp gốc.
const back = Buffer.from(b64, 'base64');
if (!back.equals(bytes)) {
  console.log('✗ Chuỗi base64 không khôi phục đúng tệp gốc. Dừng lại.');
  process.exit(1);
}

// Ghi không kèm ký tự xuống dòng ở cuối.
writeFileSync(TXT, b64, { encoding: 'ascii' });

const rule = () => console.log('─'.repeat(72));
rule();
console.log('ĐÃ GHI CHUỖI RA TỆP');
rule();
console.log(`Tệp   : ${TXT}`);
console.log(`Dài   : ${b64.length.toLocaleString('vi-VN')} ký tự  (${statSync(TXT).size} bytes trên đĩa)`);
console.log(`Đầu   : ${b64.slice(0, 24)}`);
console.log(`Cuối  : ${b64.slice(-24)}`);
console.log('Đã kiểm: giải mã ngược lại khớp từng byte với tệp khoá gốc.');
rule();
console.log('CÁCH DÁN CHO ĐÚNG');
rule();
console.log('1. Mở tệp trên bằng Notepad — tệp này là văn bản thuần, mở thoải mái.');
console.log('   (Đừng mở tệp .jks bằng Notepad — nó là tệp nhị phân, lưu nhầm là hỏng khoá.)');
console.log('2. Ctrl+A rồi Ctrl+C. Chọn tất cả, đừng bôi đen bằng chuột kẻo thiếu.');
console.log('3. Mở https://github.com/mrlamsharing1585-TSS/counting-shadow/settings/secrets/actions');
console.log('4. Ở dòng ANDROID_KEYSTORE_BASE64 bấm biểu tượng bút chì để sửa.');
console.log('5. Xoá sạch ô cũ, Ctrl+V, bấm Update secret.');
console.log('6. Xoá tệp .txt này đi sau khi xong.');
rule();
