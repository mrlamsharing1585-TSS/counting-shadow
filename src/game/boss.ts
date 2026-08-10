import { AudioEngine } from '../core/audio';
import { Rng } from '../core/rng';
import { CFG, countMaxFor, levelFor, warnRangeFor, watchMaxFor } from './config';
import type { BossState } from './types';

/** Nhịp đếm — dùng để đánh lừa người chơi. */
type Tempo = 'slow' | 'fast' | 'staccato' | 'drag';

const TEMPOS: readonly Tempo[] = ['slow', 'fast', 'staccato', 'drag'];

/**
 * Máy trạng thái của quản trò:
 *   counting -> warning -> watching -> counting ...
 *
 * counting: phát 3 tiếng đếm với nhịp ngẫu nhiên.
 * warning:  0.2-0.5s cảnh báo (viền đỏ chớp + tiếng khựng).
 * watching: nhìn thẳng — người chơi cử động là dính đòn.
 */
export class Boss {
  state: BossState = 'counting';
  /** 0..1 — 0 là quay lưng hoàn toàn, 1 là nhìn thẳng vào mặt. */
  turn = 0;
  /** Con số đang đếm (0 = chưa đếm, 1..3). */
  countIndex = 0;
  /** Còn bao lâu nữa hết trạng thái hiện tại. */
  private timer = 0;
  private phaseLen = 1;
  /** Mốc thời gian (tính ngược từ đầu phase) để phát tiếng đếm. */
  private ticks: number[] = [];
  private tickAt = 0;

  constructor(
    private readonly rng: Rng,
    private readonly audio: AudioEngine,
  ) {
    this.enterCounting(0);
  }

  /** Tiến độ phase hiện tại, 0 -> 1. */
  get progress(): number {
    return 1 - this.timer / this.phaseLen;
  }

  get isWatching(): boolean {
    return this.state === 'watching';
  }

  /**
   * Đã quay hẳn mặt lại chưa. Chỉ lúc này nó mới bắt được người chơi — trạng
   * thái `watching` bắt đầu ngay khi đầu mới chớm xoay, chết ở thời điểm đó thì
   * người chơi nhìn vào màn hình vẫn thấy nó đang quay lưng.
   */
  get isStaring(): boolean {
    return this.state === 'watching' && this.turn >= CFG.boss.lethalTurn;
  }

  reset(): void {
    this.turn = 0;
    this.enterCounting(0);
  }

  update(dt: number, distance: number): void {
    const level = levelFor(distance);

    // Hoạt hình quay đầu chạy độc lập với logic phase.
    const target = this.state === 'watching' ? 1 : this.state === 'warning' ? 0.35 : 0;
    const speed = dt / CFG.boss.turnTime;
    this.turn += Math.max(-speed, Math.min(speed, target - this.turn));

    if (this.state === 'counting' && this.tickAt < this.ticks.length) {
      const elapsed = this.phaseLen - this.timer;
      if (elapsed >= this.ticks[this.tickAt]) {
        this.countIndex = this.tickAt + 1;
        this.audio.count(this.tickAt);
        this.tickAt++;
      }
    }

    this.timer -= dt;
    if (this.timer > 0) return;

    switch (this.state) {
      case 'counting': {
        this.state = 'warning';
        // Cảnh báo là cửa sổ phản xạ: ngắn dần theo cấp nhưng luôn đủ để kịp phanh.
        const { lo, hi } = warnRangeFor(level);
        this.phaseLen = this.timer = this.rng.range(lo, hi);
        this.audio.warning();
        break;
      }
      case 'warning': {
        this.state = 'watching';
        this.phaseLen = this.timer = this.rng.range(CFG.boss.watchMin, watchMaxFor(level));
        this.audio.drone(true);
        break;
      }
      case 'watching':
        this.audio.drone(false);
        this.enterCounting(level);
        break;
    }
  }

  /** Ngắt trạng thái nhìn (dùng khi hồi sinh) và bắt đầu đếm lại. */
  forceCount(distance: number): void {
    this.audio.drone(false);
    this.enterCounting(levelFor(distance));
  }

  private enterCounting(level: number): void {
    this.state = 'counting';
    this.countIndex = 0;
    this.tickAt = 0;

    const len = this.rng.range(CFG.boss.countMin, countMaxFor(level));
    this.phaseLen = this.timer = len;
    this.ticks = this.buildTicks(this.rng.pick(TEMPOS), len);
  }

  /**
   * Chia phase đếm thành 3 mốc phát tiếng.
   * Mốc cuối luôn cách hết phase một khoảng để cú "quay mặt" bất ngờ hơn.
   */
  private buildTicks(tempo: Tempo, len: number): number[] {
    switch (tempo) {
      case 'fast':
        // Đếm dồn dập ngay từ đầu rồi im lặng chờ -> dễ khiến người chơi đi bừa.
        return [0.05, 0.05 + len * 0.12, 0.05 + len * 0.24];
      case 'slow':
        return [len * 0.08, len * 0.4, len * 0.72];
      case 'staccato':
        // Hai tiếng sát nhau, tiếng thứ ba trễ hẳn.
        return [len * 0.1, len * 0.2, len * 0.8];
      case 'drag':
        // Hai tiếng đầu rất chậm, tiếng "ba" đến ngay sát lúc quay.
        return [len * 0.05, len * 0.55, len * 0.92];
    }
  }
}
