// Tiny generated sound effects with WebAudio: no audio files, no network.
// Sounds start only after the first user gesture, as browsers require.

export class SoundEffects {
  constructor() { this.ctx = null; this.alarmTimer = 0; }

  unlock() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { this.ctx = null; } }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone(freq, seconds, type = 'sine', volume = 0.08, slideTo = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + seconds);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t); osc.stop(t + seconds);
  }

  coin() { this.tone(1180, 0.09, 'square', 0.05); setTimeout(() => this.tone(1560, 0.14, 'square', 0.05), 60); }
  pickup() { this.tone(720, 0.1, 'sine', 0.09, 1180); }
  opal() { this.tone(520, 0.3, 'sine', 0.1, 1320); }
  spottedTick(dt) {
    this.alarmTimer -= dt;
    if (this.alarmTimer <= 0) { this.tone(980, 0.05, 'square', 0.03); this.alarmTimer = 0.22; }
  }
  alarm() { this.tone(660, 0.35, 'sawtooth', 0.07, 440); }
  win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'sine', 0.09), i * 110)); }
  lose() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.24, 'sine', 0.09), i * 120)); }
}
