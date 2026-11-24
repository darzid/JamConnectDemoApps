import { VOICE_RECIPES } from '../constants.js';
import { RotaryKnob } from '../components/RotaryKnob.js';

/**
 * Module 02: Single Analog Drum Voice Synthesizer & Self-Sampler
 */
export class AnalogVoiceModule {
  constructor(app, audio) {
    this.app = app;
    this.audio = audio;
    this.knobControllers = {};
  }

  init() {
    this.buildKnobs();
    this.sync();
    this.bindEvents();
  }

  buildKnobs() {
    const vcoEl = document.getElementById('knobs-vco');
    const noiseEl = document.getElementById('knobs-noise');
    const filterEl = document.getElementById('knobs-filter');
    const params = this.app.analogVoiceParams;

    this.knobControllers.pitch = new RotaryKnob(vcoEl, {
      label: 'PITCH', min: 28, max: 900, value: params.pitch, log: true,
      format: (v) => `${Math.round(v)}Hz`,
      onChange: (v) => { params.pitch = v; }
    });
    this.knobControllers.wave = new RotaryKnob(vcoEl, {
      label: 'WAVE', min: 0, max: 1, value: params.wave,
      format: (v) => `${Math.round(v * 100)}%`,
      onChange: (v) => { params.wave = v; }
    });
    this.knobControllers.bendAmt = new RotaryKnob(vcoEl, {
      label: 'BEND', min: 0, max: 8, value: params.bendAmt,
      format: (v) => `${v.toFixed(1)}x`,
      onChange: (v) => { params.bendAmt = v; }
    });
    this.knobControllers.bendDec = new RotaryKnob(vcoEl, {
      label: 'B-DEC', min: 0.01, max: 0.35, value: params.bendDec, log: true,
      format: (v) => `${Math.round(v * 1000)}m`,
      onChange: (v) => { params.bendDec = v; }
    });

    this.knobControllers.noiseLvl = new RotaryKnob(noiseEl, {
      label: 'LEVEL', min: 0, max: 1, value: params.noiseLvl,
      format: (v) => `${Math.round(v * 100)}%`,
      onChange: (v) => { params.noiseLvl = v; }
    });
    this.knobControllers.noiseColor = new RotaryKnob(noiseEl, {
      label: 'COLOR', min: 0, max: 1, value: params.noiseColor,
      format: (v) => (v < 0.5 ? 'PINK' : 'BLUE'),
      onChange: (v) => { params.noiseColor = v; }
    });
    this.knobControllers.noiseDec = new RotaryKnob(noiseEl, {
      label: 'N-DEC', min: 0.015, max: 0.6, value: params.noiseDec, log: true,
      format: (v) => `${Math.round(v * 1000)}m`,
      onChange: (v) => { params.noiseDec = v; }
    });
    this.knobControllers.click = new RotaryKnob(noiseEl, {
      label: 'CLICK', min: 0, max: 1, value: params.click,
      format: (v) => `${Math.round(v * 100)}%`,
      onChange: (v) => { params.click = v; }
    });

    this.knobControllers.cutoff = new RotaryKnob(filterEl, {
      label: 'CUTOFF', min: 120, max: 14000, value: params.cutoff, log: true,
      format: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`),
      onChange: (v) => { params.cutoff = v; }
    });
    this.knobControllers.res = new RotaryKnob(filterEl, {
      label: 'RES Q', min: 0.5, max: 14, value: params.res,
      format: (v) => v.toFixed(1),
      onChange: (v) => { params.res = v; }
    });
    this.knobControllers.modDepth = new RotaryKnob(filterEl, {
      label: 'FM MOD', min: 0, max: 1, value: params.modDepth,
      format: (v) => `${Math.round(v * 100)}%`,
      onChange: (v) => { params.modDepth = v; }
    });
    this.knobControllers.ampDec = new RotaryKnob(filterEl, {
      label: 'A-DEC', min: 0.03, max: 0.9, value: params.ampDec, log: true,
      format: (v) => `${Math.round(v * 1000)}m`,
      onChange: (v) => { params.ampDec = v; }
    });
  }

  sync() {
    const params = this.app.analogVoiceParams;
    Object.keys(this.knobControllers).forEach((key) => {
      if (params[key] !== undefined) {
        this.knobControllers[key].setValue(params[key]);
      }
    });

    document.querySelectorAll('.fmode-btn').forEach((btn) => {
      const active = btn.dataset.fmode === params.filterMode;
      btn.className = active
        ? 'fmode-btn px-1.5 py-0.5 rounded font-mono-tech text-[9px] bg-amber-500 text-zinc-950 font-bold cursor-pointer'
        : 'fmode-btn px-1.5 py-0.5 rounded font-mono-tech text-[9px] bg-zinc-800 text-zinc-400 cursor-pointer';
    });

    this.syncCaptureLabel();
  }

  syncCaptureLabel() {
    const capLbl = document.getElementById('capture-label');
    if (capLbl) capLbl.textContent = `SAMPLE → T${this.app.state.selectedTrack + 1}`;
  }

  bindEvents() {
    document.querySelectorAll('[data-recipe]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const rec = VOICE_RECIPES[btn.dataset.recipe];
        if (!rec) return;
        Object.assign(this.app.analogVoiceParams, rec);
        this.sync();
        await this.audio.auditionAnalogVoice(this.app.analogVoiceParams);
      });
    });

    document.querySelectorAll('.fmode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.app.analogVoiceParams.filterMode = btn.dataset.fmode;
        this.sync();
      });
    });

    document.getElementById('btn-trig-analog').addEventListener('click', async () => {
      await this.audio.auditionAnalogVoice(this.app.analogVoiceParams);
    });

    document.getElementById('btn-capture-sample').addEventListener('click', async () => {
      const idx = this.app.state.selectedTrack;
      const tr = this.app.tracks[idx];
      await this.audio.captureAnalogVoiceToTrack(idx, this.app.analogVoiceParams);
      this.app.drawTrackWaveform(idx);
      this.app.flashTrackCard(idx);
      await this.audio.auditionTrack(idx, 0.95);
      this.app.showToast(`Sampled Analog Voice → T${idx + 1} ${tr.name}`, 'on-red');
    });
  }
}
