import {
  MAX_STEPS,
  STORAGE_KEY_PATTERNS,
  STORAGE_KEY_KITS,
  DEFAULT_ANALOG_VOICE_PARAMS,
  VOICE_RECIPES,
  BREAK_PATTERNS,
  KIT_PRESETS,
  createEmptyStep,
  createInitialTracks,
  createInitialAppState
} from './constants.js';
import { AudioGraph } from './AudioGraph.js';
import { Oscilloscope } from './components/Oscilloscope.js';
import { SequencerModule } from './modules/SequencerModule.js';
import { AnalogVoiceModule } from './modules/AnalogVoiceModule.js';
import { TrackFxModule } from './modules/TrackFxModule.js';
import { FillsModule } from './modules/FillsModule.js';

/**
 * Core Application Controller: owns shared state, top bar, 6-track strip,
 * preset/kit storage, modals/toasts, and coordinates AudioGraph + tab modules.
 */
export class App {
  constructor() {
    this.state = createInitialAppState();
    this.tracks = createInitialTracks();
    this.analogVoiceParams = { ...DEFAULT_ANALOG_VOICE_PARAMS };

    this.userPatterns = {};
    this.userKits = {};

    this.trackCardRefs = [];
    this.trackLedTimers = [0, 0, 0, 0, 0, 0];
    this.toastTimer = null;
    this.saveModalCallback = null;

    this.audio = new AudioGraph({
      state: this.state,
      tracks: this.tracks,
      callbacks: {
        onStep: (stepIdx) => this.modules.sequencer.updatePlayhead(stepIdx),
        onTrackHit: (trackIdx) => this.pulseTrackLed(trackIdx),
        onActivity: () => this.scope.wake(),
        onStatusChange: (text, ledClass) => this.setAudioStatus(text, ledClass),
        onAudioReady: () => {
          this.drawAllTrackWaveforms();
          this.scope.init();
          this.scope.wake();
        }
      }
    });

    this.scope = new Oscilloscope({
      canvasId: 'master-scope',
      getWaveform: () => this.audio.getWaveform(),
      isPlaying: () => this.state.isPlaying,
      isAudioReady: () => this.state.audioReady
    });

    this.modules = {
      sequencer: new SequencerModule(this, this.audio),
      voice: new AnalogVoiceModule(this, this.audio),
      fx: new TrackFxModule(this, this.audio),
      fills: new FillsModule(this, this.audio)
    };
  }

  init() {
    this.initTrackCards();

    // Initialize all tab modules
    this.modules.sequencer.init();
    this.modules.voice.init();
    this.modules.fx.init();
    this.modules.fills.init();

    this.loadUserStorage();
    this.loadKitPreset('classic', false);
    this.loadBreakPattern('electro');
    this.selectTrack(0);
    this.switchTab('sequencer');
    this.scope.init();
    this.bindEvents();
  }

  // ---------------------------------------------------------------------------
  // Toast, Save Modal & Status Helpers
  // ---------------------------------------------------------------------------

