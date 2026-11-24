import { MAX_STEPS, createEmptyStep } from '../constants.js';

/**
 * Module 01: 16-Step Breakbeat Sequencer & P-Lock / Ratchet Inspector
 */
export class SequencerModule {
  constructor(app, audio) {
    this.app = app;
    this.audio = audio;
    this.stepPadRefs = [];
  }

  init() {
    this.initStepGrid();
    this.bindEvents();
  }

  sync() {
    this.renderStepGrid();
    this.syncPlockInspector();
  }

  initStepGrid() {
    const grid = document.getElementById('step-grid');
    grid.innerHTML = '';
    this.stepPadRefs.length = 0;

    for (let i = 0; i < MAX_STEPS; i++) {
      const isBeat = i % 4 === 0;
      const pad = document.createElement('button');
      pad.type = 'button';

      const topRow = document.createElement('div');
      topRow.className = 'w-full flex items-center justify-between';

      const numEl = document.createElement('span');
      numEl.className = `font-mono-tech text-[9px] ${isBeat ? 'text-zinc-300 font-bold' : 'text-zinc-500'}`;
      numEl.textContent = String(i + 1).padStart(2, '0');

      const ledEl = document.createElement('span');
      ledEl.className = 'led';

      topRow.appendChild(numEl);
      topRow.appendChild(ledEl);

      const tagEl = document.createElement('div');
      tagEl.className = 'font-mono-tech text-[9px] font-bold text-zinc-500';

      const barWrap = document.createElement('div');
      barWrap.className = 'w-full h-1 rounded-full bg-zinc-900 overflow-hidden';

      const barEl = document.createElement('div');
      barEl.className = 'h-full bg-transparent';
      barWrap.appendChild(barEl);

      pad.appendChild(topRow);
      pad.appendChild(tagEl);
      pad.appendChild(barWrap);

      pad.addEventListener('click', () => {
        const prevSel = this.app.state.selectedStep;
        this.app.state.selectedStep = i;
        const tr = this.app.tracks[this.app.state.selectedTrack];
        if (this.app.state.seqMode === 'trig') {
          tr.steps[i].active = !tr.steps[i].active;
        }
        if (prevSel !== i) this.updateStepPadUI(prevSel);
        this.updateStepPadUI(i);
        this.syncPlockInspector();
      });

      pad.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const prevSel = this.app.state.selectedStep;
        this.app.state.selectedStep = i;
        if (prevSel !== i) this.updateStepPadUI(prevSel);
        this.updateStepPadUI(i);
        this.syncPlockInspector();
      });

