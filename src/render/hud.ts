import { t } from '../core/i18n';
import type { Game } from '../game/game';
import { COLORS } from './palette';

type Ctx = CanvasRenderingContext2D;

const FONT = "'Trebuchet MS', 'Segoe UI', sans-serif";

/** Vùng chạm của nút tắt tiếng (góc trên bên phải, chừa safe-area). */
export function muteRect(w: number, top: number): { x: number; y: number; s: number } {
  const s = 40;
  return { x: w - s - 8, y: top + 52, s };
}

/** Vùng chạm của nút đổi ngôn ngữ — chỉ hiện ở màn hình chính. */
export function langRect(w: number, h: number): { x: number; y: number; w: number; h: number } {
  return { x: w / 2 - 44, y: h * 0.9 - 22, w: 88, h: 40 };
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Chữ sáng trên nền lúc sáng lúc tối — luôn kèm viền tối cho dễ đọc. */
function shadowed(ctx: Ctx, blur = 6): void {
  ctx.shadowColor = 'rgba(12,8,22,0.85)';
  ctx.shadowBlur = blur;
}

export function drawVignette(ctx: Ctx, game: Game, w: number, h: number): void {
  if (game.phase !== 'playing' && game.phase !== 'dying') return;

  let strength = 0;
  if (game.boss.state === 'warning') strength = 0.36 + Math.sin(game.t * 26) * 0.16;
  else if (game.boss.state === 'watching') strength = 0.26;
  if (game.time < 6) strength = Math.max(strength, 0.24 + Math.sin(game.t * 10) * 0.12);
  if (strength <= 0.01) return;

  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.34, w / 2, h / 2, h * 0.78);
  g.addColorStop(0, 'rgba(255,47,78,0)');
  g.addColorStop(1, `rgba(255,47,78,${Math.min(0.5, strength)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  if (game.boss.state !== 'counting') {
    ctx.save();
    ctx.strokeStyle = `rgba(255,47,78,${Math.min(0.95, strength + 0.4)})`;
    ctx.shadowColor = COLORS.danger;
    ctx.shadowBlur = 18;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, w - 10, h - 10);
    ctx.restore();
  }
}

export function drawHud(ctx: Ctx, game: Game, w: number, h: number, top: number): void {
  const pad = 16;
  const barW = w - pad * 2;
  const barH = 14;
  const barY = top + 12;

  ctx.save();
  ctx.fillStyle = 'rgba(12,8,22,0.5)';
  roundRect(ctx, pad, barY, barW, barH, barH / 2);
  ctx.fill();

  const ratio = Math.max(0, Math.min(1, game.time / game.maxTime));
  const low = game.time < 6;
  const grad = ctx.createLinearGradient(pad, 0, pad + barW, 0);
  if (low) {
    grad.addColorStop(0, '#ff3b48');
    grad.addColorStop(1, '#ff9a3b');
  } else {
    grad.addColorStop(0, '#2fd08a');
    grad.addColorStop(1, '#8ff0c8');
  }
  ctx.fillStyle = grad;
  ctx.shadowColor = low ? '#ff3b48' : 'rgba(47,208,138,0.7)';
  ctx.shadowBlur = low ? 12 + Math.sin(game.t * 14) * 8 : 8;
  roundRect(ctx, pad, barY, Math.max(barH, barW * ratio), barH, barH / 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  shadowed(ctx);
  ctx.fillStyle = COLORS.text;
  ctx.font = `bold 13px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`${game.time.toFixed(1)}s`, pad + 2, barY + barH + 18);

  ctx.textAlign = 'center';
  ctx.font = `bold 26px ${FONT}`;
  ctx.fillText(`${game.score}`, w / 2, barY + barH + 26);
  ctx.font = `11px ${FONT}`;
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText(t().progress(game.distance, game.level + 1), w / 2, barY + barH + 42);

  ctx.textAlign = 'right';
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillStyle = COLORS.orb;
  ctx.fillText(
    game.shields > 0 ? '♥'.repeat(Math.min(5, game.shields)) : '♡',
    w - pad - 2,
    barY + barH + 18,
  );
  ctx.restore();

  drawMuteButton(ctx, game, w, top);
  drawBossState(ctx, game, w, h, top);
  drawBanner(ctx, game, w, h);
}

