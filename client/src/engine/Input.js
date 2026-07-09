export class InputController {
  constructor() {
    this.keys = {};
    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      // Map arrow keys and wasd
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright', 'e', 'escape'].includes(key)) {
        this.keys[key] = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright', 'e', 'escape'].includes(key)) {
        this.keys[key] = false;
      }
    });
  }

  isKeyPressed(key) {
    key = key.toLowerCase();
    
    // Support aliases
    if (key === 'up') return this.keys['w'] || this.keys['arrowup'];
    if (key === 'down') return this.keys['s'] || this.keys['arrowdown'];
    if (key === 'left') return this.keys['a'] || this.keys['arrowleft'];
    if (key === 'right') return this.keys['d'] || this.keys['arrowright'];

    return !!this.keys[key];
  }

  // Helper to consume a key stroke (triggers once per keydown)
  consumeKey(key) {
    key = key.toLowerCase();
    if (this.keys[key]) {
      this.keys[key] = false;
      return true;
    }
    return false;
  }
}
