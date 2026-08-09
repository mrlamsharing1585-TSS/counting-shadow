# Nội dung trang cửa hàng

Chép thẳng vào Play Console / App Store Connect. Số ký tự đã kiểm tra theo giới hạn của từng nơi.

**Ngôn ngữ mặc định của app là tiếng Anh**, tự chuyển sang tiếng Việt nếu máy đặt tiếng Việt. Cả hai
cửa hàng đều cho khai nhiều bản dịch cho một app, mỗi bản có ảnh chụp riêng — dùng `store/en/` cho
bản tiếng Anh (ngôn ngữ mặc định) và `store/vi/` cho bản tiếng Việt.

---

## Tiếng Việt

**Tên ứng dụng** (≤30 ký tự)

```
123 — Bóng Đen Đang Đếm
```

**Mô tả ngắn** (≤80 ký tự — Google Play)

```
Nó đang đếm. Nó sắp quay lại. Giữ tay để đứng im, buông tay là chạy.
```

**Phụ đề** (≤30 ký tự — App Store)

```
Đứng im khi nó quay lại
```

**Mô tả dài**

```
Một hai ba. Nó quay lưng lại và bắt đầu đếm.

Đứa bé của bạn tự chạy trên con đường đá vô tận. Bạn vuốt trái phải để né đá, né cây, né những
cái hố hụt chân. Nhưng ở cuối con đường, nửa cái đầu đỏ khổng lồ đang chờ ngoái lại.

Khi màn hình hiện DỪNG LẠI, bạn có chưa tới một giây để giữ tay lại. Còn nhúc nhích lúc nó nhìn
thẳng vào bạn là xong.

• Hai thao tác, hết. Vuốt để đổi làn, giữ tay để đứng im.
• Nhịp đếm không bao giờ giống nhau. Có lúc nó đếm dồn rồi im bặt thật lâu. Có lúc nó kéo tiếng
  "ba" đến sát lúc quay. Đoán mò là chết.
• Đường vô tận, độ khó không có trần. Càng đi xa chạy càng nhanh, nó nhìn càng lâu, đồng hồ trôi
  càng gấp. Rồi sẽ tới lúc không ai đi tiếp được nữa — vấn đề chỉ là bạn tới đó ở ô thứ mấy.
• Đồng hồ đếm ngược không bao giờ dừng. Chần chừ thả tay nửa giây mỗi nhịp là hết giờ trước khi
  tới checkpoint.
• Chơi ngoại tuyến hoàn toàn. Không tài khoản, không quảng cáo, không thu thập dữ liệu.

Kỷ lục của bạn là bao nhiêu ô?
```

**Từ khoá** (App Store, ≤100 ký tự, ngăn bằng dấu phẩy, không dấu cách)

```
mộthaiba,123,chạy,né,phảnxạ,sinhtồn,offline,vôtận,runner,redlight,greenlight,đứngim
```

---

## English

**App name** (≤30)

```
123 — Red Light Runner
```

**Short description** (≤80)

```
It's counting. It's about to turn. Hold to freeze, let go to run.
```

**Subtitle** (≤30 — App Store)

```
Freeze when it turns around
```

**Full description**

```
One, two, three. It turns away and starts counting.

Your kid runs by themselves down an endless stone road. You swipe left and right to dodge rocks,
trees and the gaps you can fall through. But at the far end of the road, half a colossal red head
is waiting to turn around.

When STOP flashes on screen you have less than a second to hold your finger down. Move while it's
staring at you and it's over.

• Two controls, that's all. Swipe to change lane, hold to freeze.
• The counting rhythm is never the same twice. Sometimes it rattles off all three beats then goes
  silent for ages. Sometimes it drags the last one right up to the turn. Guessing gets you killed.
• Endless road, no difficulty cap. The further you go the faster you run, the longer it stares,
  the faster the clock drains. Eventually nobody can go further — the only question is how many
  tiles you got.
• The countdown never stops. Hesitate half a second every cycle and you run out before the next
  checkpoint.
• Fully offline. No account, no ads, no data collected.

How far can you get?
```

**Keywords** (App Store, ≤100)

```
redlight,greenlight,runner,endless,reflex,survival,offline,dodge,arcade,freeze,squid,onetwothree
```

---

## Phân loại

- **Thể loại:** Trò chơi → Hành động (Google Play) / Games → Action (App Store)
- **Thẻ phụ:** Arcade, Casual
- **Độ tuổi:** mọi lứa tuổi. Không máu me, không cờ bạc, không mua trong ứng dụng, không tương tác
  người chơi. Nhân vật bị sét đánh khi thua — mô tả rất cách điệu, không phải bạo lực tả thực; khi
  điền bảng hỏi IARC cứ khai trung thực là "bạo lực hoạt hoạ mức tối thiểu".
- **An toàn dữ liệu / App Privacy:** không thu thập dữ liệu nào.

## Ảnh

| Dùng ở đâu | Tệp |
| --- | --- |
| Icon Play 512×512 | `store/play-icon-512.png` |
| Ảnh bìa Play 1024×500 | `store/play-feature-1024x500.png` |
| Ảnh chụp Android 1080×1920 | `store/en/android/`, `store/vi/android/` |
| Ảnh chụp iPhone 6,7" 1290×2796 | `store/en/ios-6.7/`, `store/vi/ios-6.7/` |
| Icon App Store 1024×1024 | `assets/icon-only.png` |

Tệp đã đánh số theo đúng thứ tự nên tải lên: **1-run → 2-stop → 3-hold → 4-gameover → 5-menu**. Ảnh
đầu tiên quyết định người ta có bấm vào hay không, nên để cảnh đang chơi chứ đừng để menu.
