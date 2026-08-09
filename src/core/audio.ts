/**
 * Âm thanh tổng hợp bằng WebAudio — không cần file asset nào.
 * Gồm: tiếng đếm 1-2-3, tiếng khựng cảnh báo, drone lúc bị nhìn,
 * sét đánh, rơi hố, nhặt vật phẩm, qua checkpoint.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  muted = false;

  /** Gọi trong 1 sự kiện chạm/phím đầu tiên để trình duyệt cho phép phát tiếng. */
  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    type WithWebkit = typeof globalThis & { webkitAudioContext?: typeof AudioContext };
    const Ctor = window.AudioContext ?? (globalThis as WithWebkit).webkitAudioContext;
    if (!Ctor) return;

    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);

    // Buffer nhiễu trắng dùng cho sét / gió.
    const len = Math.floor(this.ctx.sampleRate * 1.2);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.02);
    }
  }

  private tone(
    freq: number,
    dur: number,
    opts: { type?: OscillatorType; gain?: number; sweepTo?: number; delay?: number } = {},
  ): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + (opts.delay ?? 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const peak = opts.gain ?? 0.25;

    osc.type = opts.type ?? 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.sweepTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.sweepTo), t0 + dur);
    }

    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, gain: number, filterHz: number, delay = 0): void {
    if (!this.ctx || !this.master || !this.noiseBuffer) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterHz, t0);
    filter.frequency.exponentialRampToValueAtTime(180, t0 + dur);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(filter).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur);
  }

  /** Tiếng đếm: index 0/1/2 tương ứng "một, hai, ba" — cao dần. */
  count(index: number): void {
    const freqs = [392, 466, 587];
    this.tone(freqs[Math.min(index, 2)], 0.16, { type: 'triangle', gain: 0.3 });
  }

  /** Khựng lại trước khi quay mặt. */
  warning(): void {
    this.tone(900, 0.14, { type: 'sawtooth', gain: 0.18, sweepTo: 140 });
    this.noise(0.18, 0.12, 2200);
  }

  /** Bật/tắt drone rợn người trong lúc bóng đen nhìn thẳng. */
  drone(on: boolean): void {
    if (!this.ctx || !this.master) return;
    if (on) {
      if (this.droneOsc) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 48;
      g.gain.value = 0.0001;
      osc.connect(g).connect(this.master);
      osc.start();
      g.gain.setTargetAtTime(0.11, this.ctx.currentTime, 0.05);
      this.droneOsc = osc;
      this.droneGain = g;
    } else if (this.droneOsc && this.droneGain) {
      const osc = this.droneOsc;
      const g = this.droneGain;
      this.droneOsc = null;
      this.droneGain = null;
      g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.04);
      osc.stop(this.ctx.currentTime + 0.3);
    }
  }

  hop(): void {
    this.tone(520, 0.08, { type: 'sine', gain: 0.16, sweepTo: 760 });
  }

  blocked(): void {
    this.tone(110, 0.09, { type: 'square', gain: 0.12 });
  }

  pickup(): void {
    this.tone(880, 0.09, { type: 'sine', gain: 0.22 });
    this.tone(1320, 0.12, { type: 'sine', gain: 0.18, delay: 0.07 });
  }

  checkpoint(): void {
    this.tone(523, 0.12, { type: 'triangle', gain: 0.22 });
    this.tone(659, 0.12, { type: 'triangle', gain: 0.22, delay: 0.09 });
    this.tone(784, 0.2, { type: 'triangle', gain: 0.24, delay: 0.18 });
  }

  lightning(): void {
    this.noise(0.7, 0.5, 6000);
    this.tone(70, 0.6, { type: 'sawtooth', gain: 0.3, sweepTo: 28 });
  }

  fall(): void {
    this.tone(420, 0.7, { type: 'sine', gain: 0.26, sweepTo: 45 });
  }

  revive(): void {
    this.tone(330, 0.18, { type: 'sine', gain: 0.22 });
    this.tone(495, 0.18, { type: 'sine', gain: 0.22, delay: 0.12 });
    this.tone(660, 0.35, { type: 'sine', gain: 0.24, delay: 0.24 });
  }

  gameOver(): void {
    this.tone(300, 0.5, { type: 'triangle', gain: 0.24, sweepTo: 90 });
    this.noise(0.9, 0.16, 900, 0.1);
  }
}
