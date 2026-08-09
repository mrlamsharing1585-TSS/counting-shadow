import type { Game } from '../game/game';
import { drawControlHints, drawGameOver, drawHud, drawMenu, drawVignette } from './hud';

/**
 * Lớp giao diện 2D nằm chồng lên khung hình WebGL: thanh giờ, điểm, cảnh báo,
 * menu, cùng các hiệu ứng ngắn (sét, chớp sáng, chữ bay).
 */
export class Overlay {
  private ctx: CanvasRenderingContext2D;
  private w = 1;
  private h = 1;
  private safeTop = 0;
  private deathHandled = false;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  resize(w: number, h: number, dpr: number, safeTop: number): void {
    const canvas = this.ctx.canvas;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
    this.safeTop = safeTop;
  }

  draw(game: Game, player: { x: number; y: number }): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);

    // Hiệu ứng bám theo vị trí nhân vật trên màn hình.
    if (game.phase === 'dying' && !this.deathHandled) {
      this.deathHandled = true;
      if (game.deathCause === 'caught' || game.deathCause === 'timeout') {
        game.effects.lightning(player.x, player.y);
      }
    } else if (game.phase === 'playing') {
      this.deathHandled = false;
    }

    while (game.popups.length > 0) {
      const popup = game.popups.shift()!;
      game.effects.floatText(popup.text, player.x, player.y - 30, popup.color, 20);
    }

    game.effects.drawWorld(ctx);
    drawVignette(ctx, game, this.w, this.h);
    if (game.phase === 'playing' || game.phase === 'dying') {
      drawHud(ctx, game, this.w, this.h, this.safeTop);
      drawControlHints(ctx, game, this.w, this.h);
    }
    game.effects.drawOverlay(ctx, this.w, this.h);
    if (game.phase === 'menu') drawMenu(ctx, game, this.w, this.h);
    if (game.phase === 'gameover') drawGameOver(ctx, game, this.w, this.h);
  }
}
