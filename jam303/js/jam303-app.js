import { Jam303AudioGraph } from "./jam303-audiograph.js";
import { Jam303Sequencer } from "./jam303-sequencer.js";
import { JamConnectApp } from "../../js/jamconnect-app.js";

export class Jam303App extends JamConnectApp {
  constructor() {
    super("jam303", new Jam303AudioGraph(), { visualizerStrokeColor: "#22c55e" });
    
    super.registerServiceWorker("/jam303/jam303-service-worker.js", "/jam303/");
    this.sequencer = new Jam303Sequencer(this.jcClient, this.audioGraph, this.themeColorName);
    
    this.jcClient.connector.onMidiNoteOn = (appName, channel, note, velocity, time) => this.onReceiveMidiNoteOn(appName, channel, note, velocity, time);
    this.jcClient.connector.onMidiControlChange = (appName, channel, controlNumber, controlName, value, time) => this.onReceiveMidiControlChange(appName, channel, controlNumber, controlName, value, time);
  }
  
  createParameterKnob(parameterId, parameterControlMapping) {
    //console.log("jam303App.createParameterKnob")
    let parts = parameterId.split(".");
    let deviceName = parts[0];
    let parameterName = parts[1];
    let deviceKnobs = document.getElementById(deviceName + "-knobs");
    deviceKnobs.innerHTML += this.createKnobHtml(deviceName, parameterName);
  }
  
  createKnobHtml(deviceName, parameterName) {
    let html = `
      <div class="flex flex-col items-center">
        <span class="text-[11px] font-extrabold uppercase text-slate-700 mb-1">${parameterName.toUpperCase()}</span>
        <div class="knob-container" id="${deviceName}.${parameterName}" data-value="0.4">
          <div class="knob-body"></div>
          <div class="knob-cap"></div>
          <div class="knob-indicator"></div>
        </div>
        <span class="text-[10px] font-mono text-slate-600 mt-1" data-parameter="${deviceName}.${parameterName}" >400 Hz</span>
      </div>`;
    return html;
  }
  
  createParameterSwitch(parameterId, parameterControlMapping) {
    //console.log("jam909App.createParameterKnob")
    let parts = parameterId.split(".");
    let deviceName = parts[0];
    let parameterName = parts[1];
    let deviceKnobs = document.getElementById(deviceName + "-switches");
    
    deviceKnobs.innerHTML += this.createSwitchHtml(deviceName, parameterName, parameterControlMapping.options, parameterControlMapping.optionNames);
  }
  
  createSwitchHtml(deviceName, parameterName, options, optionNames) {
    let buttonsHtml = "";
    
    let index = 0;
    console.log("options", options)
    options.forEach(option => {
      let activeClass = (index == 0) ? "active-led " : "";
      buttonsHtml += `<button data-parameter="${deviceName}.${parameterName}" data-value="${option}" class="${activeClass} min-w-[30px] px-0.5 py-1 text-[10px] font-bold rounded synth-btn text-slate-900 mr-1">${optionNames[index]}</button>`;
      index++;
    });
    
    //<div id="${deviceName}.${parameterName}" class="flex flex-row gap-0 p-0 text-center">${buttonsHtml}</div>
    let html = `<div class="min-w-[70px] device-switch flex flex-col mb-1 flex-start">
        <span class="text-[11px] font-extrabold uppercase text-slate-700 mb-0">${parameterName.toUpperCase()}</span>
        <div id="${deviceName}.${parameterName}" class="text-center">${buttonsHtml}</div></div>`;
    return html;
  }

  jamConnectNotePlayed(appName, instrument, note, velocity, duration, time) {
  	if (Tone.Transport.state == 'started' && !this.sequencer.isSequenceEmpty)
  		return;
  	this.playNote("tb303", note, { accent: velocity == 1 }, duration, time);
  }
  
  onReceiveMidiNoteOn(appName, channel, note, velocity, time) {
    if (appName != "jamMIDI") return;
    
  	console.log("onReceiveMidiNoteOn " + note, appName, channel, velocity);
  	this.audioGraph.play303StepNote(note, velocity > 120, false, "16n", Tone.now());
  }
  
  onReceiveMidiControlChange(appName, channel, controlNumber, controlName, value, time) {
    if (appName != "jamMIDI") return;
    
  	console.log("onReceiveMidiControlChange " + controlName + " -> " + value, appName, channel, controlNumber);
  	let parameterId = this.audioGraph.getMidiControlParameter(controlNumber);
  	if (parameterId) {
  	  this.jcClient.isApplyingRemoteUpdate = true;
      try {
    	  const normalizedValue = value / 127;
        const rangedValue = this.audioGraph.convertNormalizedValue(parameterId, normalizedValue);
        this.applyDeviceParameterChange(appName, parameterId, rangedValue);
      }
      finally {
        this.jcClient.isApplyingRemoteUpdate = false;
      }
  	}
  }
  
  playNote(instrumentName, note, stepData, duration, time) {
    this.audioGraph.play303StepNote(note, stepData.accent, stepData.slide, duration, time);
  }
  
  run() {
    super.run();
    
    // Initialize Lucide Icons
    lucide.createIcons();
    
    // Receive single-step or full-pattern updates from peers
    this.jcClient.connector.onPatternUpdated = (appName, instrumentName, newPattern, stepIndex, stepData, presetName) => {
      this.jcClient.isApplyingRemoteUpdate = true;
      try {
        if (Array.isArray(newPattern) && newPattern.length === 16) {
          this.sequencer.instrumentPatterns[instrumentName] = JSON.parse(JSON.stringify(newPattern));
          if (this.sequencer.selectedInstrumentName == instrumentName) {
            if (presetName && this.sequencer.patternSelect) this.sequencer.patternSelect.value = presetName;
            this.sequencer.refresh();
          }
        } else if (typeof stepIndex === 'number' && stepData) {
          if (this.sequencer.selectedInstrumentName == instrumentName) {
            this.sequencer.refreshStep(stepIndex, stepData);
          }
        }
      } finally {
        this.jcClient.isApplyingRemoteUpdate = false;
      }
    };
  }
}

const app = new Jam303App();
app.run();