function drawMuteButton(ctx: Ctx, game: Game, w: number, top: number): void {
  const m = muteRect(w, top);
  const cx = m.x + m.s / 2;
  const cy = m.y + m.s / 2;
  ctx.save();
  ctx.globalAlpha = 0.7;
  shadowed(ctx, 4);
  ctx.strokeStyle = COLORS.text;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy - 4);
  ctx.lineTo(cx - 4, cy - 4);
  ctx.lineTo(cx + 1, cy - 9);
  ctx.lineTo(cx + 1, cy + 9);
  ctx.lineTo(cx - 4, cy + 4);
  ctx.lineTo(cx - 8, cy + 4);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  if (game.save.muted) {
    ctx.moveTo(cx + 5, cy - 6);
    ctx.lineTo(cx + 13, cy + 6);
    ctx.moveTo(cx + 13, cy - 6);
    ctx.lineTo(cx + 5, cy + 6);
  } else {
    ctx.arc(cx + 4, cy, 6, -0.9, 0.9);
  }
  ctx.stroke();
  ctx.restore();
}

function drawBossState(ctx: Ctx, game: Game, w: number, h: number, top: number): void {
  if (game.phase !== 'playing') return;
  const state = game.boss.state;

  ctx.save();
  ctx.textAlign = 'center';

  // Con số đếm nằm phía trên đầu quản trò để không đè lên người nó.
  if (state === 'counting' && game.boss.countIndex > 0) {
    ctx.font = `bold 70px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillText(`${game.boss.countIndex}`, w / 2, top + h * 0.19);
  }

  if (state === 'warning') {
    ctx.font = `bold 32px ${FONT}`;
    ctx.fillStyle = '#ff4b5e';
    shadowed(ctx, 14);
    ctx.fillText(t().stop, w / 2, h * 0.42);
    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = COLORS.text;
    ctx.fillText(t().stopHint, w / 2, h * 0.46);
  }

  if (state === 'watching') {
    const safe = game.isSafe;
    ctx.font = `bold 26px ${FONT}`;
    ctx.fillStyle = safe ? '#ffffff' : '#ff4b5e';
    shadowed(ctx, 14);
    ctx.fillText(safe ? t().holdStill : t().dontMove, w / 2, h * 0.42);
  }
  ctx.restore();

  drawBrakeWidget(ctx, game, w, h);
}

/**
 * Widget duy nhất ở đáy màn hình, ngay tầm ngón cái:
 *  - vành ngoài đỏ vơi dần = còn bao lâu nữa quản trò quay mặt,
 *  - vành trong = tiến độ phanh, đầy và xanh nghĩa là đã đứng im an toàn.
 */
function drawBrakeWidget(ctx: Ctx, game: Game, w: number, h: number): void {
  const state = game.boss.state;
  const holding = game.player.holding;
  if (state === 'counting' && !holding) return;

  const brake = 1 - game.player.motion(game.level);
  const still = game.isSafe;
  const cx = w / 2;
  const cy = h * 0.84;

  ctx.save();
  ctx.lineCap = 'round';

  // Đĩa tối phía sau để widget đọc được cả trên nền đá sáng.
  ctx.fillStyle = 'rgba(14,9,26,0.45)';
  ctx.beginPath();
  ctx.arc(cx, cy, 50, 0, Math.PI * 2);
  ctx.fill();

  if (state === 'warning') {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ff4b5e';
    ctx.shadowColor = '#ff4b5e';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, 40, -Math.PI / 2, -Math.PI / 2 + (1 - game.boss.progress) * Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else if (state === 'watching') {
    ctx.strokeStyle = still ? 'rgba(255,255,255,0.55)' : '#ff4b5e';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = holding ? 1 : 0.45;
  ctx.strokeStyle = still ? '#5fe0a4' : COLORS.text;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, 26, -Math.PI / 2, -Math.PI / 2 + Math.max(0.001, brake) * Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 0.9;
  shadowed(ctx, 5);
  ctx.fillStyle = still ? '#5fe0a4' : COLORS.text;
  ctx.font = `bold 11px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(still ? t().brakeStill : holding ? t().brakeBraking : t().brakeHold, cx, cy + 66);
  ctx.restore();
}

function drawBanner(ctx: Ctx, game: Game, w: number, h: number): void {
  if (game.bannerT <= 0) return;
  const a = Math.min(1, game.bannerT / 0.4);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.font = `bold 30px ${FONT}`;
  ctx.fillStyle = '#5fe0a4';
  shadowed(ctx, 10);
  ctx.fillText(game.banner, w / 2, h * 0.25 - (1 - a) * 20);
  ctx.restore();
}

export function drawControlHints(ctx: Ctx, game: Game, w: number, h: number): void {
  if (game.phase !== 'playing') return;
  const a = Math.max(0, 1 - game.distance / 14);
  if (a <= 0.02) return;

  ctx.save();
  ctx.globalAlpha = a * 0.85;
  shadowed(ctx, 6);
  ctx.fillStyle = COLORS.text;
  ctx.font = `13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(t().hintLane, w / 2, h * 0.95);
  ctx.fillText(t().hintHold, w / 2, h * 0.98);
  ctx.restore();
}

function scrim(ctx: Ctx, w: number, h: number): void {
  ctx.fillStyle = 'rgba(16,10,30,0.82)';
  ctx.fillRect(0, 0, w, h);
}

export function drawMenu(ctx: Ctx, game: Game, w: number, h: number): void {
  ctx.save();
  scrim(ctx, w, h);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff3040';
  ctx.shadowColor = '#ff3040';
  ctx.shadowBlur = 30;
  ctx.font = `bold ${Math.min(120, w * 0.34)}px ${FONT}`;
  ctx.fillText('123', w / 2, h * 0.28);
  ctx.shadowBlur = 0;

  ctx.fillStyle = COLORS.text;
  ctx.font = `bold 14px ${FONT}`;
  ctx.fillText(t().tagline, w / 2, h * 0.33);

  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = COLORS.textDim;
  const lines = t().howToPlay;
  lines.forEach((line, i) => ctx.fillText(line, w / 2, h * 0.44 + i * 22));

  if (game.save.best > 0) {
    ctx.fillStyle = COLORS.gold;
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText(
      t().best(game.save.best, game.save.bestDistance),
      w / 2,
      h * 0.44 + lines.length * 22 + 16,
    );
  }

  ctx.globalAlpha = 0.6 + Math.sin(game.t * 4) * 0.4;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText(t().tapToStart, w / 2, h * 0.82);
  ctx.globalAlpha = 1;

  drawLangButton(ctx, w, h);
  ctx.restore();
}

/** Nút đổi ngôn ngữ ở màn hình chính. */
function drawLangButton(ctx: Ctx, w: number, h: number): void {
  const r = langRect(w, h);
  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = COLORS.textDim;
  ctx.lineWidth = 1.5;
  roundRect(ctx, r.x, r.y, r.w, r.h, r.h / 2);
  ctx.stroke();
  ctx.fillStyle = COLORS.text;
  ctx.font = `bold 14px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`🌐  ${t().label}`, r.x + r.w / 2, r.y + r.h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

export function drawGameOver(ctx: Ctx, game: Game, w: number, h: number): void {
  ctx.save();
  scrim(ctx, w, h);

  const s = t();
  const reason =
    game.deathCause === 'hole'
      ? s.deathHole
      : game.deathCause === 'crash'
        ? s.deathCrash
        : game.deathCause === 'timeout'
          ? s.deathTimeout
          : s.deathCaught;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff3040';
  ctx.shadowColor = '#ff3040';
  ctx.shadowBlur = 24;
  ctx.font = `bold ${Math.min(52, w * 0.13)}px ${FONT}`;
  ctx.fillText(s.gameOver, w / 2, h * 0.3);
  ctx.shadowBlur = 0;

  ctx.fillStyle = COLORS.textDim;
  ctx.font = `13px ${FONT}`;
  ctx.fillText(reason, w / 2, h * 0.35);

  ctx.fillStyle = COLORS.text;
  ctx.font = `bold 40px ${FONT}`;
  ctx.fillText(`${game.score}`, w / 2, h * 0.48);
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText(s.scoreSub(game.distance), w / 2, h * 0.52);

  const isRecord = game.score >= game.save.best && game.score > 0;
  ctx.fillStyle = isRecord ? COLORS.gold : COLORS.textDim;
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillText(isRecord ? s.newRecord : s.bestShort(game.save.best), w / 2, h * 0.6);

  ctx.globalAlpha = 0.5 + Math.sin(game.t * 4) * 0.5;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillText(s.tapToRetry, w / 2, h * 0.78);
  ctx.restore();
}
