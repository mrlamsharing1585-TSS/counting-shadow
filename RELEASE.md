# Phát hành lên Google Play và App Store

## Trạng thái

| Việc | Tình trạng |
| --- | --- |
| Nâng lên Capacitor 8, targetSdk 36 | ✅ xong |
| Dự án Android (`android/`) | ✅ đã tạo và cấu hình |
| Khoá màn hình dọc, thanh trạng thái, màn hình chờ | ✅ xong |
| Icon + splash mọi kích thước | ✅ sinh tự động, 74 tệp |
| Icon 512 và ảnh bìa 1024×500 cho Play | ✅ `store/` |
| Ảnh chụp màn hình cho cả hai cửa hàng | ✅ `store/android/`, `store/ios-6.7/` |
| Chính sách quyền riêng tư | ✅ [PRIVACY.md](PRIVACY.md) |
| Cấu hình ký AAB | ✅ đã nối dây, **cần bạn tạo keystore** |
| Quy trình build tự động trên máy chủ | ✅ `.github/workflows/` — Android, iOS, Pages |
| Trang chính sách quyền riêng tư | ✅ `npm run site`, tự đăng qua GitHub Pages |
| Build ra file AAB **trên máy này** | ⛔ chặn bởi lỗi môi trường, xem bên dưới — **dùng máy chủ thì không dính** |
| Dự án iOS | ⛔ bắt buộc macOS — **quy trình `ios.yml` chạy trên máy chủ macOS thay bạn** |
| Nộp lên cửa hàng | ⛔ cần tài khoản nhà phát triển của bạn |

---

## Cách nhanh nhất: build trên máy chủ GitHub

Ba quy trình trong `.github/workflows/` giải quyết luôn cả hai chỗ đang bị chặn — máy không chạy
được Gradle, và không có máy Mac.

| Tệp | Chạy trên | Làm gì |
| --- | --- | --- |
| `android.yml` | Ubuntu | Build AAB + APK đã ký, tuỳ chọn nộp thẳng lên Play |
| `ios.yml` | macOS | Dựng dự án iOS, archive, xuất IPA, tuỳ chọn nộp lên TestFlight |
| `pages.yml` | Ubuntu | Đăng trang quyền riêng tư + bản chơi thử web lên GitHub Pages |

Repo công khai thì cả ba đều **miễn phí**. Repo riêng tư thì phút chạy trên macOS tính gấp 10 lần,
một lần build iOS khoảng 8–12 phút.

### Các bước

1. Tạo repo trên GitHub rồi đẩy dự án lên (dự án đã có sẵn commit đầu tiên).
2. Vào **Settings → Pages → Source: GitHub Actions**. Đẩy code lên là có ngay URL dạng
   `https://<tên-bạn>.github.io/<tên-repo>/privacy.html` — đây chính là URL chính sách quyền riêng
   tư mà hai cửa hàng bắt buộc phải có, và `…/play/` là bản chơi thử để gửi cho người khác.
3. Nạp secrets ở **Settings → Secrets and variables → Actions** (xem bảng dưới).
4. Vào tab **Actions**, chọn quy trình, bấm **Run workflow**. Tệp build tải về ở mục Artifacts.

### Secrets cho Android

