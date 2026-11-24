import { MAX_STEPS } from '../constants.js';
import { RotaryKnob } from '../components/RotaryKnob.js';

/**
 * Module 03: Selected Track Sample Engine, Insert FX & Master Bus Sends
 */
export class TrackFxModule {
  constructor(app, audio) {
    this.app = app;
    this.audio = audio;
    this.knobControllers = {};
  }

  init() {
    this.buildKnobs();
    this.sync();
    this.syncMasterBusUI();
    this.bindEvents();
  }

  buildKnobs() {
    const container = document.getElementById('knobs-track');
    const tr = this.app.tracks[this.app.state.selectedTrack];

    this.knobControllers.pitch = new RotaryKnob(container, {
      label: 'PITCH', min: -12, max: 12, value: tr.pitch,
      format: (v) => `${v >= 0 ? '+' : ''}${Math.round(v)}st`,
      onChange: (v) => { this.app.tracks[this.app.state.selectedTrack].pitch = Math.round(v); }
    });
    this.knobControllers.decay = new RotaryKnob(container, {
      label: 'DECAY', min: 0.08, max: 1.0, value: tr.decay,
      format: (v) => `${Math.round(v * 100)}%`,
      onChange: (v) => { this.app.tracks[this.app.state.selectedTrack].decay = v; }
    });
    this.knobControllers.drive = new RotaryKnob(container, {
      label: 'DRIVE', min: 0, max: 1, value: tr.drive, color: '#ef4444',
      format: (v) => `${Math.round(v * 100)}%`,
      onChange: (v) => {
        const idx = this.app.state.selectedTrack;
        this.app.tracks[idx].drive = v;
        this.audio.updateTrackShaper(idx);
      }
    });
    this.knobControllers.crush = new RotaryKnob(container, {
      label: 'CRUSH', min: 0, max: 1, value: tr.crush, color: '#06b6d4',
      format: (v) => `${Math.round(v * 100)}%`,
      onChange: (v) => {
        const idx = this.app.state.selectedTrack;
        this.app.tracks[idx].crush = v;
        this.audio.updateTrackShaper(idx);
      }
    });
    this.knobControllers.delaySend = new RotaryKnob(container, {
      label: 'DELAY', min: 0, max: 1, value: tr.delaySend, color: '#10b981',
      format: (v) => `${Math.round(v * 100)}%`,
      onChange: (v) => {
        const idx = this.app.state.selectedTrack;
        this.app.tracks[idx].delaySend = v;
        this.audio.updateTrackDelaySend(idx, v);
      }
    });
    this.knobControllers.reverbSend = new RotaryKnob(container, {
      label: 'REVERB', min: 0, max: 1, value: tr.reverbSend, color: '#a855f7',
      format: (v) => `${Math.round(v * 100)}%`,
      onChange: (v) => {
        const idx = this.app.state.selectedTrack;
        this.app.tracks[idx].reverbSend = v;
        this.audio.updateTrackReverbSend(idx, v);
      }
    });
    this.knobControllers.volume = new RotaryKnob(container, {
      label: 'LEVEL', min: 0, max: 1, value: tr.volume,
      format: (v) => `${Math.round(v * 100)}%`,
      onChange: (v) => {
        const idx = this.app.state.selectedTrack;
        this.app.tracks[idx].volume = v;
        this.audio.updateTrackGain(idx, v);
      }
    });
  }

  sync() {
    const idx = this.app.state.selectedTrack;
    const tr = this.app.tracks[idx];
    const badge = document.getElementById('selected-track-badge');
    const lenVal = document.getElementById('track-len-val');

    if (badge) badge.textContent = `T${idx + 1}: ${tr.name}`;
    if (lenVal) lenVal.textContent = tr.length;

    this.updateTrackRevUI();

    Object.keys(this.knobControllers).forEach((k) => {
      if (tr[k] !== undefined) this.knobControllers[k].setValue(tr[k]);
    });
  }

  updateTrackRevUI() {
    const tr = this.app.tracks[this.app.state.selectedTrack];
    const led = document.getElementById('rev-led');
    if (led) led.className = tr.reverse ? 'led on-amber' : 'led';
  }

