/* =============================================
   BilimBattle — sound.js
   Web Audio API sound effects (no external files needed)
   ============================================= */

const SFX = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    // resume on user gesture
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function playTone(freq, type, duration, volume = 0.3, decay = true) {
    try {
      const c   = getCtx();
      const osc = c.createOscillator();
      const gain= c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime);
      gain.gain.setValueAtTime(volume, c.currentTime);
      if (decay) gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + duration);
    } catch(e) {}
  }

  function playNotes(notes) {
    // notes: [{freq, duration, delay, type, vol}]
    notes.forEach(n => {
      setTimeout(() => playTone(n.freq, n.type||'sine', n.duration||0.2, n.vol||0.3), (n.delay||0)*1000);
    });
  }

  function noise(duration, volume = 0.15) {
    try {
      const c      = getCtx();
      const bufLen = c.sampleRate * duration;
      const buffer = c.createBuffer(1, bufLen, c.sampleRate);
      const data   = buffer.getChannelData(0);
      for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);
      const src  = c.createBufferSource();
      const gain = c.createGain();
      src.buffer = buffer;
      src.connect(gain);
      gain.connect(c.destination);
      gain.gain.setValueAtTime(volume, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
      src.start();
    } catch(e) {}
  }

  return {
    correct() {
      // happy ascending arpeggio
      playNotes([
        { freq: 523, type: 'triangle', duration: 0.12, vol: 0.3, delay: 0    },
        { freq: 659, type: 'triangle', duration: 0.12, vol: 0.3, delay: 0.08 },
        { freq: 784, type: 'triangle', duration: 0.12, vol: 0.3, delay: 0.16 },
        { freq:1047, type: 'triangle', duration: 0.25, vol: 0.35, delay: 0.24 },
      ]);
    },

    wrong() {
      // sad descending
      playNotes([
        { freq: 400, type: 'sawtooth', duration: 0.15, vol: 0.2, delay: 0    },
        { freq: 320, type: 'sawtooth', duration: 0.15, vol: 0.2, delay: 0.12 },
        { freq: 240, type: 'sawtooth', duration: 0.25, vol: 0.2, delay: 0.24 },
      ]);
    },

    bonus() {
      // sparkle run
      playNotes([
        { freq: 880,  type: 'sine', duration: 0.1, vol: 0.3, delay: 0    },
        { freq: 1109, type: 'sine', duration: 0.1, vol: 0.3, delay: 0.07 },
        { freq: 1319, type: 'sine', duration: 0.1, vol: 0.3, delay: 0.14 },
        { freq: 1760, type: 'sine', duration: 0.2, vol: 0.4, delay: 0.21 },
        { freq: 2093, type: 'sine', duration: 0.3, vol: 0.35,delay: 0.32 },
      ]);
    },

    click() {
      playTone(800, 'sine', 0.06, 0.15);
    },

    cardFlip() {
      noise(0.06, 0.08);
      setTimeout(() => playTone(600, 'sine', 0.08, 0.12), 30);
    },

    reveal() {
      // card reveal whoosh
      playNotes([
        { freq: 300, type: 'sine', duration: 0.05, vol: 0.1, delay: 0    },
        { freq: 500, type: 'sine', duration: 0.05, vol: 0.15,delay: 0.04 },
        { freq: 700, type: 'sine', duration: 0.08, vol: 0.2, delay: 0.08 },
      ]);
    },

    timerTick() {
      playTone(1000, 'square', 0.05, 0.08);
    },

    timerEnd() {
      // alarm
      playNotes([
        { freq: 880, type: 'square', duration: 0.1, vol: 0.25, delay: 0    },
        { freq: 440, type: 'square', duration: 0.1, vol: 0.25, delay: 0.12 },
        { freq: 880, type: 'square', duration: 0.1, vol: 0.25, delay: 0.24 },
        { freq: 440, type: 'square', duration: 0.15,vol: 0.25, delay: 0.36 },
      ]);
    },

    critical() {
      // epic hit
      playNotes([
        { freq: 150, type: 'sawtooth', duration: 0.05, vol: 0.4, delay: 0    },
        { freq: 300, type: 'sawtooth', duration: 0.05, vol: 0.4, delay: 0.03 },
        { freq: 600, type: 'triangle', duration: 0.3,  vol: 0.5, delay: 0.06 },
        { freq:1200, type: 'sine',     duration: 0.2,  vol: 0.4, delay: 0.1  },
      ]);
      noise(0.08, 0.3);
    },

    monsterDead() {
      playNotes([
        { freq: 880,  type: 'sawtooth', duration: 0.08, vol: 0.4, delay: 0    },
        { freq: 1760, type: 'triangle', duration: 0.08, vol: 0.4, delay: 0.06 },
        { freq: 2637, type: 'sine',     duration: 0.3,  vol: 0.5, delay: 0.14 },
      ]);
    },

    gameStart() {
      playNotes([
        { freq: 440, type: 'triangle', duration: 0.1, vol: 0.3, delay: 0    },
        { freq: 554, type: 'triangle', duration: 0.1, vol: 0.3, delay: 0.1  },
        { freq: 659, type: 'triangle', duration: 0.1, vol: 0.3, delay: 0.2  },
        { freq: 880, type: 'triangle', duration: 0.3, vol: 0.4, delay: 0.3  },
      ]);
    },

    victory() {
      playNotes([
        { freq: 523,  type: 'triangle', duration: 0.1, vol: 0.3, delay: 0    },
        { freq: 659,  type: 'triangle', duration: 0.1, vol: 0.3, delay: 0.1  },
        { freq: 784,  type: 'triangle', duration: 0.1, vol: 0.3, delay: 0.2  },
        { freq: 1047, type: 'triangle', duration: 0.15,vol: 0.4, delay: 0.3  },
        { freq: 784,  type: 'triangle', duration: 0.1, vol: 0.3, delay: 0.48 },
        { freq: 1047, type: 'triangle', duration: 0.3, vol: 0.45,delay: 0.6  },
      ]);
    },

    streak() {
      // fire streak sound
      playNotes([
        { freq: 660,  type: 'sine', duration: 0.08, vol: 0.3, delay: 0    },
        { freq: 880,  type: 'sine', duration: 0.08, vol: 0.35,delay: 0.06 },
        { freq: 1320, type: 'sine', duration: 0.15, vol: 0.4, delay: 0.12 },
      ]);
    },

    soloComplete() {
      playNotes([
        { freq: 523, type: 'sine', duration: 0.12, vol: 0.3, delay: 0    },
        { freq: 784, type: 'sine', duration: 0.12, vol: 0.35,delay: 0.12 },
        { freq:1047, type: 'sine', duration: 0.25, vol: 0.4, delay: 0.24 },
      ]);
    },
  };
})();