| Tên | Lấy ở đâu |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 upload-key.jks` (Windows: `certutil -encode upload-key.jks tmp.txt` rồi bỏ dòng đầu/cuối) |
| `ANDROID_STORE_PASSWORD` | mật khẩu keystore |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | mật khẩu khoá |
| `PLAY_SERVICE_ACCOUNT_JSON` | Play Console → Users and permissions → API access → tạo tài khoản dịch vụ, tải JSON. Chỉ cần khi muốn nộp tự động |

Chưa nạp keystore thì quy trình vẫn chạy, chỉ ra bản **chưa ký** để cài thử.

### Secrets cho iOS

| Tên | Lấy ở đâu |
| --- | --- |
| `IOS_CERTIFICATE_P12_BASE64` | Chứng chỉ Apple Distribution xuất ra `.p12` rồi base64 |
| `IOS_CERTIFICATE_PASSWORD` | mật khẩu đặt lúc xuất `.p12` |
| `IOS_PROVISIONING_PROFILE_BASE64` | Hồ sơ App Store cho `com.lamlestudio.countingshadow`, tải từ developer.apple.com rồi base64 |
| `IOS_PROVISIONING_PROFILE_NAME` | tên hồ sơ, đúng từng ký tự |
| `IOS_TEAM_ID` | mã 10 ký tự ở góc trên phải trang Apple Developer |
| `APPSTORE_ISSUER_ID`, `APPSTORE_KEY_ID`, `APPSTORE_PRIVATE_KEY` | App Store Connect → Users and Access → Integrations → App Store Connect API. Chỉ cần khi muốn nộp tự động |

Chứng chỉ và hồ sơ cấp phép **vẫn phải tạo trên trang web của Apple** (làm được từ Windows), nhưng
xuất tệp `.p12` thì cần Keychain trên máy Mac. Chưa có Mac lần nào thì cách vòng là dùng
[fastlane match](https://docs.fastlane.tools/actions/match/) chạy ngay trong chính quy trình macOS
này để nó tự tạo và quản lý chứng chỉ.

---

## Sự cố đã biết: Gradle không chạy được trên máy này

Mọi lệnh build đều dừng ở:

```
java.io.IOException: Unable to establish loopback connection
Caused by: java.net.SocketException: Invalid argument: connect
    at sun.nio.ch.UnixDomainSockets.connect0(Native Method)
