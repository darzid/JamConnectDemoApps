import { sliderToLogFreq, formatHz } from '../constants.js';

/**
 * Module 04: Performance Fills (Master Filter, Auto Filter, All-Channel Rolls & 8-Beat Reverb Build)
 */
export class FillsModule {
  constructor(app, audio) {
    this.app = app;
    this.audio = audio;

    this.fillVerbRafId = 0;
    this.fillVerbLastTs = 0;
    this.fillFilterAutoRafId = 0;
    this.fillFilterAutoLastTs = 0;

    this._stepFillFilterAuto = this._stepFillFilterAuto.bind(this);
    this._stepFillReverbBuild = this._stepFillReverbBuild.bind(this);
  }

  init() {
    this.sync();
    this.bindEvents();
  }

  sync() {
    this.syncFillFilterUI();
    this.updateFillFilterAutoUI(this.app.state.fillFilterAutoProgress);
    this.syncAllRollUI();
    this.updateFillReverbUI(this.app.state.fillVerbProgress);
  }

  // ---------------------------------------------------------------------------
  // 1. Master Mix Filter & 8-Step Auto Filter
  // ---------------------------------------------------------------------------

  syncFillFilterUI() {
    const st = this.app.state;
    const btn = document.getElementById('btn-fill-filter');
    const led = document.getElementById('fill-filter-led');
    if (btn && led) {
      btn.classList.toggle('hw-btn-amber', st.fillFilterOn);
      btn.childNodes[btn.childNodes.length - 1].textContent = st.fillFilterOn ? ' ACTIVE' : ' BYPASS';
      led.className = st.fillFilterOn ? 'led on-amber' : 'led';
    }
    document.querySelectorAll('.ffmode-btn').forEach((b) => {
      const active = b.dataset.ffmode === st.fillFilterMode;
      b.className = active
        ? 'ffmode-btn px-2 py-0.5 rounded font-mono-tech text-[10px] bg-amber-500 text-zinc-950 font-bold cursor-pointer'
        : 'ffmode-btn px-2 py-0.5 rounded font-mono-tech text-[10px] bg-zinc-800 text-zinc-400 cursor-pointer';
    });
    const cutVal = document.getElementById('fill-filter-cutoff-val');
    if (cutVal) cutVal.textContent = formatHz(st.fillFilterCutoff);
    const qVal = document.getElementById('fill-filter-q-val');
    if (qVal) qVal.textContent = st.fillFilterQ.toFixed(1);
  }

  updateFillFilterAutoUI(progress) {
    const st = this.app.state;
    const p = Math.max(0, Math.min(1, progress));
    const stepsDone = st.fillFilterAutoOn ? Math.min(8, Math.floor(p * 8) + 1) : 0;

    const indicator = document.getElementById('fill-filter-auto-indicator');
    const stepVal = document.getElementById('fill-filter-step-val');
    const autoBtn = document.getElementById('btn-fill-filter-auto');
    const autoLed = document.getElementById('fill-filter-auto-led');

    if (indicator) indicator.classList.toggle('hidden', !st.fillFilterAutoOn);
    if (stepVal) stepVal.textContent = `${stepsDone} / 8 STEPS`;
    if (autoBtn) {
      autoBtn.classList.toggle('hw-btn-amber', st.fillFilterAutoOn);
      autoBtn.classList.toggle('text-amber-300', !st.fillFilterAutoOn);
    }
    if (autoLed) autoLed.className = st.fillFilterAutoOn ? 'led on-red' : 'led';

    document.querySelectorAll('.fill-filter-step-led').forEach((el, idx) => {
      el.className = idx < stepsDone ? 'led fill-filter-step-led on-amber' : 'led fill-filter-step-led';
    });
  }

  stopFillFilterAuto(restoreStart = true) {
    const st = this.app.state;
    st.fillFilterAutoOn = false;
    st.fillFilterAutoProgress = 0;
    if (this.fillFilterAutoRafId) {
      cancelAnimationFrame(this.fillFilterAutoRafId);
      this.fillFilterAutoRafId = 0;
    }
    if (restoreStart) {
      const slider = document.getElementById('fill-filter-cutoff');
      if (slider) slider.value = Math.round(st.fillFilterAutoStartSlider);
      st.fillFilterCutoff = sliderToLogFreq(st.fillFilterAutoStartSlider);
      st.fillFilterOn = false;
      this.syncFillFilterUI();
      this.audio.applyFillFilter();
    }
    this.updateFillFilterAutoUI(0);
  }

