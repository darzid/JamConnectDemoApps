/**
 * Reusable SVG Rotary Knob Component (mouse + touch pointer drag & double-click reset)
 */
export class RotaryKnob {
  constructor(container, opts) {
    this.min = opts.min;
    this.max = opts.max;
    this.defaultValue = opts.value;
    this.currentVal = opts.value;
    this.log = Boolean(opts.log);
    this.format = opts.format || ((v) => v.toFixed(1));
    this.color = opts.color || '#f59e0b';
    this.onChange = opts.onChange || null;

    this._build(container, opts.label);
    this.render(this.currentVal);
  }

  _build(container, label) {
    const wrap = document.createElement('div');
    wrap.className = 'knob-wrap';

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 48 48');
    svg.setAttribute('width', '44');
    svg.setAttribute('height', '44');
    svg.classList.add('knob-svg');

    // Background track arc
    const bgArc = document.createElementNS(svgNS, 'circle');
    bgArc.setAttribute('cx', '24');
    bgArc.setAttribute('cy', '24');
    bgArc.setAttribute('r', '18');
    bgArc.setAttribute('fill', '#17171b');
    bgArc.setAttribute('stroke', '#2e2e36');
    bgArc.setAttribute('stroke-width', '3.5');
    svg.appendChild(bgArc);

    // Knob cap
    const cap = document.createElementNS(svgNS, 'circle');
    cap.setAttribute('cx', '24');
    cap.setAttribute('cy', '24');
    cap.setAttribute('r', '13');
    cap.setAttribute('fill', '#27272e');
    cap.setAttribute('stroke', '#3f3f4a');
    cap.setAttribute('stroke-width', '1.2');
    svg.appendChild(cap);

    // Indicator pointer line
    this.pointer = document.createElementNS(svgNS, 'line');
    this.pointer.setAttribute('x1', '24');
    this.pointer.setAttribute('y1', '24');
    this.pointer.setAttribute('x2', '24');
    this.pointer.setAttribute('y2', '12');
    this.pointer.setAttribute('stroke', this.color);
    this.pointer.setAttribute('stroke-width', '2.6');
    this.pointer.setAttribute('stroke-linecap', 'round');
    svg.appendChild(this.pointer);

    const lblEl = document.createElement('span');
    lblEl.className = 'font-mono-tech text-[9px] text-zinc-400 mt-1 tracking-tight';
    lblEl.textContent = label;

    this.valEl = document.createElement('span');
    this.valEl.className = 'font-mono-tech text-[9px] text-zinc-200 leading-tight';

    wrap.appendChild(svg);
    wrap.appendChild(lblEl);
    wrap.appendChild(this.valEl);
    container.appendChild(wrap);

    // Pointer drag interaction
    let dragging = false;
    let startY = 0;
    let startNorm = 0;

    svg.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      dragging = true;
      startY = e.clientY;
      startNorm = this._valToNorm(this.currentVal);
      svg.setPointerCapture(e.pointerId);
    });

    svg.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dy = startY - e.clientY;
      const nextNorm = Math.max(0, Math.min(1, startNorm + dy / 130));
      const nextVal = this._normToVal(nextNorm);
      this.render(nextVal);
      if (this.onChange) this.onChange(nextVal);
    });

    const stopDrag = () => { dragging = false; };
    svg.addEventListener('pointerup', stopDrag);
    svg.addEventListener('pointercancel', stopDrag);

    svg.addEventListener('dblclick', () => {
      this.render(this.defaultValue);
      if (this.onChange) this.onChange(this.defaultValue);
    });
  }

  _valToNorm(v) {
    const clamped = Math.max(this.min, Math.min(this.max, v));
    if (this.log && this.min > 0) {
      return (Math.log(clamped) - Math.log(this.min)) / (Math.log(this.max) - Math.log(this.min));
    }
    return (clamped - this.min) / (this.max - this.min);
  }

  _normToVal(n) {
    const cn = Math.max(0, Math.min(1, n));
    if (this.log && this.min > 0) {
      return this.min * Math.pow(this.max / this.min, cn);
    }
    return this.min + cn * (this.max - this.min);
  }

  render(v) {
    this.currentVal = Math.max(this.min, Math.min(this.max, v));
    const norm = this._valToNorm(this.currentVal);
    const angle = -135 + norm * 270;
    this.pointer.setAttribute('transform', `rotate(${angle} 24 24)`);
    this.valEl.textContent = this.format(this.currentVal);
  }

  setValue(v) {
    this.render(v);
  }
}
