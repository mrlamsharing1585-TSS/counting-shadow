import { AudioEngine } from '../core/audio';
import type { GameAction } from '../core/input';
import { Rng } from '../core/rng';
import { nextLang, setLang, t } from '../core/i18n';
import { loadSave, resolveLang, writeSave, type SaveData } from '../core/storage';
import { Effects } from '../render/effects';
import { Boss } from './boss';
import { CFG, drainFor, levelFor } from './config';
import { Player } from './player';
import type { DeathCause, ItemType, Phase } from './types';
import { World } from './world';

/** Thời gian diễn hoạt cảnh chết trước khi hiện màn hình Game Over. */
const DEATH_ANIM = 1.4;

export class Game {
  readonly rng = new Rng();
  readonly world = new World(this.rng);
  readonly player = new Player(this.world);
  readonly effects = new Effects();
  readonly boss: Boss;

  phase: Phase = 'menu';
  time = CFG.time.start;
  maxTime = CFG.time.max;
  score = 0;
  distance = 0;
  shields = CFG.player.startShields;
  grace = 0;
  deathCause: DeathCause | null = null;
  deathT = 0;
  fallT = 0;
  save: SaveData;
  banner = '';
  bannerT = 0;
  readonly popups: Array<{ text: string; color: string }> = [];

  private elapsed = 0;
  /** Ô cuối cùng đã xét va chạm. */
  private lastCell = 0;

  constructor(private readonly audio: AudioEngine) {
    this.boss = new Boss(this.rng, audio);
    this.save = loadSave();
    this.audio.setMuted(this.save.muted);
    setLang(resolveLang(this.save));
  }

  /** Đổi sang ngôn ngữ kế tiếp và ghi nhớ lựa chọn. */
  cycleLang(): void {
    this.save.lang = nextLang();
    setLang(this.save.lang);
    writeSave(this.save);
  }

  get level(): number {
    return levelFor(this.distance);
  }

  get t(): number {
    return this.elapsed;
  }

  /** Người chơi có đang đứng đủ im để thoát chết không. */
  get isSafe(): boolean {
    return !this.player.moving;
  }

  start(): void {
    this.world.reset();
    this.player.reset();
    this.boss.reset();
    this.effects.clear();
    this.time = CFG.time.start;
    // maxTime nở ra mỗi lần qua checkpoint, phải trả về mốc gốc — nếu không ván
    // sau vẫn giữ thanh giờ đã nới rộng của ván trước.
    this.maxTime = CFG.time.max;
    this.score = 0;
    this.distance = 0;
    this.shields = CFG.player.startShields;
    this.grace = 1.5;
    this.deathCause = null;
    this.deathT = 0;
    this.fallT = 0;
    this.banner = '';
    this.bannerT = 0;
    this.popups.length = 0;
    this.lastCell = 0;
    this.phase = 'playing';
    this.world.ensureAhead(0);
  }

  toggleMute(): void {
    this.save.muted = !this.save.muted;
    this.audio.setMuted(this.save.muted);
    writeSave(this.save);
  }

  update(dt: number, actions: GameAction[], holding: boolean): void {
    this.elapsed += dt;
    this.effects.update(dt);
    if (this.bannerT > 0) this.bannerT -= dt;

    switch (this.phase) {
      case 'menu':
      case 'gameover':
        if (actions.some((a) => a.kind === 'confirm')) {
          if (this.phase === 'gameover' && this.deathT < DEATH_ANIM + 0.5) break;
          this.start();
        }
        break;
      case 'playing':
        this.updatePlaying(dt, actions, holding);
        break;
      case 'dying':
        this.updateDying(dt);
        break;
    }
  }

