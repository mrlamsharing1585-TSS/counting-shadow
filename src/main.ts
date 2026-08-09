import { SplashScreen } from '@capacitor/splash-screen';
import { AudioEngine } from './core/audio';
import { InputManager } from './core/input';
import { Game } from './game/game';
import { t } from './core/i18n';
import { langRect, muteRect } from './render/hud';
import { Overlay } from './render/overlay';
import { Scene3D } from './render3d/scene';

const stage = document.getElementById('stage') as HTMLCanvasElement;
const hudCanvas = document.getElementById('hud') as HTMLCanvasElement;

const audio = new AudioEngine();
const game = new Game(audio);
const scene = new Scene3D(stage);
const overlay = new Overlay(hudCanvas);
const input = new InputManager(stage);

input.onFirstInteraction(() => audio.unlock());

/** Đo safe-area phía trên (tai thỏ / thanh trạng thái). */
const probe = document.createElement('div');
probe.style.cssText =
  'position:fixed;top:0;left:0;width:0;height:env(safe-area-inset-top,0px);pointer-events:none;';
document.body.appendChild(probe);

function safeTop(): number {
  return probe.getBoundingClientRect().height;
}

let cssW = 0;
let cssH = 0;

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  // Chặn trường hợp cửa sổ báo kích thước 0 (tab ẩn, webview chưa layout xong).
  cssW = Math.max(1, window.innerWidth);
  cssH = Math.max(1, window.innerHeight);
  stage.style.width = `${cssW}px`;
  stage.style.height = `${cssH}px`;
  scene.resize(cssW, cssH, dpr);
  overlay.resize(cssW, cssH, dpr, safeTop());
}

resize();
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 120));

// Nút tắt tiếng và nút đổi ngôn ngữ bắt sự kiện ở pha capture, nếu không cú
// chạm sẽ bị tính là thao tác chơi (hoặc là lệnh bắt đầu ván mới).
window.addEventListener(
  'pointerdown',
  (e) => {
    const hit = (r: { x: number; y: number; w: number; h: number }) =>
      e.clientX >= r.x && e.clientX <= r.x + r.w && e.clientY >= r.y && e.clientY <= r.y + r.h;

    const m = muteRect(cssW, safeTop());
    if (game.phase !== 'menu' && hit({ x: m.x, y: m.y, w: m.s, h: m.s })) {
      e.stopPropagation();
      e.preventDefault();
      audio.unlock();
      game.toggleMute();
      return;
    }

    if (game.phase === 'menu' && hit(langRect(cssW, cssH))) {
      e.stopPropagation();
      e.preventDefault();
      game.cycleLang();
      applyLangToDom();
    }
  },
  { capture: true },
);

/** Chữ nằm ngoài canvas cũng phải đổi theo ngôn ngữ. */
const rotateHint = document.getElementById('rotate-hint');
function applyLangToDom(): void {
  if (rotateHint) rotateHint.textContent = t().rotateHint;
}
applyLangToDom();

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM') {
    audio.unlock();
    game.toggleMute();
  }
});

// Vòng lặp với bước thời gian cố định để logic không đổi theo tốc độ khung hình.
const STEP = 1 / 120;
let acc = 0;
let last = performance.now();

function frame(now: number): void {
  requestAnimationFrame(frame);

  const delta = Math.min(0.25, (now - last) / 1000);
  last = now;
  acc += delta;

  const actions = input.drain();
  const holding = input.holding;
  let first = true;
  while (acc >= STEP) {
    acc -= STEP;
    game.update(STEP, first ? actions : [], holding);
    first = false;
  }
  if (first && actions.length > 0) game.update(0, actions, holding);

  scene.render(game);
  overlay.draw(game, scene.playerScreen());
  hideSplashOnce();
}

/**
 * Gỡ màn hình chờ sau khung hình đầu tiên đã vẽ xong. Để Capacitor tự gỡ thì
 * người chơi sẽ thấy một khoảng trống trong lúc Three.js còn đang dựng cảnh.
 */
let splashHidden = false;
function hideSplashOnce(): void {
  if (splashHidden) return;
  splashHidden = true;
  void SplashScreen.hide({ fadeOutDuration: 220 }).catch(() => {
    /* chạy trên web thì không có splash — bỏ qua */
  });
}

requestAnimationFrame(frame);

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__game = { game, scene, overlay, input, audio };
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) audio.drone(false);
  last = performance.now();
});