```

Đây **không phải lỗi của dự án**. Gradle fork một tiến trình con rồi nói chuyện với nó qua
`java.nio.channels.Pipe`, mà trên máy này lời gọi đó hỏng ở tầng hệ điều hành. Kiểm chứng bằng một
chương trình Java 10 dòng, không dính gì tới Gradle:

```bash
node -e "require('fs').writeFileSync('PipeTest.java','import java.nio.channels.Pipe;public class PipeTest{public static void main(String[] a)throws Exception{Pipe.open();System.out.println(\"OK\");}}')" && javac PipeTest.java && java PipeTest
```

Kết quả trên máy này: JDK 17 của Microsoft **hỏng**, JDK 21 Temurin **chạy được** khi gọi trực tiếp,
nhưng tiến trình con do Gradle fork ra thì vẫn hỏng.

Thử theo thứ tự này:

1. **Mở PowerShell với quyền Administrator**, chạy `netsh winsock reset` rồi **khởi động lại máy**.
   Đây là cách sửa chuẩn cho lỗi `Invalid argument` trên AF_UNIX ở Windows, do bộ danh mục Winsock
   bị hỏng.
2. Nếu máy có phần mềm diệt virus của bên thứ ba, tắt tạm rồi build lại — một số sản phẩm chặn socket
   AF_UNIX.
3. Cài **Android Studio** rồi mở thư mục `android/` và bấm *Build → Generate Signed App Bundle*.
   Android Studio dùng JetBrains Runtime riêng, có thể vượt qua được.

JDK 21 đã được cài sẵn ở `C:\Program Files\Eclipse Adoptium\jdk-21.0.12.8-hotspot` và
`android/gradle.properties` đã trỏ `org.gradle.java.home` vào đó. Sửa dòng đó nếu build ở máy khác.

---

## Android — các bước còn lại

### 1. Tạo khoá ký (chỉ làm một lần, giữ suốt đời app)

```bash
keytool -genkeypair -v -keystore D:\123-upload-key.jks -keyalg RSA -keysize 4096 -validity 10000 -alias upload
```

> **Cảnh báo:** mất tệp `.jks` hoặc quên mật khẩu là **mất quyền cập nhật app**. Sao lưu ra ít nhất
> hai nơi (ổ ngoài + kho mật khẩu). Tuyệt đối không commit vào git — `.gitignore` đã chặn sẵn.
> Nếu bật Play App Signing (nên bật) thì Google giữ khoá ký thật, khoá này chỉ là khoá tải lên và
> còn có thể xin cấp lại; với App Store thì Apple quản lý chứng chỉ, không có rủi ro này.

Tạo `android/keystore.properties` (đã gitignore):

```properties
storeFile=../123-upload-key.jks
storePassword=<mật khẩu bạn vừa đặt>
keyAlias=upload
keyPassword=<mật khẩu bạn vừa đặt>
```

`android/app/build.gradle` tự đọc tệp này. Không có tệp thì vẫn build được, chỉ ra bản chưa ký.

### 2. Build

```bash
npm run android:bundle
```

File nằm ở `android/app/build/outputs/bundle/release/app-release.aab`.

### 3. Play Console

Tài khoản nhà phát triển: **25 USD, trả một lần**. Từ 2023 Google yêu cầu tài khoản cá nhân mới phải
có **12 người thử nghiệm khép kín chạy liên tục 14 ngày** trước khi được mở bán công khai — hãy tính
thời gian này vào kế hoạch.

Cần chuẩn bị:

| Mục | Lấy ở đâu |
| --- | --- |
| Icon 512×512 | `store/play-icon-512.png` |
| Ảnh bìa 1024×500 | `store/play-feature-1024x500.png` |
| Ảnh chụp điện thoại (tối thiểu 2, tối đa 8) | `store/android/*.png` — 1080×1920 |
| Mô tả ngắn / dài | [store/listing.md](store/listing.md) |
| URL chính sách quyền riêng tư | đăng [PRIVACY.md](PRIVACY.md) lên một trang web công khai |

Khai báo an toàn dữ liệu (Data safety): chọn **không thu thập, không chia sẻ dữ liệu nào**. Đúng với
phiên bản hiện tại — nếu sau này nhúng quảng cáo thì **phải khai lại**, vì SDK quảng cáo đọc mã nhận
dạng quảng cáo.

Phân loại nội dung: điền bảng hỏi IARC. Game không có bạo lực tả thực, không cờ bạc, không chat →
thường ra mức phù hợp mọi lứa tuổi.

---

## iOS — bắt buộc máy macOS

Không có cách nào build được ứng dụng iOS trên Windows. Trên máy Mac có Xcode:

```bash
npm install
npx cap add ios
npx capacitor-assets generate --ios
npm run build && npx cap sync ios
npx cap open ios
```

Trong Xcode: chọn Team, đặt Bundle Identifier `com.lamlestudio.countingshadow`, chọn *Any iOS Device*, rồi
*Product → Archive → Distribute App*.

Cần chuẩn bị thêm:

- Tài khoản Apple Developer: **99 USD mỗi năm**.
- Ảnh chụp 6,7 inch (1290×2796): có sẵn ở `store/ios-6.7/`.
- Icon 1024×1024: `assets/icon-only.png`.
- URL chính sách quyền riêng tư và bảng kê "App Privacy" — khai **Data Not Collected**.
- Xét duyệt của Apple thường 1–3 ngày, có thể bị trả về; Google thường nhanh hơn.

Nếu không có máy Mac: thuê Mac đám mây (MacinCloud, MacStadium) khoảng 20–30 USD/tháng, hoặc dùng
GitHub Actions với `runs-on: macos-latest` để build và nộp tự động.

---

## Đặt tên trên cửa hàng

Tên hiển thị trên máy đang là `123`. Nhưng để tên cửa hàng đúng bằng "123" thì gần như **không ai tìm
ra được** — chuỗi này quá phổ biến. Nên đặt tên trên cửa hàng dài hơn, ví dụ:

> **123 — Bóng Đen Đang Đếm**

Google Play cho tối đa 30 ký tự, App Store 30 ký tự cho tên và 30 cho phụ đề. Tên hiển thị dưới icon
trên máy vẫn giữ `123` cho gọn (`android/app/src/main/res/values/strings.xml`).

`appId` là `com.lamlestudio.countingshadow` — **phát hành rồi thì vĩnh viễn không đổi được**. Muốn đổi phải nộp
một ứng dụng hoàn toàn mới, mất sạch lượt tải và đánh giá. Đổi bây giờ thì còn kịp.

---

## Lần cập nhật sau

Mỗi lần nộp lên phải tăng số hiệu bản dựng:

- Android: tăng `versionCode` trong `android/app/build.gradle` (bắt buộc tăng nghiêm ngặt), và sửa
  `versionName` cho người dùng đọc.
- iOS: tăng `CFBundleVersion`, sửa `CFBundleShortVersionString`.

Rồi `npm run android:bundle` hoặc archive lại trong Xcode.
