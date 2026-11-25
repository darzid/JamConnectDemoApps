import { SHAPER_SAMPLES, VOICE_RECIPES } from './constants.js';

/**
 * AudioGraph // All Web Audio & Tone.js 15.1.22 DSP, Synthesis, Self-Sampling & Sequencer Clock.
 * Zero DOM dependencies: communicates visual updates back to App via callbacks.
 */
export class AudioGraph {
  constructor({ state, tracks, callbacks = {} }) {
    this.state = state;
    this.tracks = tracks;
    this.callbacks = callbacks;

    this.initPromise = null;
    this.cachedNoisePools = null;
    this.pendingShaperRaf = new Map();

    // Master & Send Bus Nodes
    this.masterBus = null;
    this.masterFilter = null;
    this.masterFilterDry = null;
    this.masterFilterWet = null;
    this.masterFilterOut = null;

    this.fillVerbSmall = null;
    this.fillVerbMed = null;
    this.fillVerbLarge = null;
    this.fillVerbSmallGain = null;
    this.fillVerbMedGain = null;
    this.fillVerbLargeGain = null;
    this.fillVerbDry = null;
    this.fillVerbWet = null;
    this.fillVerbOut = null;
    this.fillVerbDelay = null;

    this.masterDrive = null;
    this.masterCompressor = null;
    this.masterLimiter = null;
    this.masterWaveform = null;

    this.dubDelay = null;
    this.dubDelayReturn = null;
    this.roomReverb = null;
    this.roomReverbDamp = null;
    this.roomReverbReturn = null;

    this.seqLoop = null;
  }

  // ---------------------------------------------------------------------------
  // Low-level Web Audio Helpers
  // ---------------------------------------------------------------------------

  connectToDestination(srcNode, destination) {
    if (typeof AudioNode !== 'undefined' && destination instanceof AudioNode) {
      srcNode.connect(destination);
    } else {
      Tone.connect(srcNode, destination);
    }
  }

  getNoisePools(sampleRate) {
    if (this.cachedNoisePools && this.cachedNoisePools.sampleRate === sampleRate) {
      return this.cachedNoisePools;
    }
    const poolLen = Math.ceil(sampleRate * 1.25);
    const pinkPool = new Float32Array(poolLen);
    const bluePool = new Float32Array(poolLen);

    let b0 = 0, b1 = 0, b2 = 0, prevWhite = 0;
    for (let i = 0; i < poolLen; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.96300 * b1 + white * 0.2965164;
      b2 = 0.57000 * b2 + white * 1.0526913;
      pinkPool[i] = (b0 + b1 + b2 + white * 0.1848) * 0.22;
      bluePool[i] = (white - prevWhite) * 0.65;
      prevWhite = white;
    }

    this.cachedNoisePools = { sampleRate, poolLen, pinkPool, bluePool };
    return this.cachedNoisePools;
  }

