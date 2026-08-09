# 123 — Bóng Đen Đang Đếm

Game mobile dọc màn hình theo luật "một hai ba". Nhân vật là một **đứa bé** chạy liên tục trên con
đường vô tận, người chơi vuốt để né chướng ngại vật; khi quản trò — nửa cái đầu đỏ khổng lồ ở cuối
đường — sắp ngoái lại thì phải **giữ tay trên màn hình để đứng im**, còn nhúc nhích là dính sét.

Bối cảnh: con đường lát đá sáng nổi lơ lửng giữa vùng trời tím giông, hai bên là vực thẳm với
những bệ đá lửa xanh bay lửng lơ và các cột đá khắc rune đỏ ở phía xa.

Game **song ngữ Anh – Việt**. Mặc định tiếng Anh để phát hành đa thị trường, máy nào đặt tiếng Việt
thì tự chuyển; đổi tay được bằng nút ở màn hình chính và lựa chọn được ghi nhớ. Mọi chữ hiển thị gom
trong [src/core/i18n.ts](src/core/i18n.ts) — thêm ngôn ngữ mới chỉ cần thêm một bảng vào đó.

Đồ hoạ dựng **3D thật bằng WebGL (Three.js)**: hình khối thật, đèn thật, đổ bóng thật — và quản trò
thì **xoay hẳn người** 180° chứ không phải đổi hình. Hình học đều sinh bằng code (hộp, cầu, capsule,
icosahedron) và âm thanh tổng hợp bằng WebAudio, nên vẫn không có một file asset nào.

Bản build 542 KB (141 KB gzip), phần lớn là Three.js. Với app cài đặt qua Capacitor thì bundle nằm
sẵn trong máy nên con số này không ảnh hưởng tới thời gian mở game.

## Chạy thử

```bash
npm install
```

```bash
npm run dev
```

Mở `http://localhost:5173`. Trên máy tính có thể chơi bằng bàn phím (mũi tên / WASD, Space nhảy
2 ô, M tắt tiếng). Muốn thử trên điện thoại thật thì mở IP LAN mà Vite in ra (`--host` đã bật sẵn).

## Đóng gói thành app

Cấu hình Capacitor đã có sẵn trong [capacitor.config.ts](capacitor.config.ts)
(`appId: com.lamle.game123`).

Android — cần Android Studio + JDK 17 (máy đang có JDK 17):

```bash
npm run build && npx cap add android && npx cap sync android && npx cap open android
```

Từ Android Studio bấm Run để cài lên máy, hoặc `Build > Build APK(s)` để lấy file APK.
Những lần sau chỉ cần:

```bash
npm run android
```

iOS (phải chạy trên macOS có Xcode):

```bash
npm run build && npx cap add ios && npx cap sync ios && npx cap open ios
```

Icon và splash: `npm i -D @capacitor/assets`, đặt ảnh nguồn vào `assets/icon.png` +
`assets/splash.png` rồi chạy `npx capacitor-assets generate`.

## Điều khiển

Nhân vật **tự chạy về phía trước**, người chơi chỉ có hai thao tác:

| Thao tác | Kết quả |
| --- | --- |
| Vuốt trái / phải (bất kỳ đâu) | Đổi làn để né đá, cây, hố. Vuốt dài có thể qua 2 làn một lúc |
| **Giữ tay** trên màn hình | Phanh lại, đứng im. Thả ra là chạy tiếp |
| Bàn phím: ← → hoặc A D | Đổi làn |
| Bàn phím: giữ Space / ↓ | Đứng im |

## Luật chơi

- **Quản trò** chạy vòng lặp 3 trạng thái: `counting` → `warning` → `watching`.
  - `counting`: phát 3 tiếng đếm theo 1 trong 4 nhịp ngẫu nhiên (`slow`, `fast`, `staccato`,
    `drag`) để đánh lừa — có nhịp đếm dồn xong im lặng thật lâu, có nhịp kéo tiếng "ba" đến sát
    lúc quay. Không đoán được lúc nào nó quay, phải chờ cảnh báo.
  - Nó không đứng trên đường: chỉ có **nửa cái đầu khổng lồ** nhô lên ở tít cuối con đường vô tận,
    và chỉ cái đầu đó ngoái lại.
  - `warning`: **0,7–1,05 s** (rút dần theo cấp, không bao giờ dưới 0,42 s). Cả khung hình viền đỏ,
    hiện chữ `DỪNG LẠI!` và một vòng đếm ngược ở đáy màn hình. Đây là cửa sổ phản xạ để kịp giữ tay.
  - `watching`: nhìn thẳng. Còn nhúc nhích (chưa phanh hẳn, hoặc đang đổi làn) là dính sét.
- **Widget ở đáy màn hình** gom hết thông tin cần nhìn: vành ngoài đỏ vơi dần = thời gian còn lại
  trước khi nó quay, vành trong đầy và xanh = đã đứng im an toàn.
