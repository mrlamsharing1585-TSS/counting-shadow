import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 0,
    // App đóng gói bằng Capacitor nên toàn bộ bundle nằm sẵn trong máy,
    // tách chunk không giúp gì — chỉ nới ngưỡng cảnh báo cho khỏi ồn.
    chunkSizeWarningLimit: 700,
  },
  server: {
    port: 5173,
  },
});