  _stepFillFilterAuto(ts) {
    const st = this.app.state;
    if (!st.fillFilterAutoOn) return;
    const dtSec = Math.max(0, (ts - this.fillFilterAutoLastTs) / 1000);
    this.fillFilterAutoLastTs = ts;

    const eightStepsSec = 8 * (60 / Math.max(70, st.bpm));
    st.fillFilterAutoProgress = Math.min(1, st.fillFilterAutoProgress + dtSec / eightStepsSec);

    const startVal = st.fillFilterAutoStartSlider;
    const curSliderVal = startVal + (1000 - startVal) * st.fillFilterAutoProgress;
    const slider = document.getElementById('fill-filter-cutoff');
    if (slider) slider.value = Math.round(curSliderVal);

    st.fillFilterCutoff = sliderToLogFreq(curSliderVal);
    this.syncFillFilterUI();
    this.audio.applyFillFilter();
    this.updateFillFilterAutoUI(st.fillFilterAutoProgress);

    if (st.fillFilterAutoProgress >= 1) {
      this.stopFillFilterAuto(true);
      this.app.showToast('Auto Filter 8-step sweep complete!', 'on-mint');
      return;
    }

    this.fillFilterAutoRafId = requestAnimationFrame(this._stepFillFilterAuto);
  }

  async toggleFillFilterAuto() {
    const st = this.app.state;
    if (st.fillFilterAutoOn) {
      this.stopFillFilterAuto(true);
      this.app.showToast('Auto Filter disabled', 'on-amber');
      return;
    }

    await this.audio.ensureReady();
    const slider = document.getElementById('fill-filter-cutoff');
    st.fillFilterAutoStartSlider = slider ? Number(slider.value) : 670;
    st.fillFilterOn = true;
    st.fillFilterAutoOn = true;
    st.fillFilterAutoProgress = 0;
    this.fillFilterAutoLastTs = performance.now();

    this.syncFillFilterUI();
    this.audio.applyFillFilter();
    this.updateFillFilterAutoUI(0);
    this.fillFilterAutoRafId = requestAnimationFrame(this._stepFillFilterAuto);
    this.app.showToast('Auto Filter 8-step sweep engaged', 'on-amber');
  }

  // ---------------------------------------------------------------------------
  // 2. All-Channel Rolls
  // ---------------------------------------------------------------------------

  syncAllRollUI() {
    const st = this.app.state;
    const active = st.allRollHold || st.allRollLatch;
    const holdBtn = document.getElementById('btn-all-roll-hold');
    const holdLed = document.getElementById('all-roll-hold-led');
    const latchBtn = document.getElementById('btn-all-roll-latch');
    const latchLed = document.getElementById('all-roll-latch-led');
    const status = document.getElementById('all-roll-status');

    if (holdBtn) holdBtn.classList.toggle('pressed', st.allRollHold);
    if (holdLed) holdLed.className = st.allRollHold ? 'led on-cyan' : 'led';
    if (latchBtn) latchBtn.classList.toggle('hw-btn-amber', st.allRollLatch);
    if (latchLed) latchLed.className = st.allRollLatch ? 'led on-amber' : 'led';
    if (status) {
      status.textContent = active ? 'ROLLING' : 'IDLE';
      status.className = active
        ? 'font-mono-tech text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
        : 'font-mono-tech text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400';
    }
    document.querySelectorAll('.roll-rate-btn').forEach((b) => {
      b.classList.toggle('hw-btn-amber', Number(b.dataset.roll) === st.allRollRate);
    });
  }

  releaseHoldRoll() {
    if (this.app.state.allRollHold) {
      this.app.state.allRollHold = false;
      this.syncAllRollUI();
    }
  }

  // ---------------------------------------------------------------------------
  // 3. 8-Beat Expanding Master Reverb
  // ---------------------------------------------------------------------------

  updateFillReverbUI(progress) {
    const st = this.app.state;
    const p = Math.max(0, Math.min(1, progress));
    const beatsDone = st.fillVerbRunning ? Math.min(8, Math.floor(p * 8) + 1) : 0;
    const roomSec = (0.45 + p * 6.05).toFixed(1);

    const roomEl = document.getElementById('fill-verb-room-val');
    const beatEl = document.getElementById('fill-verb-beat-val');
    const ledEl = document.getElementById('fill-verb-led');
    const startBtn = document.getElementById('btn-fill-verb-start');

    if (roomEl) roomEl.textContent = `${roomSec}s ROOM`;
    if (beatEl) beatEl.textContent = `${beatsDone} / 8 BEATS`;
    if (ledEl) ledEl.className = st.fillVerbRunning ? 'led on-red' : 'led';
    if (startBtn) {
      startBtn.classList.toggle('hw-btn-red', st.fillVerbRunning);
      startBtn.classList.toggle('hw-btn-amber', !st.fillVerbRunning);
    }

    document.querySelectorAll('.fill-beat-led').forEach((el, idx) => {
      el.className = idx < beatsDone ? 'led fill-beat-led on-cyan' : 'led fill-beat-led';
    });
  }

