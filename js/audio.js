(function (global) {
  'use strict';

  const AudioFX = {
    ctx: null,
    muted: false,

    unlock: function () {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(function () {});
      }
    },

    tone: function (freq, dur, type, vol, slideTo) {
      if (this.muted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
      gain.gain.setValueAtTime(vol || 0.13, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + dur);
    },

    horn: function (kind) {
      this.unlock();
      if (kind === 'bell') {
        this.tone(1320, 0.16, 'sine', 0.14);
        setTimeout(() => this.tone(1760, 0.22, 'sine', 0.12), 90);
      } else if (kind === 'truck') {
        this.tone(185, 0.28, 'sawtooth', 0.16, 175);
        this.tone(235, 0.28, 'sawtooth', 0.12, 225);
      } else if (kind === 'bagac') {
        this.tone(290, 0.18, 'square', 0.12, 270);
      } else if (kind === 'scooter') {
        this.tone(620, 0.12, 'triangle', 0.14);
        setTimeout(() => this.tone(620, 0.12, 'triangle', 0.14), 130);
      } else {
        this.tone(480, 0.14, 'square', 0.1);
      }
    },

    lane: function () {
      this.tone(240, 0.055, 'sine', 0.06, 330);
    },

    pickup: function (stackCount, isVip) {
      const base = isVip ? 680 : 440 + Math.min(stackCount, 14) * 28;
      this.tone(base, 0.12, 'triangle', 0.15, base * 1.35);
      if (isVip) setTimeout(() => this.tone(980, 0.16, 'triangle', 0.15), 90);
    },

    deliver: function () {
      [523, 659, 784, 1046].forEach((n, idx) => {
        setTimeout(() => this.tone(n, 0.16, 'triangle', 0.16), idx * 75);
      });
    },

    nearMiss: function () {
      this.tone(660, 0.09, 'sine', 0.1, 1120);
    },

    unlockItem: function () {
      this.tone(580, 0.09, 'triangle', 0.14, 880);
      setTimeout(() => this.tone(880, 0.14, 'triangle', 0.14, 1200), 80);
    },

    deny: function () {
      this.tone(180, 0.12, 'sawtooth', 0.1, 130);
    },

    crash: function () {
      this.tone(160, 0.28, 'sawtooth', 0.2, 42);
      setTimeout(() => this.tone(95, 0.22, 'square', 0.15, 38), 70);
    }
  };

  global.AudioFX = AudioFX;
})(window);
