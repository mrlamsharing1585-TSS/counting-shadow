/**
 * Thao tác cho lối chơi chạy liên tục:
 *
 *  - Giữ tay bất kỳ đâu trên màn hình -> nhân vật phanh lại, đứng im.
 *  - Vuốt sang trái / phải            -> đổi làn.
 *  - Chạm nhả nhanh ở menu            -> xác nhận.
 *  - Bàn phím (desktop): ←/→ hoặc A/D đổi làn, giữ Space / ↓ để đứng im.
 */
export type GameAction = { kind: 'lane'; dir: -1 | 1 } | { kind: 'confirm' };

export interface InputOptions {
  /** Quãng đường ngang (px) tối thiểu để tính là vuốt đổi làn. */
  swipeThreshold: number;
  /** Vuốt tiếp bao nhiêu px nữa thì tính thêm một lần đổi làn. */
  swipeRepeat: number;
}

const DEFAULTS: InputOptions = {
  swipeThreshold: 30,
  swipeRepeat: 70,
};

interface Touch {
  x0: number;
  y0: number;
  t0: number;
  /** Số lần đã đổi làn trong cú vuốt này. */
  steps: number;
  swiped: boolean;
}

export class InputManager {
  private opts: InputOptions;
  private queue: GameAction[] = [];
  private touches = new Map<number, Touch>();
  private keysHeld = new Set<string>();
  private unlockHandlers: Array<() => void> = [];
  private unlocked = false;

  constructor(
    private readonly el: HTMLElement,
    opts: Partial<InputOptions> = {},
  ) {
    this.opts = { ...DEFAULTS, ...opts };
    el.addEventListener('pointerdown', this.onDown, { passive: false });
    el.addEventListener('pointermove', this.onMove, { passive: false });
    el.addEventListener('pointerup', this.onUp, { passive: false });
    el.addEventListener('pointercancel', this.onCancel, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.releaseAll);
  }

  /** Người chơi đang giữ tay (hoặc giữ phím) để đứng im. */
  get holding(): boolean {
    return this.touches.size > 0 || this.keysHeld.size > 0;
  }

  onFirstInteraction(fn: () => void): void {
    if (this.unlocked) fn();
    else this.unlockHandlers.push(fn);
  }

  drain(): GameAction[] {
    if (this.queue.length === 0) return [];
    const out = this.queue;
    this.queue = [];
    return out;
  }

  dispose(): void {
    this.el.removeEventListener('pointerdown', this.onDown);
    this.el.removeEventListener('pointermove', this.onMove);
    this.el.removeEventListener('pointerup', this.onUp);
    this.el.removeEventListener('pointercancel', this.onCancel);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.releaseAll);
  }

  private markUnlocked(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    for (const fn of this.unlockHandlers) fn();
    this.unlockHandlers = [];
  }

  private push(a: GameAction): void {
    if (this.queue.length < 4) this.queue.push(a);
  }

  private onDown = (e: PointerEvent): void => {
    e.preventDefault();
    this.markUnlocked();
    this.touches.set(e.pointerId, {
      x0: e.clientX,
      y0: e.clientY,
      t0: performance.now(),
      steps: 0,
      swiped: false,
    });
  };

  private onMove = (e: PointerEvent): void => {
    const t = this.touches.get(e.pointerId);
    if (!t) return;
    const dx = e.clientX - t.x0;
    if (Math.abs(dx) < this.opts.swipeThreshold) return;

    // Vuốt dài liên tục có thể nhảy qua nhiều làn một lúc.
    const want = 1 + Math.floor((Math.abs(dx) - this.opts.swipeThreshold) / this.opts.swipeRepeat);
    const dir = dx > 0 ? 1 : -1;
    while (t.steps < want) {
      t.steps++;
      t.swiped = true;
      this.push({ kind: 'lane', dir });
    }
  };

  private onUp = (e: PointerEvent): void => {
    const t = this.touches.get(e.pointerId);
    this.touches.delete(e.pointerId);
    if (!t || t.swiped) return;
    // Chạm nhả nhanh mà không vuốt = xác nhận (dùng ở menu / màn thua).
    if (performance.now() - t.t0 < 400) this.push({ kind: 'confirm' });
  };

  private onCancel = (e: PointerEvent): void => {
    this.touches.delete(e.pointerId);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    this.markUnlocked();
    if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault();
      this.keysHeld.add(e.code);
      return;
    }
    if (e.repeat) return;
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.push({ kind: 'lane', dir: -1 });
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.push({ kind: 'lane', dir: 1 });
        break;
      case 'Enter':
        this.push({ kind: 'confirm' });
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysHeld.delete(e.code);
  };

  private releaseAll = (): void => {
    this.touches.clear();
    this.keysHeld.clear();
  };
}