  showToast(message, ledType = 'on-amber') {
    const toast = document.getElementById('toast');
    const dot = document.getElementById('toast-dot');
    const text = document.getElementById('toast-text');
    if (!toast || !dot || !text) return;

    text.textContent = message;
    dot.className = `led ${ledType}`;
    toast.classList.remove('opacity-0', 'translate-y-2');
    toast.classList.add('opacity-100', 'translate-y-0');

    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      toast.classList.remove('opacity-100', 'translate-y-0');
    }, 2100);
  }

  openSaveModal(title, defaultValue, onConfirm) {
    const modal = document.getElementById('save-modal');
    const titleEl = document.getElementById('save-modal-title');
    const inputEl = document.getElementById('save-modal-input');
    if (!modal || !titleEl || !inputEl) return;

    titleEl.textContent = title;
    inputEl.value = defaultValue || '';
    this.saveModalCallback = onConfirm;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
      inputEl.focus();
      inputEl.select();
    }, 20);
  }

  closeSaveModal() {
    const modal = document.getElementById('save-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    this.saveModalCallback = null;
  }

  setAudioStatus(text, ledClass) {
    const led = document.getElementById('audio-led');
    const label = document.getElementById('audio-status-text');
    if (led) led.className = `led ${ledClass || ''}`;
    if (label) label.textContent = text;
  }

  // ---------------------------------------------------------------------------
  // Persistent 6-Track Strip & Waveforms
  // ---------------------------------------------------------------------------

  initTrackCards() {
    const grid = document.getElementById('tracks-grid');
    grid.innerHTML = '';
    this.trackCardRefs.length = 0;

    this.tracks.forEach((tr, idx) => {
      const card = document.createElement('div');
      card.id = `track-card-${idx}`;

      const header = document.createElement('div');
      header.className = 'flex items-center justify-between gap-1 mb-1.5';

      const left = document.createElement('div');
      left.className = 'flex items-center gap-1.5 min-w-0';

      const ledEl = document.createElement('span');
      ledEl.id = `track-led-${idx}`;
      ledEl.className = 'led shrink-0';

      const titleEl = document.createElement('span');
      titleEl.textContent = `T${idx + 1} ${tr.name}`;

      left.appendChild(ledEl);
      left.appendChild(titleEl);

      const right = document.createElement('div');
      right.className = 'flex items-center gap-1 shrink-0';

      const muteBtn = document.createElement('button');
      muteBtn.dataset.mute = String(idx);
      muteBtn.textContent = 'M';

      const soloBtn = document.createElement('button');
      soloBtn.dataset.solo = String(idx);
      soloBtn.textContent = 'S';

      right.appendChild(muteBtn);
      right.appendChild(soloBtn);

      header.appendChild(left);
      header.appendChild(right);

      const canvasEl = document.createElement('canvas');
      canvasEl.id = `track-wave-${idx}`;
      canvasEl.className = 'w-full h-7 rounded bg-zinc-950/90 block';

      card.appendChild(header);
      card.appendChild(canvasEl);

      card.addEventListener('click', async (e) => {
        if (e.target.closest('[data-mute]')) {
          e.stopPropagation();
          tr.muted = !tr.muted;
          this.renderTrackCards();
          return;
        }
        if (e.target.closest('[data-solo]')) {
          e.stopPropagation();
          tr.solo = !tr.solo;
          this.renderTrackCards();
          return;
        }

        this.selectTrack(idx);
        await this.audio.auditionTrack(idx, 0.9);
      });

      grid.appendChild(card);
      this.trackCardRefs.push({ card, ledEl, titleEl, muteBtn, soloBtn, canvasEl });
    });

    this.renderTrackCards();
    this.drawAllTrackWaveforms();
  }

  renderTrackCards() {
    if (this.trackCardRefs.length === 0) {
      this.initTrackCards();
      return;
    }

    this.tracks.forEach((tr, idx) => {
      const ref = this.trackCardRefs[idx];
      const isSelected = idx === this.state.selectedTrack;

      ref.card.className = `rounded-lg p-2 cursor-pointer transition border ${
        isSelected
          ? 'bg-zinc-800/90 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.18)]'
          : 'hw-inset border-zinc-800 hover:border-zinc-600'
      }`;
      ref.titleEl.className = `font-mono-tech text-[10px] font-bold truncate ${
        isSelected ? 'text-amber-400' : 'text-zinc-200'
      }`;
      ref.muteBtn.className = `px-1.5 py-0.5 rounded font-mono-tech text-[9px] font-bold border cursor-pointer ${
        tr.muted ? 'bg-red-500/80 text-white border-red-400' : 'bg-zinc-900 text-zinc-400 border-zinc-700'
      }`;
      ref.soloBtn.className = `px-1.5 py-0.5 rounded font-mono-tech text-[9px] font-bold border cursor-pointer ${
        tr.solo ? 'bg-amber-500 text-zinc-950 border-amber-300' : 'bg-zinc-900 text-zinc-400 border-zinc-700'
      }`;
    });
  }

  pulseTrackLed(trackIndex) {
    const ref = this.trackCardRefs[trackIndex];
    const led = ref ? ref.ledEl : document.getElementById(`track-led-${trackIndex}`);
    if (!led) return;
    led.classList.add('on-amber');
    clearTimeout(this.trackLedTimers[trackIndex]);
    this.trackLedTimers[trackIndex] = setTimeout(() => {
      led.classList.remove('on-amber');
    }, 90);
  }

  flashTrackCard(trackIndex) {
    const ref = this.trackCardRefs[trackIndex];
    const card = ref ? ref.card : document.getElementById(`track-card-${trackIndex}`);
    if (!card) return;
    card.classList.remove('capture-flash');
    void card.offsetWidth;
    card.classList.add('capture-flash');
  }

  drawTrackWaveform(idx) {
    const ref = this.trackCardRefs[idx];
    const canvas = ref ? ref.canvasEl : document.getElementById(`track-wave-${idx}`);
    const tr = this.tracks[idx];
    if (!canvas) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(80, Math.floor(rect.width || 120));
    const h = Math.max(24, Math.floor(rect.height || 28));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    if (!tr.buffer) return;

    const data = tr.buffer.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / w));
    ctx.strokeStyle = tr.color;
    ctx.lineWidth = 1.25;
    ctx.beginPath();

    for (let x = 0; x < w; x++) {
      let min = 1, max = -1;
      const start = x * step;
      for (let j = 0; j < step && start + j < data.length; j++) {
        const v = data[start + j];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const y1 = ((1 - max) / 2) * h;
      const y2 = ((1 - min) / 2) * h;
      ctx.moveTo(x, y1);
      ctx.lineTo(x, Math.max(y1 + 1, y2));
    }
    ctx.stroke();
  }

  drawAllTrackWaveforms() {
    this.tracks.forEach((_, idx) => this.drawTrackWaveform(idx));
  }

  selectTrack(idx) {
    this.state.selectedTrack = idx;
    this.renderTrackCards();
    this.modules.sequencer.sync();
    this.modules.fx.sync();
    this.modules.voice.syncCaptureLabel();
  }

  switchTab(tabName) {
    this.state.activeTab = tabName;
    const tabs = ['sequencer', 'voice', 'fx', 'fills'];
    tabs.forEach((name) => {
      const panel = document.getElementById(`panel-${name}`);
      const btn = document.getElementById(`tab-${name}`);
      const led = document.getElementById(`tab-led-${name}`);
      const isActive = name === tabName;

      if (panel) panel.classList.toggle('hidden', !isActive);
      if (btn) {
        btn.classList.toggle('tab-active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
      }
      if (led) {
        led.className = isActive ? 'led on-amber' : 'led';
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Breakbeat Pattern & Analog Kit Presets (+ LocalStorage)
  // ---------------------------------------------------------------------------

  loadUserStorage() {
    try {
      this.userPatterns = JSON.parse(localStorage.getItem(STORAGE_KEY_PATTERNS) || '{}') || {};
    } catch (_) {
      this.userPatterns = {};
    }
    try {
      this.userKits = JSON.parse(localStorage.getItem(STORAGE_KEY_KITS) || '{}') || {};
    } catch (_) {
      this.userKits = {};
    }
    this.refreshUserPresetSelects();
  }

  persistUserStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_PATTERNS, JSON.stringify(this.userPatterns));
      localStorage.setItem(STORAGE_KEY_KITS, JSON.stringify(this.userKits));
    } catch (err) {
      console.error('LocalStorage save failed:', err);
    }
  }

  refreshUserPresetSelects() {
    const pGroup = document.getElementById('user-patterns-group');
    const pSelect = document.getElementById('preset-select');
    if (pGroup && pSelect) {
      const current = pSelect.value;
      pGroup.innerHTML = '';
      Object.entries(this.userPatterns).forEach(([key, pat]) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = `★ ${pat.name} (${pat.bpm})`;
        pGroup.appendChild(opt);
      });
      if (current && pSelect.querySelector(`option[value="${CSS.escape(current)}"]`)) {
        pSelect.value = current;
      }
      this.updateDeleteBtnVisibility();
    }

    const kGroup = document.getElementById('user-kits-group');
    const kSelect = document.getElementById('kit-select');
    if (kGroup && kSelect) {
      const current = kSelect.value;
      kGroup.innerHTML = '';
      Object.entries(this.userKits).forEach(([key, kit]) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = `★ ${kit.name}`;
        kGroup.appendChild(opt);
      });
      if (current && kSelect.querySelector(`option[value="${CSS.escape(current)}"]`)) {
        kSelect.value = current;
      }
      this.updateDeleteBtnVisibility();
    }
  }

  updateDeleteBtnVisibility() {
    const pSelect = document.getElementById('preset-select');
    const pDel = document.getElementById('btn-del-pattern');
    if (pSelect && pDel) {
      pDel.classList.toggle('hidden', !pSelect.value.startsWith('user_'));
    }
    const kSelect = document.getElementById('kit-select');
    const kDel = document.getElementById('btn-del-kit');
    if (kSelect && kDel) {
      kDel.classList.toggle('hidden', !kSelect.value.startsWith('user_'));
    }
  }

  serializeCurrentPattern(name) {
    return {
      name,
      bpm: this.state.bpm,
      swing: this.state.swing,
      lengths: this.tracks.map((tr) => tr.length),
      tracks: this.tracks.map((tr) => {
        const hits = [];
        tr.steps.forEach((st, idx) => {
          if (!st.active) return;
          hits.push({
            s: idx,
            v: Number(st.velocity.toFixed(2)),
            r: st.ratchet,
            p: st.pitch,
            pr: st.prob,
            m: st.micro,
            rev: st.reverse
          });
        });
        return hits;
      })
    };
  }

  serializeCurrentKit(name) {
    return {
      name,
      master: {
        delayFb: this.state.masterDelayFb,
        reverbMix: this.state.masterReverbMix,
        punch: this.state.masterPunch
      },
      voiceParams: this.tracks.map((tr) => ({ ...(tr.voiceParams || VOICE_RECIPES[tr.recipe] || VOICE_RECIPES.kick) })),
      fx: this.tracks.map((tr) => ({
        pitch: tr.pitch,
        decay: tr.decay,
        reverse: tr.reverse,
        drive: tr.drive,
        crush: tr.crush,
        delaySend: tr.delaySend,
        reverbSend: tr.reverbSend,
        volume: tr.volume
      }))
    };
  }

  applyPatternData(config) {
    this.state.bpm = config.bpm;
    this.state.swing = config.swing;

    const bpmInput = document.getElementById('bpm-input');
    const swingSlider = document.getElementById('swing-slider');
    const swingVal = document.getElementById('swing-val');
    if (bpmInput) bpmInput.value = config.bpm;
    if (swingSlider) swingSlider.value = Math.round(config.swing * 100);
    if (swingVal) swingVal.textContent = `${Math.round(config.swing * 100)}%`;

    this.audio.setBpm(this.state.bpm);
    this.audio.setSwing(this.state.swing);

    this.tracks.forEach((tr, tIdx) => {
      tr.length = config.lengths ? config.lengths[tIdx] : 16;
      tr.steps = Array.from({ length: MAX_STEPS }, createEmptyStep);
      const hitList = config.tracks[tIdx] || [];
      hitList.forEach((h) => {
        const idx = typeof h === 'number' ? h : h.s;
        if (idx >= 0 && idx < MAX_STEPS) {
          tr.steps[idx].active = true;
          if (typeof h === 'object') {
            if (h.v !== undefined) tr.steps[idx].velocity = h.v;
            if (h.r !== undefined) tr.steps[idx].ratchet = h.r;
            if (h.p !== undefined) tr.steps[idx].pitch = h.p;
            if (h.pr !== undefined) tr.steps[idx].prob = h.pr;
            if (h.m !== undefined) tr.steps[idx].micro = h.m;
            if (h.rev !== undefined) tr.steps[idx].reverse = h.rev;
          }
        }
      });
    });

    this.modules.sequencer.sync();
    this.modules.fx.sync();
  }

  loadBreakPattern(name) {
    const cfg = name.startsWith('user_')
      ? (this.userPatterns[name] || BREAK_PATTERNS.electro)
      : (BREAK_PATTERNS[name] || BREAK_PATTERNS.electro);
    this.applyPatternData(cfg);
    this.updateDeleteBtnVisibility();
  }

  async loadKitPreset(kitKey, bakeAudio = true) {
    const isUser = kitKey.startsWith('user_') && this.userKits[kitKey];
    const kit = isUser ? this.userKits[kitKey] : (KIT_PRESETS[kitKey] || KIT_PRESETS.classic);

    this.state.activeKit = kitKey;
    this.state.masterDelayFb = kit.master.delayFb;
    this.state.masterReverbMix = kit.master.reverbMix;
    this.state.masterPunch = kit.master.punch;

    this.tracks.forEach((tr, idx) => {
      if (isUser && kit.voiceParams && kit.voiceParams[idx]) {
        tr.voiceParams = { ...kit.voiceParams[idx] };
      } else {
        tr.recipe = (kit.recipes && kit.recipes[idx]) || tr.recipe;
        tr.voiceParams = { ...(VOICE_RECIPES[tr.recipe] || VOICE_RECIPES.kick) };
      }

      const fx = kit.fx[idx];
      if (fx) {
        tr.pitch = fx.pitch;
        tr.decay = fx.decay;
        tr.reverse = Boolean(fx.reverse);
        tr.drive = fx.drive;
        tr.crush = fx.crush;
        tr.delaySend = fx.delaySend;
        tr.reverbSend = fx.reverbSend;
        tr.volume = fx.volume;
      }
    });

    this.audio.applyKitAudioParams(kit);

    const selTr = this.tracks[this.state.selectedTrack];
    const selVoice = selTr.voiceParams || VOICE_RECIPES[selTr.recipe];
    if (selVoice) {
      Object.assign(this.analogVoiceParams, selVoice);
      this.modules.voice.sync();
    }
    this.modules.fx.sync();
    this.modules.fx.syncMasterBusUI();
    this.updateDeleteBtnVisibility();

    if (bakeAudio) {
      const wasReady = this.state.audioReady;
      await this.audio.ensureReady();
      if (wasReady) {
        await this.audio.bakeAllTrackBuffers();
        this.drawAllTrackWaveforms();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Top-Level & Global Event Bindings
  // ---------------------------------------------------------------------------

  bindEvents() {
    // Save Modal
    const saveModalInput = document.getElementById('save-modal-input');
    const submitSaveModal = () => {
      const name = (saveModalInput.value || '').trim();
      if (!name) {
        this.showToast('Please enter a preset name', 'on-red');
        return;
      }
      const cb = this.saveModalCallback;
      this.closeSaveModal();
      if (cb) cb(name);
    };

    document.getElementById('save-modal-confirm').addEventListener('click', submitSaveModal);
    document.getElementById('save-modal-cancel').addEventListener('click', () => this.closeSaveModal());
    document.getElementById('save-modal-close').addEventListener('click', () => this.closeSaveModal());
    saveModalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitSaveModal();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.closeSaveModal();
      }
    });

    // Transport Play / Stop
    const btnPlay = document.getElementById('btn-play');
    const playLabel = document.getElementById('play-label');
    const playIcon = document.getElementById('play-icon');

    btnPlay.addEventListener('click', async () => {
      if (!this.state.isPlaying) {
        await this.audio.startTransport();
        playLabel.textContent = 'STOP';
        playIcon.innerHTML = '<rect x="5" y="5" width="14" height="14" rx="2"></rect>';
        btnPlay.classList.remove('hw-btn-amber');
        btnPlay.classList.add('hw-btn-red');
      } else {
        this.audio.stopTransport();
        this.modules.sequencer.updatePlayhead(-1);
        playLabel.textContent = 'PLAY';
        playIcon.innerHTML = '<polygon points="6,4 20,12 6,20"></polygon>';
        btnPlay.classList.remove('hw-btn-red');
        btnPlay.classList.add('hw-btn-amber');
      }
    });

    // Keyboard shortcuts: Space (Play/Stop), 1/2/3/4 (Module Tabs)
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        btnPlay.click();
      } else if (e.key === '1') {
        this.switchTab('sequencer');
      } else if (e.key === '2') {
        this.switchTab('voice');
      } else if (e.key === '3') {
        this.switchTab('fx');
      } else if (e.key === '4') {
        this.switchTab('fills');
      }
    });

    // Module Tab Navigation
    document.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // BPM Controls
    const bpmInput = document.getElementById('bpm-input');
    const updateBpm = (val) => {
      const clamped = Math.max(70, Math.min(200, Math.round(val)));
      this.state.bpm = clamped;
      bpmInput.value = clamped;
      this.audio.setBpm(clamped);
    };
    bpmInput.addEventListener('change', () => updateBpm(Number(bpmInput.value)));
    document.getElementById('bpm-dec').addEventListener('click', () => updateBpm(this.state.bpm - 2));
    document.getElementById('bpm-inc').addEventListener('click', () => updateBpm(this.state.bpm + 2));

    // Swing Control
    const swingSlider = document.getElementById('swing-slider');
    const swingVal = document.getElementById('swing-val');
    swingSlider.addEventListener('input', () => {
      const pct = Number(swingSlider.value);
      this.state.swing = pct / 100;
      swingVal.textContent = `${pct}%`;
      this.audio.setSwing(this.state.swing);
    });

    // Breakbeat Pattern Selector + Save/Delete
    const presetSelect = document.getElementById('preset-select');
    presetSelect.addEventListener('change', (e) => {
      this.loadBreakPattern(e.target.value);
      this.showToast(`Loaded breakbeat: ${e.target.options[e.target.selectedIndex].text}`, 'on-amber');
    });

    document.getElementById('btn-save-pattern').addEventListener('click', () => {
      const existingKey = presetSelect.value;
      const defaultName = existingKey.startsWith('user_') && this.userPatterns[existingKey]
        ? this.userPatterns[existingKey].name
        : `Break ${Object.keys(this.userPatterns).length + 1}`;
      this.openSaveModal('SAVE SEQUENCE PRESET', defaultName, (name) => {
        const key = `user_pat_${Date.now()}`;
        this.userPatterns[key] = this.serializeCurrentPattern(name);
        this.persistUserStorage();
        this.refreshUserPresetSelects();
        presetSelect.value = key;
        this.updateDeleteBtnVisibility();
        this.showToast(`Saved sequence: ${name}`, 'on-amber');
      });
    });

    document.getElementById('btn-del-pattern').addEventListener('click', () => {
      const key = presetSelect.value;
      if (!key.startsWith('user_') || !this.userPatterns[key]) return;
      const deletedName = this.userPatterns[key].name;
      delete this.userPatterns[key];
      this.persistUserStorage();
      presetSelect.value = 'electro';
      this.refreshUserPresetSelects();
      this.loadBreakPattern('electro');
      this.showToast(`Deleted sequence: ${deletedName}`, 'on-red');
    });

    // Analog Kit Preset Selector + Save/Delete
    const kitSelect = document.getElementById('kit-select');
    kitSelect.addEventListener('change', async (e) => {
      const label = e.target.options[e.target.selectedIndex].text;
      await this.loadKitPreset(e.target.value, true);
      await this.audio.auditionTrack(this.state.selectedTrack, 0.9);
      this.showToast(`Baked ${label}`, 'on-cyan');
    });

    document.getElementById('btn-save-kit').addEventListener('click', () => {
      const existingKey = kitSelect.value;
      const defaultName = existingKey.startsWith('user_') && this.userKits[existingKey]
        ? this.userKits[existingKey].name
        : `Custom Kit ${Object.keys(this.userKits).length + 1}`;
      this.openSaveModal('SAVE DRUM KIT', defaultName, (name) => {
        const key = `user_kit_${Date.now()}`;
        this.userKits[key] = this.serializeCurrentKit(name);
        this.persistUserStorage();
        this.refreshUserPresetSelects();
        kitSelect.value = key;
        this.updateDeleteBtnVisibility();
        this.showToast(`Saved drum kit: ${name}`, 'on-cyan');
      });
    });

    document.getElementById('btn-del-kit').addEventListener('click', async () => {
      const key = kitSelect.value;
      if (!key.startsWith('user_') || !this.userKits[key]) return;
      const deletedName = this.userKits[key].name;
      delete this.userKits[key];
      this.persistUserStorage();
      kitSelect.value = 'classic';
      this.refreshUserPresetSelects();
      await this.loadKitPreset('classic', this.state.audioReady);
      this.showToast(`Deleted drum kit: ${deletedName}`, 'on-red');
    });

    // Global momentary hold releases (Hold Fill + All-Channel Hold Roll)
    const releaseMomentaryControls = () => {
      this.modules.sequencer.setFillActive(false);
      this.modules.fills.releaseHoldRoll();
    };
    window.addEventListener('pointerup', releaseMomentaryControls);
    window.addEventListener('pointercancel', releaseMomentaryControls);

    // Debounced mini-waveform & scope redraw on resize
    let resizeRaf = 0;
    window.addEventListener('resize', () => {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        this.drawAllTrackWaveforms();
        this.scope.syncDimensions();
      });
    });
  }
}