  resetFillReverb(silent = false) {
    const st = this.app.state;
    st.fillVerbRunning = false;
    st.fillVerbProgress = 0;
    if (this.fillVerbRafId) {
      cancelAnimationFrame(this.fillVerbRafId);
      this.fillVerbRafId = 0;
    }
    this.audio.resetFillReverbAudio();
    this.updateFillReverbUI(0);
    if (!silent) this.app.showToast('8-Beat Reverb Build reset', 'on-cyan');
  }

  _stepFillReverbBuild(ts) {
    const st = this.app.state;
    if (!st.fillVerbRunning) return;
    const dtSec = Math.max(0, (ts - this.fillVerbLastTs) / 1000);
    this.fillVerbLastTs = ts;

    const eightBeatsSec = 8 * (60 / Math.max(70, st.bpm));
    st.fillVerbProgress = Math.min(1, st.fillVerbProgress + dtSec / eightBeatsSec);

    this.audio.applyFillReverbProgress(st.fillVerbProgress);
    this.updateFillReverbUI(st.fillVerbProgress);

    if (st.fillVerbProgress >= 1) {
      this.resetFillReverb(true);
      this.app.showToast('8-Beat Reverb Build complete!', 'on-mint');
      return;
    }

    this.fillVerbRafId = requestAnimationFrame(this._stepFillReverbBuild);
  }

  async startFillReverbBuild() {
    const st = this.app.state;
    await this.audio.ensureReady();
    if (this.fillVerbRafId) cancelAnimationFrame(this.fillVerbRafId);
    st.fillVerbRunning = true;
    st.fillVerbProgress = 0;
    this.fillVerbLastTs = performance.now();
    this.audio.applyFillReverbProgress(0);
    this.updateFillReverbUI(0);
    this.fillVerbRafId = requestAnimationFrame(this._stepFillReverbBuild);
    this.app.showToast('8-Beat Master Reverb Build engaged', 'on-cyan');
  }

  // ---------------------------------------------------------------------------
  // Event Bindings
  // ---------------------------------------------------------------------------

  bindEvents() {
    const st = this.app.state;

    // 1. Master Mix Filter & Auto Filter
    document.getElementById('btn-fill-filter').addEventListener('click', async () => {
      st.fillFilterOn = !st.fillFilterOn;
      if (!st.fillFilterOn && st.fillFilterAutoOn) {
        this.stopFillFilterAuto(true);
      }
      this.syncFillFilterUI();
      await this.audio.ensureReady();
      this.audio.applyFillFilter();
    });

    document.querySelectorAll('.ffmode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        st.fillFilterMode = btn.dataset.ffmode;
        this.syncFillFilterUI();
        this.audio.applyFillFilter();
      });
    });

    document.getElementById('fill-filter-cutoff').addEventListener('input', (e) => {
      if (st.fillFilterAutoOn) {
        this.stopFillFilterAuto(false);
      }
      st.fillFilterCutoff = sliderToLogFreq(Number(e.target.value));
      this.syncFillFilterUI();
      this.audio.applyFillFilter();
    });

    document.getElementById('fill-filter-q').addEventListener('input', (e) => {
      st.fillFilterQ = Number(e.target.value);
      this.syncFillFilterUI();
      this.audio.applyFillFilter();
    });

    document.getElementById('btn-fill-filter-auto').addEventListener('click', () => {
      this.toggleFillFilterAuto();
    });

    // 2. All-Channel Rolls
    document.querySelectorAll('.roll-rate-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        st.allRollRate = Number(btn.dataset.roll);
        this.syncAllRollUI();
      });
    });

    document.getElementById('btn-all-roll-hold').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      st.allRollHold = true;
      this.syncAllRollUI();
    });

    document.getElementById('btn-all-roll-latch').addEventListener('click', () => {
      st.allRollLatch = !st.allRollLatch;
      this.syncAllRollUI();
    });

    // 3. 8-Beat Master Reverb Build
    document.getElementById('fill-verb-wet').addEventListener('input', (e) => {
      const val = Number(e.target.value);
      st.fillVerbMaxWet = val / 100;
      document.getElementById('fill-verb-wet-val').textContent = `${val}%`;
      if (st.fillVerbRunning) this.audio.applyFillReverbProgress(st.fillVerbProgress);
    });

    document.getElementById('btn-fill-verb-start').addEventListener('click', () => {
      this.startFillReverbBuild();
    });

    document.getElementById('btn-fill-verb-reset').addEventListener('click', () => {
      this.resetFillReverb(false);
    });
  }
}
