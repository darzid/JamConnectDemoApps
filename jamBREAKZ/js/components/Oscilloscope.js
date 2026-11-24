/**
 * Zero-Reflow, Auto-Idling, HiDPI Master Oscilloscope
 */
export class Oscilloscope {
  constructor({ canvasId, getWaveform, isPlaying, isAudioReady }) {
    this.canvasId = canvasId;
    this.getWaveform = getWaveform;
    this.isPlaying = isPlaying;
    this.isAudioReady = isAudioReady;

    this.observerReady = false;
    this.rafId = 0;
    this.silentFrames = 0;
    this.width = 180;
    this.height = 36;
    this.canvas = null;
    this.ctx = null;

    this._renderFrame = this._renderFrame.bind(this);
  }

  init() {
    if (this.observerReady) return;
    this.observerReady = true;
    this.canvas = document.getElementById(this.canvasId);
    this.syncDimensions();

    if (typeof ResizeObserver !== 'undefined' && this.canvas) {
      const ro = new ResizeObserver(() => {
        this.syncDimensions();
        if (!this.rafId) this.drawFlatline();
      });
      ro.observe(this.canvas);
    }

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isPlaying()) {
        this.wake();
      }
    });

    this.drawFlatline();
  }

  syncDimensions() {
    if (!this.canvas) this.canvas = document.getElementById(this.canvasId);
    if (!this.canvas) return;
    if (!this.ctx) this.ctx = this.canvas.getContext('2d');

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(100, Math.floor(rect.width || 180));
    this.height = Math.max(32, Math.floor(rect.height || 36));
    const targetW = Math.floor(this.width * dpr);
    const targetH = Math.floor(this.height * dpr);

    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  drawFlatline() {
    if (!this.ctx) return;
    this.ctx.fillStyle = '#0e0e11';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.strokeStyle = 'rgba(245, 158, 11, 0.22)';
    this.ctx.lineWidth = 1.2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height / 2);
    this.ctx.lineTo(this.width, this.height / 2);
    this.ctx.stroke();
  }

  _renderFrame() {
    this.rafId = 0;
    const waveform = this.getWaveform();
    if (document.hidden || !this.ctx || !waveform) return;

    const values = waveform.getValue();
    const w = this.width;
    const h = this.height;

    this.ctx.fillStyle = '#0e0e11';
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.strokeStyle = 'rgba(245, 158, 11, 0.16)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, h / 2);
    this.ctx.lineTo(w, h / 2);
    this.ctx.stroke();

    this.ctx.strokeStyle = '#fbbf24';
    this.ctx.lineWidth = 1.6;
    this.ctx.beginPath();

    let peak = 0;
    const invLen = 1 / (values.length - 1);
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      const av = v < 0 ? -v : v;
      if (av > peak) peak = av;
      const x = i * invLen * w;
      const y = (0.5 - v * 0.46) * h;
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.stroke();

    // Auto-idle when transport is stopped and reverb/delay tail decays to silence
    if (!this.isPlaying() && peak < 0.0012) {
      this.silentFrames++;
      if (this.silentFrames > 24) {
        this.drawFlatline();
        return;
      }
    } else {
      this.silentFrames = 0;
    }

    this.rafId = requestAnimationFrame(this._renderFrame);
  }

  wake() {
    if (!this.isAudioReady() || document.hidden) return;
    this.silentFrames = 0;
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(this._renderFrame);
    }
  }
}
