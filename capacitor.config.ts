import type { CapacitorConfig } from '@capacitor/cli';

/**
 * `appId` là định danh vĩnh viễn trên cả hai cửa hàng — đã phát hành thì không
 * đổi được nữa, muốn đổi phải nộp một app hoàn toàn mới.
 */
const config: CapacitorConfig = {
  appId: 'com.lamle.game123',
  appName: '123',
  webDir: 'dist',

  android: {
    backgroundColor: '#1d1533',
    // Từ Android 15 hệ điều hành ép chế độ tràn viền. 'auto' để Capacitor tự
    // chừa lề dưới thanh trạng thái và trên thanh điều hướng, nhờ vậy HUD không
    // bị tai thỏ che — đúng đắn ở mọi máy, đổi lại mất một dải nhỏ trên đỉnh.
    adjustMarginsForEdgeToEdge: 'auto',
  },

  ios: {
    backgroundColor: '#1d1533',
    contentInset: 'never',
  },

  plugins: {
    StatusBar: {
      overlaysWebView: false,
      // DARK = chữ sáng, hợp nền trời tím của game.
      style: 'DARK',
      backgroundColor: '#1d1533',
    },
    SplashScreen: {
      // Tự tay gọi hide() sau khung hình 3D đầu tiên, nếu không người chơi sẽ
      // thấy một khoảng trắng trong lúc Three.js dựng cảnh.
      launchAutoHide: false,
      backgroundColor: '#150f27',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
