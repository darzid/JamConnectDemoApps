import { AudioGraphBase } from "../../js/jamconnect-audiograph.js";

const parameters = {
  delay: {
  	rate: {
    	value: "8n.",
      deviceParameter: "delayTime.value",
      options: [    '16n.' , '16n',  '8n.',  '8n',  '4n.',  '4n',  '2n',  '1n'],
			optionNames: ["1/16.", "1/16", "1/8.", "1/8", "1/4.", "1/4", "1/2", "1/1"],
    },
    feedback: {
    	value: 0.3,
      deviceParameter: "feedback.value",
      range: {
      	min: 0,
        max: 1,
        displayValueMultiplier: 100,
        displayValueUnit: "%"
      }
    },
    amount: {
    	value: 0.25,
      deviceParameter: "wet.value",
      range: {
      	min: 0,
        max: 1,
        displayValueMultiplier: 100,
        displayValueUnit: "%"
      }
    },
  },
  
  distortion: {
  	oversample: {
    	value: "none",
      deviceParameter: "oversample",
      options: ["none", "2x", "4x"],
			optionNames: ["none", "2x", "4x"],
    },
  	drive: {
  		value: 0.35,
      deviceParameter: "distortion",
      midiControlMapping: 77,
      range: {
        min: 0,
        max: 1,
        displayValueMultiplier: 100,
        displayValueUnit: "%"
      }
  	},
  	dryWet: {
  		value: 0.6,
      deviceParameter: "wet.value",
      range: {
      	min: 0,
        max: 1,
        displayValueMultiplier: 100,
        displayValueUnit: "%"
      }
  	}
  },
  
  tb303: {
  	tune: {
  		value: 0,
  		deviceParameter: "oscillator.detune.value",
  		midiControlMapping: 94,
  		range: {
        min: -1200,
        max: 1200,
        displayValueUnit: "ct"
      }
  	},
    cutoff: {
      value: 400,
      deviceParameter: "filterEnvelope.baseFrequency",
      midiControlMapping: 74,
      range: {
        min: 100,
        max: 8000,
        displayValueUnit: "Hz"
      }
    },
    
    resonance: {
      value: 7,
      deviceParameter: "filter.Q.value",
      midiControlMapping: 71,
      range: {
        min: 1,
        max: 20,
      },
    },
    envMod: {
      value: 0.6,
      deviceParameter: "envMod",
      midiControlMapping: 1,
      range: {
        min: 0,
        max: 1,
        displayValueMultiplier: 100,
        displayValueUnit: "%"
      }
    },
    decay: {
      value: 0.3,
      deviceParameter: "decay",
      midiControlMapping: 80,
      range: {
        min: 0.1,
        max: 1.2,
        displayValueMultiplier: 1000,
        displayValueUnit: "ms"
      }
    },
    accent: {
      value: 0.8,
      deviceParameter: "accent",
      midiControlMapping: 11,
      range: {
        min: 0,
        max: 1,
        displayValueMultiplier: 100,
        displayValueUnit: "%"
      }
    },
    waveform: {
      value: "sawtooth",
      deviceParameter: "oscillator.type",
      midiControlMapping: 83,
      options: ["sawtooth","square"],
      optionNames: ["sawtooth", "square"]
    }
  },
  
  cutoffLfo: {
		amount: {
    	value: 0,
      deviceParameter: "amplitude.value",
      range: {
        min: 0,
        max: 4,
      }
    },
    phase: {
    	value: 0,
      deviceParameter: "phase",
      range: {
        min: 0,
        max: 360,
        displayValueUnit: "deg"
      }
    },
		rate: {
    	value: "0:1:0",
      deviceParameter: "frequency.value",
      options: [
      	"4n",  
      	"2n",  
      	"0:1:0",  
      	"0:2:0", 
      	"0:3:0", 
      	"1:0:0"],
			optionNames: [
				"1/4", 
				"1/2", 
				"1/1", 
				"2/1", 
				"3/1", 
				"4/1"],
    },
  },
  
  resonanceLfo: {
		amount: {
    	value: 0,
      deviceParameter: "amplitude.value",
      range: {
        min: 0,
        max: 1,
      }
    },
    phase: {
    	value: 0,
      deviceParameter: "phase",
      range: {
        min: 0,
        max: 360,
        displayValueUnit: "deg"
      }
    },
		rate: {
    	value: "0:1:0",
      deviceParameter: "frequency.value",
      options: [
      	"4n", 
      	"2n", 
      	"0:1:0", 
      	"0:2:0", 
      	"0:3:0", 
      	"1:0:0"
      ],
			optionNames: [
				"1/4", 
				"1/2", 
				"1/1", 
				"2/1", 
				"3/1", 
				"4/1"],
    },
  }
}