- **Thời gian** đếm lùi liên tục, về 0 là thua. Bắt đầu 20 giây, checkpoint cách nhau 32 ô mới nạp
  đầy lại (tối đa 26 giây, mỗi checkpoint chỉ nới thêm 0,6 giây). Vì lúc bị nhìn buộc phải đứng im
  nên chần chừ thả tay là mất giờ — đây mới là sức ép chính, không phải chướng ngại vật.
- **Vật phẩm hiếm**: đồng hồ `+6 s` khoảng 100 ô mới gặp một cái, quả cầu hồi sinh khoảng 200 ô mới
  có một quả — cả ván chỉ vài lần. Còn khiên thì khi bị bắt / đâm phải / hết giờ sẽ hồi sinh tại chỗ
  kèm 1,8 s bất tử và dọn sẵn 3 ô đường phía trước.
- **Bản đồ vô tận** sinh ngẫu nhiên theo hàng, 3 làn, đá / cây / hố — chạm phải cái nào cũng thua.
  Bộ sinh bảo đảm ba điều: luôn có một làn an toàn xuyên suốt, ô rẽ ở hàng trước luôn được dọn
  trống khi làn an toàn đổi hướng, và các cụm chướng ngại vật cách nhau tối thiểu 2 hàng để kịp
  vuốt.
## Độ khó: không có trần

Cứ 30 ô lên 1 cấp, **không giới hạn**. Nhưng không phải thứ gì cũng được phép tăng mãi — nếu tốc độ
chạy tăng vô hạn thì có nhìn thấy chướng ngại vật cũng không lách kịp (một lần đổi làn mất 0,14
giây), cái chết thành ra vô lý chứ không phải do chơi dở. Nên các thông số chia làm hai nhóm, khai
báo ngay trong [config.ts](src/game/config.ts):

**Bão hoà** (tiệm cận một mức trần, không bao giờ vượt qua):

| Thông số | Cấp 0 | Cấp 10 | Cấp 25 | Trần |
| --- | --- | --- | --- | --- |
| Tốc độ chạy (ô/giây) | 3,8 | 5,9 | 7,0 | 7,4 |
| Thời gian bị nhìn tối đa (giây) | 2,2 | 3,8 | 4,6 | 4,8 |
| Mật độ chướng ngại vật cộng thêm | 0 | +0,08 | +0,11 | +0,12 |

Thời gian đếm và cửa sổ cảnh báo cũng ngắn dần nhưng có sàn cứng (đếm không dưới 2,0 giây, cảnh báo
không dưới 0,42 giây — dưới nữa là quá thời gian phản xạ của người).

**Không bão hoà** — chỉ đúng một thứ: **tốc độ trôi của đồng hồ**, `1 + 0,05 × cấp` giây mỗi giây,
tăng tuyến tính mãi mãi. Đây là thứ bảo đảm mọi ván đều có hồi kết: tới khoảng cấp 25, quãng đường
giữa hai checkpoint tốn nhiều giờ hơn cả thanh giờ đầy, dù chơi hoàn hảo tới đâu.

Kiểm tra bằng bot mô phỏng người chơi với hai độ trễ — chậm phản xạ lúc phanh, và thả tay trễ lúc nó
quay lưng. 8 ván mỗi mức, mỗi ván tối đa 15 phút mô phỏng:

| Phản xạ / thả tay trễ | Đi được (trung vị) | Xa nhất | Cấp đạt được | Chết vì |
| --- | --- | --- | --- | --- |
| hoàn hảo | 702 ô | 1082 ô | 23 | 8/8 hết giờ |
| 220 ms / 150 ms | 599 ô | 696 ô | 19 | 8/8 hết giờ |
| 260 ms / 300 ms | 411 ô | 445 ô | 13 | 7/8 hết giờ, 1/8 đâm |

Không còn ván nào chạy mãi không chết.

## Cấu trúc mã nguồn

```
src/
  main.ts              vòng lặp game (bước cố định 1/120 s), canvas, DPR, safe-area
  core/
    i18n.ts            toàn bộ chữ hiển thị, tiếng Anh + tiếng Việt
    input.ts           nhận diện giữ tay / vuốt đổi làn / bàn phím
    audio.ts           âm thanh tổng hợp WebAudio (đếm, cảnh báo, drone, sét…)
    rng.ts             RNG có seed
    storage.ts         kỷ lục + cài đặt trong localStorage
  game/
    config.ts          TOÀN BỘ số liệu cân bằng — chỉnh game ở đây
    boss.ts            máy trạng thái quản trò
    player.ts          stickman chạy liên tục: tăng tốc / phanh / đổi làn
    world.ts           sinh bản đồ vô tận + bảo đảm không bí đường
    game.ts            luật chơi, va chạm, thời gian, điểm, chết / hồi sinh
  render3d/
    scene.ts           cảnh WebGL: trời, đèn, đổ bóng, đường lát đá, vật phẩm, lửa xanh
    rigs.ts            bộ xương 3D của đứa bé và quản trò
  render/
    overlay.ts         lớp 2D chồng lên khung hình 3D
    hud.ts             thanh giờ, điểm, viền cảnh báo, widget phanh, menu, game over
    effects.ts         rung màn hình, chớp sáng, tia sét, chữ bay
    palette.ts         bảng màu dùng chung cho cả 2D lẫn 3D
```

