import { CFG, speedFor } from './config';
import type { World } from './world';

export type LaneResult = 'ok' | 'blocked' | 'busy';

const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (1 - t) * (1 - t) * 2);

/**
 * Stickman chạy liên tục về phía trước.
 *
 * Người chơi chỉ có 2 thao tác:
 *   - giữ tay trên màn hình  -> phanh lại, đứng im
 *   - vuốt sang trái/phải    -> đổi làn
 *
 * `speed` là thứ quyết định sống chết: quản trò quay mặt mà speed còn > stillSpeed
 * (hoặc đang đổi làn) thì dính đòn.
 */
export class Player {
  /** Vị trí liên tục theo chiều tiến (đơn vị ô). */
  z = 0;
  lane = 1;
  speed = 0;
  /** Người chơi đang giữ tay để dừng. */
  holding = false;

  private fromLane = 1;
  private laneT = 0;
  private changing = false;
  /** Pha sải chân, dùng cho hoạt hình chạy. */
  stride = 0;

  constructor(private readonly world: World) {}

  reset(): void {
    this.z = 0;
    this.lane = this.fromLane = 1;
    this.speed = 0;
    this.holding = false;
    this.changing = false;
    this.laneT = 0;
    this.stride = 0;
  }

  /** Làn hiển thị (nội suy khi đang đổi làn). */
  get renderLane(): number {
    if (!this.changing) return this.lane;
    return this.fromLane + (this.lane - this.fromLane) * easeInOut(this.laneT / CFG.player.laneTime);
  }

  get changingLane(): boolean {
    return this.changing;
  }

  /** Đang cử động theo nghĩa của quản trò. */
  get moving(): boolean {
    return this.speed > CFG.player.stillSpeed || this.changing;
  }

  /** 0 = đứng im, 1 = chạy hết tốc lực. Dùng để vẽ và để đo mức độ "nhúc nhích". */
  motion(level: number): number {
    return Math.min(1, this.speed / speedFor(level));
  }

  /** Ô hiện tại người chơi đang chiếm. */
  get cellZ(): number {
    return Math.round(this.z);
  }

  laneChange(dir: -1 | 1): LaneResult {
    if (this.changing) return 'busy';
    const target = this.lane + dir;
    if (target < 0 || target >= CFG.laneCount) return 'blocked';
    // Chặn ngay nếu ô bên cạnh không đứng được — tránh chết oan vì vuốt nhầm.
    if (!this.world.isFree(this.cellZ, target)) return 'blocked';

    this.fromLane = this.lane;
    this.lane = target;
    this.laneT = 0;
    this.changing = true;
    return 'ok';
  }

  update(dt: number, level: number): void {
    const target = this.holding ? 0 : speedFor(level);
    const ramp = this.holding ? CFG.player.brakeTime : CFG.player.accelTime;
    const step = (speedFor(level) / ramp) * dt;
    this.speed += Math.max(-step, Math.min(step, target - this.speed));
    if (this.speed < 0.001) this.speed = 0;

    this.z += this.speed * dt;
    this.stride += this.speed * dt * 2.4;

    if (this.changing) {
      this.laneT += dt;
      if (this.laneT >= CFG.player.laneTime) {
        this.changing = false;
        this.fromLane = this.lane;
      }
    }
  }
}