export class Jam303AudioGraph extends AudioGraphBase {
  constructor() 
  {
    super(parameters);
  
    // Ping Pong Delay Unit
    this.devices.effects.delay = new Tone.PingPongDelay({
      delayTime: this.params.delay.rate.value,
      feedback: this.params.delay.feedback.value,
      wet: this.params.delay.amount.value,
    });
    
    // Saturation / Distortion Unit
    this.devices.effects.distortion = new Tone.Distortion({
      oversample: this.params.distortion.oversample.value,
      distortion: this.params.distortion.drive.value,
      wet: this.params.distortion.dryWet.value,
    });
    
    this.devices.instruments.tb303 = new Tone.MonoSynth({
      oscillator: {
        type: this.params.tb303.waveform.value
      },
      envelope: {
        attack: 0.003,
        decay: this.params.tb303.decay.value,
        sustain: 0,
        release: 0.05
      },
      filter: {
        Q: this.params.tb303.resonance.value,
        type: 'lowpass',
        rolloff: -24
      },
      filterEnvelope: {
        attack: 0.003,
        decay: this.params.tb303.decay.value,
        sustain: 0.0,
        release: 0.1,
        baseFrequency: this.params.tb303.cutoff.value,
        octaves: this.params.tb303.envMod.value * 5,
        exponent: 2
      }
    });
    this.devices.instruments.tb303._accent = this.params.tb303.accent.value;
    
  	this.devices.modules.filter = new Tone.Filter();

		this.devices.modules.cutoffLfo = new Tone.LFO(
    	this.params.cutoffLfo.rate.value, 
    	this.params.tb303.cutoff.range.min,
    	this.params.tb303.cutoff.range.max
  	);
  	this.devices.modules.cutoffLfo.phase = this.params.cutoffLfo.phase.value;
  	
  	this.devices.modules.cutoffLfo.connect(this.devices.modules.filter.frequency);
    this.devices.modules.cutoffLfo.start();
    
    this.devices.modules.resonanceLfo = new Tone.LFO(
    	this.params.resonanceLfo.rate.value, 
    	this.params.tb303.resonance.range.min,
    	this.params.tb303.resonance.range.max
  	);
  	this.devices.modules.resonanceLfo.phase = this.params.resonanceLfo.phase.value;
  	
  	this.devices.modules.resonanceLfo.connect(this.devices.instruments.tb303.filter.Q);
    this.devices.modules.resonanceLfo.start();
    
    Object.defineProperty(this.devices.instruments.tb303, "decay", {
      get:()=>{return this.devices.instruments.tb303.envelope.decay; },
      set:(val)=>{
        this.devices.instruments.tb303.envelope.decay = val;
        this.devices.instruments.tb303.filterEnvelope.decay = val;
      }
    });
    
    Object.defineProperty(this.devices.instruments.tb303, "envMod", {
      get:()=>{return this.devices.instruments.tb303._envMod; },
      set:(val)=>{
        this.devices.instruments.tb303._envMod = val;
        this.devices.instruments.tb303.filterEnvelope.octaves = val * 5;
      }
    });
    this.devices.instruments.tb303._envMod = this.params.tb303.envMod.value;
    
    Object.defineProperty(this.devices.instruments.tb303, "accent", {
      get:()=>{return this.devices.instruments.tb303._accent},
      set:(val)=>{this.devices.instruments.tb303._accent = val;}
    });
    
    Object.defineProperty(this.devices.instruments.tb303, "drive", {
      get:()=>{return this.devices.effects.distortion.distortion;},
      set:(val)=>{
        this.devices.effects.distortion.distortion = val;
        }
    });
    

    // Chain 303 Audio Routing
    this.devices.instruments.tb303.chain(this.devices.modules.filter, this.devices.effects.distortion, this.devices.effects.delay, this.groupBus);
  }
  
  play303StepNote(noteFreq, accent, slide, duration, time) 
  {
    try {
      if (accent) {
        this.devices.instruments.tb303.volume.setValueAtTime(4, time);
        this.devices.instruments.tb303.filterEnvelope.octaves = this.params.tb303.envMod.value * 7.5 * this.params.tb303.accent.value;
        this.devices.instruments.tb303.envelope.decay = this.params.tb303.decay.value * 0.7;
      } else {
        this.devices.instruments.tb303.volume.setValueAtTime(0, time);
        this.devices.instruments.tb303.filterEnvelope.octaves = this.params.tb303.envMod.value * 4.5;
        this.devices.instruments.tb303.envelope.decay = this.params.tb303.decay.value;
      }
      
      this.devices.instruments.tb303.portamento = slide ? 0.08 : 0;
      this.devices.instruments.tb303.triggerAttackRelease(noteFreq, duration, time);
    }
    catch (err) {
      console.error("error", err, err.stack)
    }
  }
  
  start303Note(noteFreq, accent, time, slide = false) 
  {
    try {
      if (accent) {
        this.devices.instruments.tb303.volume.setValueAtTime(4, time);
        this.devices.instruments.tb303.filterEnvelope.octaves = this.params.tb303.envMod.value * 7.5 * this.params.tb303.accent.value;
        this.devices.instruments.tb303.envelope.decay = this.params.tb303.decay.value * 0.7;
      } else {
        this.devices.instruments.tb303.volume.setValueAtTime(0, time);
        this.devices.instruments.tb303.filterEnvelope.octaves = this.params.tb303.envMod.value * 4.5;
        this.devices.instruments.tb303.envelope.decay = this.params.tb303.decay.value;
      }
      
      this.devices.instruments.tb303.portamento = slide ? 0.08 : 0;
      this.devices.instruments.tb303.triggerAttack(noteFreq, time);
    }
    catch (err) {
      console.error("error", err, err.stack)
    }
  }
  
  stop303Note(time) 
  {
    try {
      this.devices.instruments.tb303.triggerRelease(time);
    }
    catch (err) {
      console.error("error", err, err.stack)
    }
  }
}