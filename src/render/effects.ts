type Ctx = CanvasRenderingContext2D;

interface Bolt {
  points: Array<{ x: number; y: number }>;
  life: number;
  max: number;
}

interface FloatText {
  text: string;
  x: number;
  y: number;
  color: string;
  life: number;
  max: number;
  size: number;
}

/** Hiệu ứng ngắn hạn: rung màn hình, chớp sáng, sét đánh, chữ bay lên. */
export class Effects {
  private shake = 0;
  private flashA = 0;
  private flashColor = '#ffffff';
  private bolts: Bolt[] = [];
  private texts: FloatText[] = [];
  private t = 0;

  offsetX = 0;
  offsetY = 0;

  clear(): void {
    this.shake = 0;
    this.flashA = 0;
    this.bolts = [];
    this.texts = [];
  }

  update(dt: number): void {
    this.t += dt;
    this.shake = Math.max(0, this.shake - dt * 34);
    this.flashA = Math.max(0, this.flashA - dt * 2.4);

    const amp = this.shake;
    this.offsetX = (Math.random() - 0.5) * amp;
    this.offsetY = (Math.random() - 0.5) * amp;

    for (const b of this.bolts) b.life -= dt;
    this.bolts = this.bolts.filter((b) => b.life > 0);

    for (const f of this.texts) {
      f.life -= dt;
      f.y -= dt * 46;
    }
    this.texts = this.texts.filter((f) => f.life > 0);
  }

  addShake(px: number): void {
    this.shake = Math.max(this.shake, px);
  }

  flash(color: string, alpha = 0.8): void {
    this.flashColor = color;
    this.flashA = Math.max(this.flashA, alpha);
  }

  /** Tia sét giáng từ mép trên xuống đúng vị trí người chơi. */
  lightning(x: number, y: number): void {
    const points = [{ x: x + (Math.random() - 0.5) * 60, y: -20 }];
    const segments = 9;
    for (let i = 1; i <= segments; i++) {
      const p = i / segments;
      points.push({
        x: x + (points[0].x - x) * (1 - p) + (Math.random() - 0.5) * 46 * (1 - p * 0.6),
        y: -20 + (y + 20) * p,
      });
    }
    points.push({ x, y });
    this.bolts.push({ points, life: 0.42, max: 0.42 });
    this.addShake(26);
    this.flash('#ffffff', 0.85);
  }

  floatText(text: string, x: number, y: number, color: string, size = 22): void {
    this.texts.push({ text, x, y, color, life: 1.1, max: 1.1, size });
  }

  drawWorld(ctx: Ctx): void {
    for (const b of this.bolts) {
      const a = b.life / b.max;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = '#8fd0ff';
      ctx.shadowBlur = 26;
      ctx.lineWidth = 6 * a + 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(b.points[0].x, b.points[0].y);
      for (const p of b.points.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.restore();
    }

    for (const f of this.texts) {
      const a = Math.min(1, f.life / (f.max * 0.5));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = f.color;
      ctx.font = `bold ${f.size}px 'Trebuchet MS', sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }
  }

  drawOverlay(ctx: Ctx, w: number, h: number): void {
    if (this.flashA <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, this.flashA);
    ctx.fillStyle = this.flashColor;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}