Vài điểm kỹ thuật trong [scene.ts](src/render3d/scene.ts):

- Ô đường, đá và cây dùng `InstancedMesh` — cả con đường trong tầm nhìn chỉ tốn 4 lệnh vẽ, mỗi
  khung hình chỉ cập nhật ma trận và màu của từng thể hiện.
- Vật phẩm, bệ lửa và cột đá đều lấy từ pool cố định rồi xoay vòng theo vị trí người chơi, không
  cấp phát gì thêm trong lúc chơi.
- Trời là một mặt cầu `BackSide` với shader gradient tự viết, quầng đỏ chân trời sáng dần lên theo
  trạng thái của quản trò.
- Cả cảnh chạy hết khoảng **60 lệnh vẽ, ~15 nghìn tam giác**. Hai con số này đo được chắc chắn;
  còn thời gian mỗi khung hình thì chưa có số đáng tin — cần đo trên máy thật. Nếu gặp máy yếu, hai
  chỗ cắt được nhiều nhất là `shadowMap.enabled` và tấm sương (`buildMist`) trong
  [scene.ts](src/render3d/scene.ts), vì cả hai đều tốn diện tích tô.

**Đứa bé** ([rigs.ts](src/render3d/rigs.ts)) dựng theo tỉ lệ chibi — riêng cái đầu đã chiếm gần một
nửa chiều cao, đó mới là thứ làm nhân vật trông "nhí" chứ không phải chi tiết. Tóc úp kiểu bát, áo
phông xanh, quần soóc, giày đỏ, ba lô cam sau lưng (camera luôn nhìn từ phía sau nên ba lô là chi
tiết thấy rõ nhất). Màu chọn đủ đậm để vẫn nổi trên nền đá sáng. Tay chân là các `Group` bọc sẵn nét
viền, xoay quanh khớp vai và khớp hông theo nhịp sải chân, giày gắn vào đầu dưới của chân nên đá
theo.

Quản trò chỉ còn đúng **nửa cái đầu khổng lồ** nhô lên ở cuối đường, được tạo hình riêng cho giống
bản vẽ:

- Là một quả cầu **nguyên vẹn**, nửa dưới loang dần rồi tan hẳn vào sương. Phép loang làm bằng
  `onBeforeCompile`: shader nhận thêm cao độ thế giới của từng điểm rồi nhân alpha với
  `smoothstep(bottom, top, y)`. Cắt bằng `clippingPlane` cũng ra "nửa đầu" nhưng để lại một vệt
  phẳng lì nhìn rất giả.
- Chìm vào một **dải sương** thật: tấm phẳng lớn với gradient dọc đặt giữa chỗ con đường mờ đi và
  cái đầu, nên nó có cái để lẫn vào chứ không phải tan vào khoảng không. Đường cũng được kéo dài
  tới 46 hàng để mờ hẳn trước khi hết, không lộ mép cụt.
- Vật liệu tắt sương mù theo khoảng cách (`fog: false`) vì ở cách 44 ô thì sương ăn nhoà hết mặt;
  phần hoà vào khung cảnh do phép loang theo cao độ lo.
- Chỉ cái đầu ngoái lại — không có thân nên cũng không che mất đường phía trước.

- **Cel-shading** bằng `MeshToonMaterial` với bảng chuyển sắc 3 mức — ánh sáng chia thành mảng dứt
  khoát thay vì chuyển mượt kiểu PBR.
- **Nét viền đen** theo kiểu inverted hull: nhân bản khối, phóng to rồi chỉ vẽ mặt trong. Hệ số nở
  ngang và nở dọc trục tách riêng để nét dày đều nhau mà capsule không bị kéo dài hai đầu.
- **Khuôn mặt** vẽ trên canvas 512px (mắt xếch có viền, miệng cau) rồi dán lên một mảnh cầu ôm đúng
  độ cong của đầu — cách này cho nét sắc hơn hẳn so với nặn mắt mũi bằng khối 3D.
- Khối đầu và lớp viền được **gộp sẵn thành 2 mesh** vì không có khớp nào cử động riêng.

Muốn chỉnh nhịp độ hay độ khó thì gần như chỉ cần sửa [src/game/config.ts](src/game/config.ts).

Ở chế độ dev có sẵn móc `window.__game` (`{ game, renderer, input, audio }`) để thử nghiệm nhanh
trong console.

## Ghi chú

Mấy file `ChatGPT Image *.png` ở thư mục gốc là concept art tham khảo (stickman đen áo trắng, quản
trò đỏ, quả cầu linh hồn) — code đang vẽ lại tinh thần đó bằng vector chứ không nạp ảnh.