  createNoiseBuffer(audioCtx, durationSec, colorAmount) {
    const sampleRate = audioCtx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * durationSec));
    const buffer = audioCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    const { poolLen, pinkPool, bluePool } = this.getNoisePools(sampleRate);
    const pinkWeight = 1 - colorAmount;
    const offset = Math.floor(Math.random() * poolLen);

    for (let i = 0; i < length; i++) {
      const idx = (offset + i) % poolLen;
      data[i] = pinkPool[idx] * pinkWeight + bluePool[idx] * colorAmount;
    }
    return buffer;
  }

  makeShaperCurve(driveAmt, crushAmt) {
    const samples = SHAPER_SAMPLES;
    const curve = new Float32Array(samples);
    const gain = 1 + driveAmt * 14;
    const quantSteps = crushAmt > 0.02 ? Math.max(3, Math.round(28 - crushAmt * 25)) : 0;
    const denom = samples - 1;

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / denom - 1;
      let y = Math.tanh(x * gain);
      if (quantSteps > 0) {
        y = Math.round(y * quantSteps) / quantSteps;
      }
      curve[i] = y;
    }
    return curve;
  }

  scheduleShaperCurveUpdate(key, shaperNode, getDrive, getCrush) {
    if (!shaperNode || this.pendingShaperRaf.has(key)) return;
    const rafId = requestAnimationFrame(() => {
      this.pendingShaperRaf.delete(key);
      shaperNode.curve = this.makeShaperCurve(getDrive(), getCrush());
    });
    this.pendingShaperRaf.set(key, rafId);
  }

  // ---------------------------------------------------------------------------
  // Analog Drum Voice Synthesis & Offline Self-Sampling
  // ---------------------------------------------------------------------------

  scheduleAnalogVoiceHit(audioCtx, destination, params, startTime = 0, isLive = false) {
    const t0 = Math.max(0, startTime);
    const vcoDur = Math.max(0.03, params.ampDec);
    const noiseDur = Math.max(0.02, params.noiseDec);
    const totalDur = Math.max(vcoDur, noiseDur, 0.08) + 0.06;

    if (isLive && this.callbacks.onActivity) {
      this.callbacks.onActivity();
    }

    const filter = audioCtx.createBiquadFilter();
    filter.type = params.filterMode || 'lowpass';
    filter.frequency.setValueAtTime(Math.max(60, Math.min(18000, params.cutoff)), t0);
    filter.Q.setValueAtTime(Math.max(0.4, Math.min(18, params.res)), t0);

    const voiceGain = audioCtx.createGain();
    voiceGain.gain.setValueAtTime(0.9, t0);
    filter.connect(voiceGain);
    this.connectToDestination(voiceGain, destination);

    // 1) VCO: Sine + Square crossfade with exponential pitch bend
    const sineOsc = audioCtx.createOscillator();
    const sqrOsc = audioCtx.createOscillator();
    sineOsc.type = 'sine';
    sqrOsc.type = 'square';

    const baseFreq = Math.max(24, params.pitch);
    const startFreq = Math.min(16000, baseFreq * (1 + params.bendAmt));
    const bendEnd = t0 + Math.max(0.008, params.bendDec);

    [sineOsc, sqrOsc].forEach((osc) => {
      osc.frequency.setValueAtTime(startFreq, t0);
      osc.frequency.exponentialRampToValueAtTime(baseFreq, bendEnd);
    });

    if (params.modDepth > 0.01) {
      const modOsc = audioCtx.createOscillator();
      const modGain = audioCtx.createGain();
      modOsc.type = 'triangle';
      modOsc.frequency.setValueAtTime(baseFreq * 1.414 + 95, t0);
      modGain.gain.setValueAtTime(params.modDepth * baseFreq * 3.8, t0);
      modGain.gain.exponentialRampToValueAtTime(0.01, t0 + vcoDur);
      modOsc.connect(modGain);
      modGain.connect(sineOsc.frequency);
      modGain.connect(sqrOsc.frequency);
      modOsc.start(t0);
      modOsc.stop(t0 + totalDur);
    }

    const sineGain = audioCtx.createGain();
    const sqrGain = audioCtx.createGain();
    const wave = Math.max(0, Math.min(1, params.wave));
    sineGain.gain.setValueAtTime(1 - wave * 0.72, t0);
    sqrGain.gain.setValueAtTime(wave * 0.52, t0);

    const vcoAmp = audioCtx.createGain();
    vcoAmp.gain.setValueAtTime(0.0001, t0);
    vcoAmp.gain.linearRampToValueAtTime(0.95, t0 + 0.002);
    vcoAmp.gain.exponentialRampToValueAtTime(0.0008, t0 + vcoDur);

    sineOsc.connect(sineGain);
    sqrOsc.connect(sqrGain);
    sineGain.connect(vcoAmp);
    sqrGain.connect(vcoAmp);
    vcoAmp.connect(filter);

    sineOsc.start(t0);
    sqrOsc.start(t0);
    sineOsc.stop(t0 + totalDur);
    sqrOsc.stop(t0 + totalDur);

    if (isLive) {
      sineOsc.onended = () => {
        try {
          filter.disconnect();
          voiceGain.disconnect();
        } catch (_) {}
      };
    }

    // 2) Noise Generator (Pink <-> Blue)
    if (params.noiseLvl > 0.005) {
      const noiseSrc = audioCtx.createBufferSource();
      noiseSrc.buffer = this.createNoiseBuffer(audioCtx, noiseDur + 0.05, params.noiseColor);

      const noiseAmp = audioCtx.createGain();
      noiseAmp.gain.setValueAtTime(0.0001, t0);
      noiseAmp.gain.linearRampToValueAtTime(params.noiseLvl * 0.9, t0 + 0.0015);
      noiseAmp.gain.exponentialRampToValueAtTime(0.0008, t0 + noiseDur);

      noiseSrc.connect(noiseAmp);
      noiseAmp.connect(filter);
      noiseSrc.start(t0);
      noiseSrc.stop(t0 + noiseDur + 0.04);
    }

    // 3) Transient Click Impulse
    if (params.click > 0.01) {
      const clickOsc = audioCtx.createOscillator();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(2800, t0);
      clickOsc.frequency.exponentialRampToValueAtTime(220, t0 + 0.008);

      const clickAmp = audioCtx.createGain();
      clickAmp.gain.setValueAtTime(params.click * 0.85, t0);
      clickAmp.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.01);

      clickOsc.connect(clickAmp);
      this.connectToDestination(clickAmp, destination);
      clickOsc.start(t0);
      clickOsc.stop(t0 + 0.014);

      if (isLive) {
        clickOsc.onended = () => {
          try { clickAmp.disconnect(); } catch (_) {}
        };
      }
    }
  }

  async auditionAnalogVoice(params) {
    await this.ensureReady();
    const rawCtx = Tone.getContext().rawContext;
    this.scheduleAnalogVoiceHit(rawCtx, this.masterBus, params, rawCtx.currentTime, true);
  }

  async renderAnalogVoiceToBuffer(params) {
    const sampleRate = Tone.getContext().sampleRate || 44100;
    const dur = Math.min(1.2, Math.max(params.ampDec, params.noiseDec, 0.12) + 0.08);
    const frameCount = Math.ceil(sampleRate * dur);

    const offlineCtx = new OfflineAudioContext(1, frameCount, sampleRate);
    this.scheduleAnalogVoiceHit(offlineCtx, offlineCtx.destination, params, 0, false);

    const rendered = await offlineCtx.startRendering();

    const ch = rendered.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < ch.length; i++) {
      const a = Math.abs(ch[i]);
      if (a > peak) peak = a;
    }
    if (peak > 0.001) {
      const scale = 0.92 / peak;
      for (let i = 0; i < ch.length; i++) {
        ch[i] = Math.tanh(ch[i] * scale * 1.15);
      }
    }

    return rendered;
  }

  createReversedBuffer(audioBuffer) {
    const rawCtx = Tone.getContext().rawContext;
    const rev = rawCtx.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      const src = audioBuffer.getChannelData(c);
      const dst = rev.getChannelData(c);
      for (let i = 0, len = src.length; i < len; i++) {
        dst[i] = src[len - 1 - i];
      }
    }
    return rev;
  }

  async captureAnalogVoiceToTrack(trackIndex, params) {
    await this.ensureReady();
    const tr = this.tracks[trackIndex];
    tr.voiceParams = { ...params };
    const buf = await this.renderAnalogVoiceToBuffer(params);
    tr.buffer = buf;
    tr.reversedBuffer = this.createReversedBuffer(buf);
    return buf;
  }

  async bakeAllTrackBuffers() {
    this._emitStatus('BAKING KIT...', 'on-amber');
    await Promise.all(
      this.tracks.map(async (tr) => {
        const recipe = tr.voiceParams || VOICE_RECIPES[tr.recipe] || VOICE_RECIPES.kick;
        const buf = await this.renderAnalogVoiceToBuffer(recipe);
        tr.buffer = buf;
        tr.reversedBuffer = this.createReversedBuffer(buf);
      })
    );
    this._emitStatus('LIVE', 'on-mint');
  }

  // ---------------------------------------------------------------------------
  // Audio Graph Initialization
  // ---------------------------------------------------------------------------

  async ensureReady() {
    const ctx = Tone.getContext();
    try {
      await Tone.start();
      if (ctx.state !== 'running') {
        await ctx.resume();
      }
    } catch (err) {
      console.error('AudioContext unlock failed:', err);
    }

    if (this.state.audioReady) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this._emitStatus('BAKING KIT...', 'on-amber');

      const transport = Tone.getTransport();
      transport.bpm.value = this.state.bpm;
      transport.swing = this.state.swing;
      transport.swingSubdivision = '16n';

      // Master Chain: MasterBus -> Master Fill Filter -> 8-Beat Fill Reverb -> Soft Drive -> Compressor -> Limiter -> Destination
      this.masterBus = new Tone.Gain(0.95);

      // 1) Master Mix Filter with click-free dry/wet bypass
      this.masterFilter = new Tone.Filter({
        type: this.state.fillFilterMode,
        frequency: this.state.fillFilterCutoff,
        Q: this.state.fillFilterQ
      });
      this.masterFilterDry = new Tone.Gain(this.state.fillFilterOn ? 0 : 1);
      this.masterFilterWet = new Tone.Gain(this.state.fillFilterOn ? 1 : 0);
      this.masterFilterOut = new Tone.Gain(1.0);

      this.masterBus.connect(this.masterFilterDry);
      this.masterFilterDry.connect(this.masterFilterOut);
      this.masterBus.connect(this.masterFilter);
      this.masterFilter.connect(this.masterFilterWet);
      this.masterFilterWet.connect(this.masterFilterOut);

      // 2) Master 8-Beat Expanding Room Reverb (3 pre-baked native convolvers)
      this.fillVerbSmall = new Tone.Reverb({ decay: 0.45, preDelay: 0.005, wet: 1.0 });
      this.fillVerbMed = new Tone.Reverb({ decay: 2.2, preDelay: 0.015, wet: 1.0 });
      this.fillVerbLarge = new Tone.Reverb({ decay: 6.5, preDelay: 0.030, wet: 1.0 });

      this.fillVerbSmallGain = new Tone.Gain(0);
      this.fillVerbMedGain = new Tone.Gain(0);
      this.fillVerbLargeGain = new Tone.Gain(0);
      this.fillVerbDry = new Tone.Gain(1.0);
      this.fillVerbWet = new Tone.Gain(0);
      this.fillVerbOut = new Tone.Gain(1.0);
      this.fillVerbDelay = new Tone.PingPongDelay({delayTime: "4n", wet: 0});

      this.masterFilterOut.connect(this.fillVerbDry);
      this.fillVerbDry.connect(this.fillVerbOut);

      this.masterFilterOut.connect(this.fillVerbSmall);
      this.fillVerbSmall.connect(this.fillVerbSmallGain);
      this.fillVerbSmallGain.connect(this.fillVerbWet);

      this.masterFilterOut.connect(this.fillVerbMed);
      this.fillVerbMed.connect(this.fillVerbMedGain);
      this.fillVerbMedGain.connect(this.fillVerbWet);

      this.masterFilterOut.connect(this.fillVerbLarge);
      this.fillVerbLarge.connect(this.fillVerbLargeGain);
      this.fillVerbLargeGain.connect(this.fillVerbWet);

      this.fillVerbWet.connect(this.fillVerbOut);
      
      this.fillVerbOut.connect(this.fillVerbDelay);
      
      // 3) Master Drive, Compression & Limiting
      this.masterDrive = new Tone.WaveShaper(this.makeShaperCurve(this.state.masterPunch * 0.55, 0), SHAPER_SAMPLES);
      this.masterDrive.oversample = '2x';
      this.masterCompressor = new Tone.Compressor({
        threshold: -16,
        ratio: this.state.masterCompRatio,
        attack: this.state.masterCompAttack,
        release: this.state.masterCompRelease,
        knee: this.state.masterCompKnee,
      });
      this.masterLimiter = new Tone.Limiter(-1.0);
      this.masterWaveform = new Tone.Waveform(128);

      this.fillVerbDelay.chain(this.masterDrive, this.masterCompressor, this.masterLimiter, Tone.getDestination());
      this.masterLimiter.connect(this.masterWaveform);

      // Global Send FX: Tempo-Synced Dub PingPong Delay & Native-Convolver Room Reverb
      this.dubDelay = new Tone.PingPongDelay({
        delayTime: Math.min(1.45, (60 / this.state.bpm) * 0.75),
        maxDelay: 1.5,
        feedback: this.state.masterDelayFb,
        wet: 1.0
      });
      this.dubDelayReturn = new Tone.Gain(0.45);
      this.dubDelay.connect(this.dubDelayReturn);
      this.dubDelayReturn.connect(this.masterBus);

      this.roomReverb = new Tone.Reverb({
        decay: 1.65,
        preDelay: 0.012,
        wet: 1.0
      });
      this.roomReverbDamp = new Tone.Filter({
        frequency: 3400,
        type: 'lowpass'
      });
      this.roomReverbReturn = new Tone.Gain(this.state.masterReverbMix);
      this.roomReverb.chain(this.roomReverbDamp, this.roomReverbReturn, this.masterBus);

      // Build per-track audio strips
      this.tracks.forEach((tr) => {
        const input = new Tone.Gain(1.0);
        const shaper = new Tone.WaveShaper(this.makeShaperCurve(tr.drive, tr.crush), SHAPER_SAMPLES);
        const vol = new Tone.Gain(tr.volume);
        const delaySend = new Tone.Gain(tr.delaySend);
        const reverbSend = new Tone.Gain(tr.reverbSend);

        input.connect(shaper);
        shaper.connect(vol);
        vol.connect(this.masterBus);

        vol.connect(delaySend);
        delaySend.connect(this.dubDelay);

        vol.connect(reverbSend);
        reverbSend.connect(this.roomReverb);

        tr.audioNodes = { input, shaper, vol, delaySend, reverbSend };
      });

      // Self-sample all 6 initial kit pieces + generate convolution IRs in parallel
      await Promise.all([
        this.roomReverb.ready,
        this.fillVerbSmall.ready,
        this.fillVerbMed.ready,
        this.fillVerbLarge.ready,
        ...this.tracks.map(async (tr) => {
          const recipe = tr.voiceParams || VOICE_RECIPES[tr.recipe] || VOICE_RECIPES.kick;
          const buf = await this.renderAnalogVoiceToBuffer(recipe);
          tr.buffer = buf;
          tr.reversedBuffer = this.createReversedBuffer(buf);
        })
      ]);

      // Main 16th-note sequencer clock
      this.seqLoop = new Tone.Loop((time) => {
        this.onSequencerStep(time);
      }, '16n');

      this.state.audioReady = true;
      this._emitStatus('LIVE', 'on-mint');
      if (this.callbacks.onAudioReady) this.callbacks.onAudioReady();
      if (this.callbacks.onActivity) this.callbacks.onActivity();
      return true;
    })();

    return this.initPromise;
  }

  // ---------------------------------------------------------------------------
  // Sample Triggering & Sequencer Clock
  // ---------------------------------------------------------------------------

  triggerTrackSample(trackIndex, time, opts = {}) {
    const tr = this.tracks[trackIndex];
    if (!tr || !tr.buffer || !tr.audioNodes) return;

    const rawCtx = Tone.getContext().rawContext;
    const t = Math.max(rawCtx.currentTime, time);

    // Closed Hat (T4 / idx 3) chokes Open Hat (T5 / idx 4)
    if (trackIndex === 3 && this.tracks[4].activeSource) {
      try {
        this.tracks[4].activeSource.gainNode.gain.cancelScheduledValues(t);
        this.tracks[4].activeSource.gainNode.gain.setTargetAtTime(0.0001, t, 0.006);
        this.tracks[4].activeSource.src.stop(t + 0.03);
      } catch (_) {}
      this.tracks[4].activeSource = null;
    }

    const useReverse = opts.reverse !== undefined ? opts.reverse : tr.reverse;
    const buf = useReverse && tr.reversedBuffer ? tr.reversedBuffer : tr.buffer;

    const src = rawCtx.createBufferSource();
    src.buffer = buf;

    const totalSemitones = tr.pitch + (opts.pitch || 0);
    const playbackRate = Math.pow(2, totalSemitones / 12);
    src.playbackRate.setValueAtTime(playbackRate, t);

    const envGain = rawCtx.createGain();
    const velocity = Math.max(0.05, Math.min(1.0, opts.velocity ?? 0.9));
    const effectiveDur = Math.max(0.025, (buf.duration / playbackRate) * tr.decay);

    envGain.gain.setValueAtTime(velocity, t);
    if (tr.decay < 0.98) {
      envGain.gain.setValueAtTime(velocity, t + effectiveDur * 0.65);
      envGain.gain.exponentialRampToValueAtTime(0.0008, t + effectiveDur);
    }

    src.connect(envGain);
    Tone.connect(envGain, tr.audioNodes.input);

    src.start(t);
    src.stop(t + effectiveDur + 0.02);

    const handle = { src, gainNode: envGain };
    tr.activeSource = handle;
    src.onended = () => {
      if (tr.activeSource === handle) tr.activeSource = null;
      try {
        src.disconnect();
        envGain.disconnect();
      } catch (_) {}
    };

    if (this.callbacks.onActivity) this.callbacks.onActivity();

    if (this.callbacks.onTrackHit) {
      Tone.getDraw().schedule(() => {
        this.callbacks.onTrackHit(trackIndex);
      }, time);
    }
  }

  async auditionTrack(trackIndex, velocity = 0.9) {
    await this.ensureReady();
    this.triggerTrackSample(trackIndex, Tone.getContext().rawContext.currentTime, { velocity });
  }

  onSequencerStep(time) {
    const globalStep = this.state.stepCounter;
    const stepDuration = 15 / this.state.bpm;
    const nowSec = Tone.getContext().rawContext.currentTime;
    const anySolo = this.tracks.some((t) => t.solo);
    const allRollsOn = this.state.allRollHold || this.state.allRollLatch;

    this.tracks.forEach((tr, idx) => {
      const audible = anySolo ? tr.solo : !tr.muted;
      if (!audible) return;

      // Fills Tab: Apply rolls across ALL audible channels
      if (allRollsOn) {
        const count = this.state.allRollRate;
        const subDur = stepDuration / count;
        const baseVel = idx === 0 ? 0.78 : 0.72;
        for (let r = 0; r < count; r++) {
          const vel = count === 1 ? baseVel : baseVel * (0.58 + 0.42 * (r / (count - 1)));
          const pitchLift = count > 1 ? r * 0.4 : 0;
          this.triggerTrackSample(idx, time + r * subDur, {
            velocity: vel,
            pitch: pitchLift
          });
        }
        return;
      }

      const trackStepIdx = globalStep % tr.length;
      const step = tr.steps[trackStepIdx];

      // Live HOLD FILL: injects energetic breakbeat snare/ghost/perc stutters
      if (this.state.fillActive) {
        if (idx === 1 && trackStepIdx % 2 === 0) {
          this.triggerTrackSample(idx, time, { velocity: 0.88, pitch: (trackStepIdx % 4) * 1.5 });
          this.triggerTrackSample(idx, time + stepDuration * 0.5, { velocity: 0.62, pitch: (trackStepIdx % 4) * 1.5 + 2 });
          return;
        }
        if (idx === 2 && trackStepIdx % 2 === 1) {
          this.triggerTrackSample(idx, time, { velocity: 0.72, pitch: -2 });
          return;
        }
        if (idx === 0 && trackStepIdx % 4 !== 0) return;
      }

      if (!step.active) return;
      if (step.prob < 100 && Math.random() * 100 > step.prob) return;

      const microSec = (step.micro || 0) / 1000;
      const baseTime = Math.max(nowSec, time + microSec);
      const ratchet = step.ratchet || 1;
      const stepReverse = step.reverse ? !tr.reverse : tr.reverse;

      if (ratchet === 1) {
        this.triggerTrackSample(idx, baseTime, {
          velocity: step.velocity,
          pitch: step.pitch,
          reverse: stepReverse
        });
      } else {
        const subDur = stepDuration / ratchet;
        for (let r = 0; r < ratchet; r++) {
          const rampVel = step.velocity * (0.65 + 0.35 * (r / (ratchet - 1)));
          const rampPitch = step.pitch + r * 0.5;
          this.triggerTrackSample(idx, baseTime + r * subDur, {
            velocity: rampVel,
            pitch: rampPitch,
            reverse: stepReverse
          });
        }
      }
    });

    const activeTrackStep = globalStep % this.tracks[this.state.selectedTrack].length;
    if (this.callbacks.onStep) {
      Tone.getDraw().schedule(() => {
        this.callbacks.onStep(activeTrackStep);
      }, time);
    }

    this.state.stepCounter++;
  }

  // ---------------------------------------------------------------------------
  // Transport, Tempo & Parameter Controls
  // ---------------------------------------------------------------------------

  async startTransport() {
    await this.ensureReady();
    const transport = Tone.getTransport();
    this.state.stepCounter = 0;
    this.seqLoop.start(0);
    transport.start('+0.03');
    this.state.isPlaying = true;
    if (this.callbacks.onActivity) this.callbacks.onActivity();
  }

  stopTransport() {
    if (!this.state.audioReady) return;
    Tone.getTransport().stop();
    if (this.seqLoop) this.seqLoop.stop();
    Tone.getDraw().cancel();
    this.state.isPlaying = false;
  }

  syncDelayToTempo(bpm) {
    if (!this.dubDelay) return;
    const dottedEighthSec = Math.min(1.45, (60 / Math.max(70, bpm)) * 0.75);
    this.dubDelay.delayTime.rampTo(dottedEighthSec, 0.04);
  }

  setBpm(bpm) {
    if (!this.state.audioReady) return;
    Tone.getTransport().bpm.value = bpm;
    this.syncDelayToTempo(bpm);
  }

  setSwing(swing) {
    if (!this.state.audioReady) return;
    Tone.getTransport().swing = swing;
  }

  updateTrackShaper(trackIndex) {
    const tr = this.tracks[trackIndex];
    if (!tr || !tr.audioNodes) return;
    this.scheduleShaperCurveUpdate(`tr-${trackIndex}`, tr.audioNodes.shaper, () => tr.drive, () => tr.crush);
  }

  updateTrackGain(trackIndex, volume) {
    const tr = this.tracks[trackIndex];
    if (tr && tr.audioNodes) tr.audioNodes.vol.gain.rampTo(volume, 0.02);
  }

  updateTrackDelaySend(trackIndex, amount) {
    const tr = this.tracks[trackIndex];
    if (tr && tr.audioNodes) tr.audioNodes.delaySend.gain.rampTo(amount, 0.02);
  }

  updateTrackReverbSend(trackIndex, amount) {
    const tr = this.tracks[trackIndex];
    if (tr && tr.audioNodes) tr.audioNodes.reverbSend.gain.rampTo(amount, 0.02);
  }

  applyKitAudioParams(kit) {
    this.tracks.forEach((tr) => {
      if (tr.audioNodes) {
        tr.audioNodes.shaper.curve = this.makeShaperCurve(tr.drive, tr.crush);
        tr.audioNodes.vol.gain.rampTo(tr.volume, 0.03);
        tr.audioNodes.delaySend.gain.rampTo(tr.delaySend, 0.03);
        tr.audioNodes.reverbSend.gain.rampTo(tr.reverbSend, 0.03);
      }
    });

    if (this.dubDelay) this.dubDelay.feedback.rampTo(kit.master.delayFb, 0.03);
    if (this.roomReverbReturn) this.roomReverbReturn.gain.rampTo(kit.master.reverbMix, 0.03);
    if (this.masterDrive) this.masterDrive.curve = this.makeShaperCurve(kit.master.punch * 0.55, 0);
  }

  setMasterDelayFb(val) {
    if (this.dubDelay) this.dubDelay.feedback.rampTo(val, 0.02);
  }

  setMasterReverbMix(val) {
    if (this.roomReverbReturn) this.roomReverbReturn.gain.rampTo(val, 0.02);
  }

  setMasterPunch(val) {
    if (this.masterDrive) {
      this.scheduleShaperCurveUpdate('master', this.masterDrive, () => val * 0.55, () => 0);
    }
  }

  setMasterCompKnee(val) {
    this.masterCompressor.knee.value = val;
  }
  
  setMasterCompRatio(val) {
    this.masterCompressor.ratio.value = val;
  }
  
  setMasterCompAttack(val) {
    this.masterCompressor.attack.value = val;
  }
  
  setMasterCompRelease(val) {
    this.masterCompressor.release.value = val;
  }
  
  applyFillFilter() {
    if (!this.masterFilter || !this.masterFilterDry || !this.masterFilterWet) return;
    this.masterFilter.type = this.state.fillFilterMode;
    this.masterFilter.frequency.rampTo(this.state.fillFilterCutoff, 0.02);
    this.masterFilter.Q.rampTo(this.state.fillFilterQ, 0.02);
    this.masterFilterDry.gain.rampTo(this.state.fillFilterOn ? 0 : 1, 0.015);
    this.masterFilterWet.gain.rampTo(this.state.fillFilterOn ? 1 : 0, 0.015);
  }

  applyFillReverbProgress(p, beatsDone) {
    
    if (beatsDone >= 7) {
      // When the fill reverb is almost at the end,
      // then start decreasing the reverb effect,
      // else the end of the reverb sounds too abrupt
      let p2 = 0.8 - (p - 0.8);
      console.log("beatsDone", beatsDone, p2)
      this.fillVerbDelay.wet.rampTo(0.5);
      if (beatsDone == 8)
        this.fillVerbDelay.wet.rampTo(0, "2n");
      p = p2;
    }
    
      
    if (!this.fillVerbWet || !this.fillVerbDry) return;
    const gSmall = Math.max(0, 1 - p * 2.1);
    const gMed = Math.sin(p * Math.PI);
    const gLarge = Math.pow(p, 1.5);
    const wet = (0.18 + 0.82 * p) * this.state.fillVerbMaxWet;
    const dry = 1.0 - 0.35 * p * this.state.fillVerbMaxWet;

    this.fillVerbSmallGain.gain.rampTo(gSmall, 0.04);
    this.fillVerbMedGain.gain.rampTo(gMed, 0.04);
    this.fillVerbLargeGain.gain.rampTo(gLarge, 0.04);
    this.fillVerbWet.gain.rampTo(wet, 0.04);
    this.fillVerbDry.gain.rampTo(dry, 0.04);
  }

  resetFillReverbAudio() {
    if (!this.fillVerbWet || !this.fillVerbDry) return;
    this.fillVerbWet.gain.rampTo(0, 0.08);
    this.fillVerbDry.gain.rampTo(1.0, 0.08);
    this.fillVerbSmallGain.gain.rampTo(0, 0.08);
    this.fillVerbMedGain.gain.rampTo(0, 0.08);
    this.fillVerbLargeGain.gain.rampTo(0, 0.08);
  }

  getWaveform() {
    return this.masterWaveform;
  }

  _emitStatus(text, ledClass) {
    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange(text, ledClass);
    }
  }
}
