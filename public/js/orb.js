class TechiOrb {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.state = 'idle'; // idle | listening | thinking | speaking
    this.time = 0;
    this.audioAmplitude = 0.5;

    this.colors = {
      idle: { r: 0, g: 210, b: 255 },        // Cyan/blue
      listening: { r: 0, g: 255, b: 150 },   // Neon green
      thinking: { r: 255, g: 170, b: 0 },    // Warm amber
      speaking: { r: 255, g: 0, b: 128 }     // Vibrant magenta
    };

    this.currentColor = { ...this.colors.idle };
    this.targetColor = { ...this.colors.idle };

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.animate();
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
    this.radius = Math.min(this.width, this.height) * 0.18;
  }

  setState(newState) {
    if (this.colors[newState]) {
      this.state = newState;
      this.targetColor = { ...this.colors[newState] };
    }
  }

  setAmplitude(amp) {
    this.audioAmplitude = amp;
  }

  animate() {
    this.time += 0.03;

    // Smooth color interpolation
    this.currentColor.r += (this.targetColor.r - this.currentColor.r) * 0.05;
    this.currentColor.g += (this.targetColor.g - this.currentColor.g) * 0.05;
    this.currentColor.b += (this.targetColor.b - this.currentColor.b) * 0.05;

    this.ctx.clearRect(0, 0, this.width, this.height);

    const r = Math.round(this.currentColor.r);
    const g = Math.round(this.currentColor.g);
    const b = Math.round(this.currentColor.b);

    // Draw Outer Ambient Glow
    const outerGlowRadius = this.radius * (1.6 + Math.sin(this.time * 2) * 0.1);
    const glowGradient = this.ctx.createRadialGradient(
      this.centerX, this.centerY, this.radius * 0.2,
      this.centerX, this.centerY, outerGlowRadius
    );
    glowGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.3)`);
    glowGradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.1)`);
    glowGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, outerGlowRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw Multi-layered Organic Waveform Circles
    const layerCount = this.state === 'speaking' ? 6 : (this.state === 'listening' ? 4 : 3);
    for (let layer = 0; layer < layerCount; layer++) {
      this.drawWaveLayer(layer, r, g, b);
    }

    // Draw Core Inner Sphere
    const coreGradient = this.ctx.createRadialGradient(
      this.centerX - this.radius * 0.3, this.centerY - this.radius * 0.3, 5,
      this.centerX, this.centerY, this.radius
    );
    coreGradient.addColorStop(0, `rgba(255, 255, 255, 0.9)`);
    coreGradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.8)`);
    coreGradient.addColorStop(1, `rgba(${Math.floor(r * 0.3)}, ${Math.floor(g * 0.3)}, ${Math.floor(b * 0.3)}, 0.4)`);

    this.ctx.fillStyle = coreGradient;
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, this.radius * 0.6, 0, Math.PI * 2);
    this.ctx.fill();

    requestAnimationFrame(() => this.animate());
  }

  drawWaveLayer(layerIndex, r, g, b) {
    this.ctx.beginPath();
    const points = 120;
    const layerOffset = layerIndex * 0.5;

    let baseAmp = 0.05;
    let freq = 4;
    let speed = this.time * 2;

    if (this.state === 'listening') {
      baseAmp = 0.12;
      freq = 6;
      speed = this.time * 3;
    } else if (this.state === 'thinking') {
      baseAmp = 0.15;
      freq = 10;
      speed = this.time * 5;
    } else if (this.state === 'speaking') {
      baseAmp = 0.25 * (0.5 + this.audioAmplitude * 0.5);
      freq = 8 + layerIndex * 2;
      speed = this.time * 4;
    }

    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const distortion = Math.sin(angle * freq + speed + layerOffset) * 
                         Math.cos(angle * (freq / 2) - speed * 0.7);

      const rDynamic = this.radius * (0.8 + layerIndex * 0.15 + distortion * baseAmp);
      const x = this.centerX + Math.cos(angle) * rDynamic;
      const y = this.centerY + Math.sin(angle) * rDynamic;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    this.ctx.closePath();
    const alpha = 0.5 - layerIndex * 0.08;
    this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${Math.max(0.1, alpha)})`;
    this.ctx.lineWidth = 2 + (this.state === 'speaking' ? layerIndex : 0);
    this.ctx.stroke();
  }
}
