// Sound effects synthesized with the Web Audio API (no audio files). Audio starts only after the
// player's first click, as browsers require.

let ctx = null;
let master = null;
let volume = 0.6;
let muted = false;

function ensure() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : volume * 0.5;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function setVolume(v, m) {
  volume = v;
  muted = m;
  if (master) master.gain.value = muted ? 0 : volume * 0.5;
}

export function unlockAudio() {
  ensure();
}

function tone(freq, dur, { type = 'sine', gain = 0.3, delay = 0, slide = 0 } = {}) {
  if (muted || volume <= 0) return;
  const c = ensure();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.03);
}

function noise(dur, { gain = 0.25, delay = 0, cutoff = 900 } = {}) {
  if (muted || volume <= 0) return;
  const c = ensure();
  if (!c) return;
  const t = c.currentTime + delay;
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t);
}

export const sfx = {
  click: () => tone(660, 0.05, { type: 'triangle', gain: 0.12 }),
  select: () => tone(520, 0.07, { type: 'triangle', gain: 0.16 }),
  move: () => tone(240, 0.12, { gain: 0.18, slide: 0.75 }),
  attack: () => {
    noise(0.2, { gain: 0.4, cutoff: 1500 });
    tone(150, 0.22, { type: 'sawtooth', gain: 0.1, slide: 0.55 });
  },
  found: () => [392, 494, 587, 784].forEach((f, k) => tone(f, 0.55, { type: 'triangle', gain: 0.12, delay: k * 0.08 })),
  tech: () => [523, 659, 784, 1047].forEach((f, k) => tone(f, 0.28, { gain: 0.11, delay: k * 0.07 })),
  built: () => tone(587, 0.2, { type: 'triangle', gain: 0.13 }),
  turn: () => {
    tone(330, 0.4, { gain: 0.12 });
    tone(495, 0.4, { gain: 0.07, delay: 0.06 });
  },
  error: () => tone(150, 0.16, { type: 'square', gain: 0.06 }),
  war: () => {
    tone(110, 0.9, { type: 'sawtooth', gain: 0.1 });
    tone(147, 0.9, { type: 'sawtooth', gain: 0.07, delay: 0.06 });
  },
  peace: () => [440, 554, 659].forEach((f, k) => tone(f, 0.45, { gain: 0.1, delay: k * 0.1 })),
  captured: () => {
    noise(0.35, { gain: 0.3, cutoff: 800 });
    [262, 330, 392].forEach((f, k) => tone(f, 0.5, { type: 'triangle', gain: 0.1, delay: 0.1 + k * 0.09 }));
  },
  victory: () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, 0.7, { type: 'triangle', gain: 0.12, delay: k * 0.12 })),
  defeat: () => [392, 330, 262, 196].forEach((f, k) => tone(f, 0.7, { type: 'sine', gain: 0.12, delay: k * 0.18 })),
};