  private updatePlaying(dt: number, actions: GameAction[], holding: boolean): void {
    this.boss.update(dt, this.distance);
    if (this.grace > 0) this.grace -= dt;

    this.player.holding = holding;
    for (const action of actions) {
      if (action.kind !== 'lane') continue;
      const result = this.player.laneChange(action.dir);
      if (result === 'blocked') this.effects.addShake(4);
      else if (result === 'ok') this.audio.hop();
    }

    this.player.update(dt, this.level);
    this.enterCells();
    if (this.phase !== 'playing') return;

    // Quản trò nhìn thẳng mà còn nhúc nhích là dính sét.
    if (this.boss.isWatching && this.player.moving && this.grace <= 0) {
      this.die('caught');
      return;
    }

    this.time -= drainFor(this.level) * dt;
    if (this.time <= 0) {
      this.time = 0;
      this.die('timeout');
      return;
    }

    this.world.ensureAhead(this.player.z);
  }

  /** Xét mọi ô mà nhân vật vừa chạy qua kể từ khung hình trước. */
  private enterCells(): void {
    const lane = Math.round(this.player.renderLane);
    const target = this.player.cellZ;
    while (this.lastCell < target) {
      this.lastCell++;
      this.enterCell(this.lastCell, lane);
      if (this.phase !== 'playing') return;
    }
  }

  private enterCell(z: number, lane: number): void {
    if (z > this.distance) {
      this.score += (z - this.distance) * CFG.score.perRow;
      this.distance = z;
    }

    const cell = this.world.cell(z, lane);
    if (cell) {
      if (cell.type === 'rock' || cell.type === 'tree') {
        this.die('crash');
        return;
      }
      if (cell.type === 'hole') {
        this.die('hole');
        return;
      }
    }

    const item = this.world.takeItem(z, lane);
    if (item) this.collect(item);

    const row = this.world.row(z);
    if (row?.checkpoint && !row.claimed) {
      row.claimed = true;
      // Thanh giờ nới thêm rất ít, nếu không đi càng xa lại càng thong thả.
      this.maxTime = Math.min(CFG.time.max + 4, this.maxTime + 0.6);
      this.time = this.maxTime;
      this.score += CFG.score.checkpoint;
      this.audio.checkpoint();
      this.effects.flash('#8ef0c4', 0.22);
      this.showBanner(t().checkpoint);
    }
  }

  private collect(item: ItemType): void {
    this.audio.pickup();
    if (item === 'clock') {
      this.time = Math.min(this.maxTime, this.time + CFG.time.clockBonus);
      this.score += CFG.score.clock;
      this.popups.push({ text: t().pickupClock(CFG.time.clockBonus), color: '#e08a1a' });
    } else {
      this.shields++;
      this.score += CFG.score.heart;
      this.popups.push({ text: t().pickupShield, color: '#1a8fd0' });
    }
  }

  private die(cause: DeathCause): void {
    if (this.phase !== 'playing') return;

    // Còn khiên thì hồi sinh ngay tại chỗ, dọn sẵn đường để không chết lại lập tức.
    if (this.shields > 0) {
      this.shields--;
      this.grace = CFG.player.reviveGrace;
      this.time = Math.max(this.time, Math.min(this.maxTime, 12));
      this.player.speed = 0;
      this.world.clearPath(this.player.cellZ, Math.round(this.player.renderLane), 3);
      this.boss.forceCount(this.distance);
      this.audio.revive();
      this.effects.flash('#5ec8f0', 0.45);
      this.effects.addShake(10);
      this.showBanner(t().revived);
      return;
    }

    this.phase = 'dying';
    this.deathCause = cause;
    this.deathT = 0;
    this.fallT = 0;
    this.player.speed = 0;
    this.audio.drone(false);

    if (cause === 'hole') {
      this.audio.fall();
    } else if (cause === 'crash') {
      this.audio.blocked();
      this.effects.addShake(20);
    } else {
      this.audio.lightning();
      this.effects.addShake(24);
    }
  }

  private updateDying(dt: number): void {
    this.deathT += dt;
    if (this.deathCause === 'hole') this.fallT = Math.min(1, this.fallT + dt * 1.6);
    if (this.deathT < DEATH_ANIM) return;

    this.phase = 'gameover';
    this.audio.gameOver();
    this.save.runs++;
    if (this.score > this.save.best) this.save.best = this.score;
    if (this.distance > this.save.bestDistance) this.save.bestDistance = this.distance;
    writeSave(this.save);
  }

  private showBanner(text: string): void {
    this.banner = text;
    this.bannerT = 1.1;
  }
}