      grid.appendChild(pad);
      this.stepPadRefs.push({ pad, ledEl, tagEl, barEl, isBeat });
    }
  }

  updateStepPadUI(i) {
    const ref = this.stepPadRefs[i];
    if (!ref) return;

    const tr = this.app.tracks[this.app.state.selectedTrack];
    const st = tr.steps[i];
    const outOfRange = i >= tr.length;
    const isSelected = i === this.app.state.selectedStep;
    const hasPlock = st.ratchet > 1 || st.pitch !== 0 || st.prob < 100 || st.micro !== 0 || st.reverse;

    ref.pad.className = [
      'step-pad rounded-lg p-1.5 sm:p-2 flex flex-col justify-between items-center h-16 sm:h-20 cursor-pointer',
      ref.isBeat ? 'beat-marker' : '',
      st.active ? 'active' : '',
      outOfRange ? 'out-of-range' : '',
      isSelected ? 'selected-plock' : '',
      this.app.state.currentStep === i ? 'playing' : ''
    ].join(' ');

    ref.ledEl.className = `led ${st.active ? (hasPlock ? 'on-cyan' : 'on-amber') : ''}`;
    ref.tagEl.className = `font-mono-tech text-[9px] font-bold ${st.ratchet > 1 ? 'text-cyan-300' : 'text-zinc-500'}`;
    ref.tagEl.textContent = st.ratchet > 1 ? `${st.ratchet}x` : (st.reverse ? 'REV' : '');

    ref.barEl.className = `h-full ${st.active ? 'bg-amber-400' : 'bg-transparent'}`;
    ref.barEl.style.width = `${Math.round(st.velocity * 100)}%`;
  }

  renderStepGrid() {
    if (this.stepPadRefs.length === 0) this.initStepGrid();
    for (let i = 0; i < MAX_STEPS; i++) {
      this.updateStepPadUI(i);
    }
  }

  updatePlayhead(stepIdx) {
    const prev = this.app.state.currentStep;
    if (prev === stepIdx) return;
    if (prev >= 0 && this.stepPadRefs[prev]) {
      this.stepPadRefs[prev].pad.classList.remove('playing');
    }
    this.app.state.currentStep = stepIdx;
    if (stepIdx >= 0 && this.stepPadRefs[stepIdx]) {
      this.stepPadRefs[stepIdx].pad.classList.add('playing');
    }
  }

  syncPlockInspector() {
    const tr = this.app.tracks[this.app.state.selectedTrack];
    const st = tr.steps[this.app.state.selectedStep];

    document.getElementById('plock-title').textContent =
      `T${this.app.state.selectedTrack + 1} ${tr.name} // STEP ${String(this.app.state.selectedStep + 1).padStart(2, '0')} P-LOCK`;

    const badge = document.getElementById('plock-active-badge');
    badge.textContent = st.active ? 'ACTIVE' : 'OFF';
    badge.className = st.active
      ? 'font-mono-tech text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40'
      : 'font-mono-tech text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400';

    document.getElementById('pl-vel').value = Math.round(st.velocity * 100);
    document.getElementById('pl-vel-val').textContent = `${Math.round(st.velocity * 100)}%`;

    document.getElementById('pl-ratchet-val').textContent = `${st.ratchet}x`;
    document.querySelectorAll('.r-btn').forEach((btn) => {
      const active = Number(btn.dataset.r) === st.ratchet;
      btn.classList.toggle('hw-btn-amber', active);
    });

    document.getElementById('pl-pitch').value = st.pitch;
    document.getElementById('pl-pitch-val').textContent = `${st.pitch >= 0 ? '+' : ''}${st.pitch} st`;

    document.getElementById('pl-prob').value = st.prob;
    document.getElementById('pl-prob-val').textContent = `${st.prob}%`;

    document.getElementById('pl-micro').value = st.micro;
    document.getElementById('pl-micro-val').textContent = `${st.micro >= 0 ? '+' : ''}${st.micro} ms`;

    const revBtn = document.getElementById('pl-rev');
    revBtn.textContent = st.reverse ? 'REVERSED' : 'NORMAL';
    revBtn.classList.toggle('hw-btn-amber', st.reverse);
  }

  setFillActive(on) {
    this.app.state.fillActive = on;
    const fillLed = document.getElementById('fill-led');
    const btnFill = document.getElementById('btn-fill');
    if (fillLed) fillLed.className = on ? 'led on-cyan' : 'led';
    if (btnFill) btnFill.classList.toggle('pressed', on);
  }

  generateBreakVariation() {
    const idx = this.app.state.selectedTrack;
    const tr = this.app.tracks[idx];
    tr.steps.forEach((st, s) => {
      if (idx === 0) {
        st.active = s === 0 || (s % 2 === 0 && Math.random() < 0.28) || (s === 10 && Math.random() < 0.8);
        st.ratchet = st.active && Math.random() < 0.12 ? 2 : 1;
      } else if (idx === 1) {
        st.active = s === 4 || s === 12 || (s > 12 && Math.random() < 0.45);
        st.ratchet = st.active && s > 12 && Math.random() < 0.5 ? 2 : 1;
      } else {
        st.active = Math.random() < (idx === 3 ? 0.6 : 0.32);
        st.velocity = 0.45 + Math.random() * 0.55;
        st.ratchet = st.active && Math.random() < 0.2 ? (Math.random() < 0.5 ? 2 : 3) : 1;
        st.pitch = idx === 5 ? Math.floor(Math.random() * 11 - 5) : 0;
      }
    });
    this.sync();
    this.app.showToast(`Generated break variation for T${idx + 1} ${tr.name}`, 'on-amber');
  }

  clearSelectedTrack() {
    const idx = this.app.state.selectedTrack;
    const tr = this.app.tracks[idx];
    tr.steps = Array.from({ length: MAX_STEPS }, createEmptyStep);
    this.sync();
    this.app.showToast(`Cleared T${idx + 1} ${tr.name}`, 'on-red');
  }

  bindEvents() {
    const modeTrig = document.getElementById('mode-trig');
    const modePlock = document.getElementById('mode-plock');

    modeTrig.addEventListener('click', () => {
      this.app.state.seqMode = 'trig';
      modeTrig.className = 'px-2.5 py-1 rounded-md font-mono-tech text-[10px] font-bold bg-amber-500 text-zinc-950 transition cursor-pointer';
      modePlock.className = 'px-2.5 py-1 rounded-md font-mono-tech text-[10px] font-bold text-zinc-400 hover:text-white transition cursor-pointer';
    });

    modePlock.addEventListener('click', () => {
      this.app.state.seqMode = 'plock';
      modePlock.className = 'px-2.5 py-1 rounded-md font-mono-tech text-[10px] font-bold bg-cyan-400 text-zinc-950 transition cursor-pointer';
      modeTrig.className = 'px-2.5 py-1 rounded-md font-mono-tech text-[10px] font-bold text-zinc-400 hover:text-white transition cursor-pointer';
    });

    document.getElementById('btn-fill').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.setFillActive(true);
    });

    document.getElementById('btn-break-gen').addEventListener('click', () => this.generateBreakVariation());
    document.getElementById('btn-clear-track').addEventListener('click', () => this.clearSelectedTrack());

    const getSelStep = () => this.app.tracks[this.app.state.selectedTrack].steps[this.app.state.selectedStep];

    document.getElementById('pl-vel').addEventListener('input', (e) => {
      const st = getSelStep();
      st.velocity = Number(e.target.value) / 100;
      document.getElementById('pl-vel-val').textContent = `${e.target.value}%`;
      this.updateStepPadUI(this.app.state.selectedStep);
    });

    document.querySelectorAll('.r-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const st = getSelStep();
        st.ratchet = Number(btn.dataset.r);
        st.active = true;
        this.syncPlockInspector();
        this.updateStepPadUI(this.app.state.selectedStep);
      });
    });

    document.getElementById('pl-pitch').addEventListener('input', (e) => {
      const st = getSelStep();
      st.pitch = Number(e.target.value);
      document.getElementById('pl-pitch-val').textContent = `${st.pitch >= 0 ? '+' : ''}${st.pitch} st`;
      this.updateStepPadUI(this.app.state.selectedStep);
    });

    document.getElementById('pl-prob').addEventListener('input', (e) => {
      const st = getSelStep();
      st.prob = Number(e.target.value);
      document.getElementById('pl-prob-val').textContent = `${st.prob}%`;
      this.updateStepPadUI(this.app.state.selectedStep);
    });

    document.getElementById('pl-micro').addEventListener('input', (e) => {
      const st = getSelStep();
      st.micro = Number(e.target.value);
      document.getElementById('pl-micro-val').textContent = `${st.micro >= 0 ? '+' : ''}${st.micro} ms`;
      this.updateStepPadUI(this.app.state.selectedStep);
    });

    document.getElementById('pl-rev').addEventListener('click', () => {
      const st = getSelStep();
      st.reverse = !st.reverse;
      this.syncPlockInspector();
      this.updateStepPadUI(this.app.state.selectedStep);
    });

    document.getElementById('btn-reset-plock').addEventListener('click', () => {
      const st = getSelStep();
      st.velocity = 0.9;
      st.ratchet = 1;
      st.pitch = 0;
      st.prob = 100;
      st.micro = 0;
      st.reverse = false;
      this.syncPlockInspector();
      this.updateStepPadUI(this.app.state.selectedStep);
    });
  }
}