  syncMasterBusUI() {
    const fbPct = Math.round(this.app.state.masterDelayFb * 100);
    const revPct = Math.round(this.app.state.masterReverbMix * 100);
    const punchPct = Math.round(this.app.state.masterPunch * 100);

    const dSlider = document.getElementById('master-delay-fb');
    const dVal = document.getElementById('master-delay-val');
    const rSlider = document.getElementById('master-reverb-mix');
    const rVal = document.getElementById('master-reverb-val');
    const pSlider = document.getElementById('master-punch');
    const pVal = document.getElementById('master-punch-val');
    const ckSlider = document.getElementById('master-comp-knee');
    const ckVal = document.getElementById('master-comp-knee-val');
    const crSlider = document.getElementById('master-comp-ratio');
    const crVal = document.getElementById('master-comp-ratio-val');
    const caSlider = document.getElementById('master-comp-attack');
    const caVal = document.getElementById('master-comp-attack-val');
    const crelSlider = document.getElementById('master-comp-release');
    const crelVal = document.getElementById('master-comp-release-val');
    
    if (dSlider) dSlider.value = fbPct;
    if (dVal) dVal.textContent = `${fbPct}%`;
    if (rSlider) rSlider.value = revPct;
    if (rVal) rVal.textContent = `${revPct}%`;
    if (pSlider) pSlider.value = punchPct;
    if (pVal) pVal.textContent = `${punchPct}%`;
    if (ckSlider) ckSlider.value = this.app.state.masterCompKnee;
    if (ckVal) ckVal.textContent = `${this.app.state.masterCompKnee}`;
    if (crSlider) crSlider.value = this.app.state.masterCompRatio;
    if (crVal) crVal.textContent = `${this.app.state.masterCompRatio}`;
    if (caSlider) caSlider.value = this.app.state.masterCompAttack;
    if (caVal) caVal.textContent = `${this.app.state.masterCompAttack}`;
    if (crelSlider) crelSlider.value = this.app.state.masterCompRelease;
    if (crelVal) crelVal.textContent = `${this.app.state.masterCompRelease}`;
  }

  bindEvents() {
    document.getElementById('len-dec').addEventListener('click', () => {
      const tr = this.app.tracks[this.app.state.selectedTrack];
      tr.length = Math.max(1, tr.length - 1);
      this.sync();
      this.app.modules.sequencer.renderStepGrid();
    });

    document.getElementById('len-inc').addEventListener('click', () => {
      const tr = this.app.tracks[this.app.state.selectedTrack];
      tr.length = Math.min(MAX_STEPS, tr.length + 1);
      this.sync();
      this.app.modules.sequencer.renderStepGrid();
    });

    document.getElementById('btn-track-reverse').addEventListener('click', () => {
      const tr = this.app.tracks[this.app.state.selectedTrack];
      tr.reverse = !tr.reverse;
      this.updateTrackRevUI();
    });

    document.getElementById('btn-audition-track').addEventListener('click', async () => {
      await this.audio.auditionTrack(this.app.state.selectedTrack, 0.95);
    });

    document.getElementById('master-delay-fb').addEventListener('input', (e) => {
      const val = Number(e.target.value);
      this.app.state.masterDelayFb = val / 100;
      document.getElementById('master-delay-val').textContent = `${val}%`;
      this.audio.setMasterDelayFb(this.app.state.masterDelayFb);
    });

    document.getElementById('master-reverb-mix').addEventListener('input', (e) => {
      const val = Number(e.target.value);
      this.app.state.masterReverbMix = val / 100;
      document.getElementById('master-reverb-val').textContent = `${val}%`;
      this.audio.setMasterReverbMix(this.app.state.masterReverbMix);
    });

    document.getElementById('master-punch').addEventListener('input', (e) => {
      const val = Number(e.target.value);
      this.app.state.masterPunch = val / 100;
      document.getElementById('master-punch-val').textContent = `${val}%`;
      this.audio.setMasterPunch(this.app.state.masterPunch);
    });
    
    document.getElementById('master-comp-knee').addEventListener('input', (e) => {
      const val = Number(e.target.value);
      this.app.state.masterCompKnee = val;
      document.getElementById('master-comp-knee-val').textContent = `${val}`;
      this.audio.setMasterCompKnee(this.app.state.masterCompKnee);
    });
    
    document.getElementById('master-comp-ratio').addEventListener('input', (e) => {
      const val = Number(e.target.value);
      this.app.state.masterCompRatio = val;
      document.getElementById('master-comp-ratio-val').textContent = `${val}`;
      this.audio.setMasterCompRatio(this.app.state.masterCompRatio);
    });
    
    document.getElementById('master-comp-attack').addEventListener('input', (e) => {
      const val = Number(e.target.value);
      this.app.state.masterCompAttack = val;
      document.getElementById('master-comp-attack-val').textContent = `${val}`;
      this.audio.setMasterCompAttack(this.app.state.masterCompAttack);
    });
    
    document.getElementById('master-comp-release').addEventListener('input', (e) => {
      const val = Number(e.target.value);
      this.app.state.masterCompRelease = val;
      document.getElementById('master-comp-release-val').textContent = `${val}`;
      this.audio.setMasterCompRelease(this.app.state.masterCompRelease);
    });
  }
}
