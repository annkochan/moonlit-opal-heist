// Keyboard and mouse state. Movement keys, sprint, sneak and interact are
// read as held/pressed flags; mouse clicks are queued as coin-toss targets
// in logical room coordinates (converted by main.js, which owns scaling).

export class Input {
  constructor(canvas, toLogical) {
    this.keys = new Set();
    this.pressed = new Set();
    this.clicks = [];
    this.mouse = { x: 0, y: 0 };
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('mousemove', (e) => { this.mouse = toLogical(e.clientX, e.clientY); });
    canvas.addEventListener('mousedown', (e) => { this.clicks.push(toLogical(e.clientX, e.clientY)); });
  }

  axis() {
    const k = this.keys;
    const x = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    const y = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0);
    return { x, y };
  }

  get sprint() { return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'); }
  get sneak() { return this.keys.has('KeyC') || this.keys.has('ControlLeft'); }
  get interact() { return this.pressed.has('KeyE') || this.pressed.has('Space'); }
  get confirm() { return this.pressed.has('Enter') || this.pressed.has('Space'); }
  get restart() { return this.pressed.has('KeyR'); }

  takeClicks() { const c = this.clicks; this.clicks = []; return c; }
  endFrame() { this.pressed.clear(); }
}
