let ctx: AudioContext | null = null;

function getCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new AC();
  return ctx;
}

export function unlockAudio() {
  const c = getCtx();
  if (c.state === "suspended") void c.resume();
}

function noiseBuffer(c: AudioContext, seconds: number, color: "white" | "brown") {
  const n = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    if (color === "brown") {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    } else {
      d[i] = w;
    }
  }
  return buf;
}

export function playPageTurn() {
  const c = getCtx();
  if (c.state === "suspended") void c.resume();
  const t0 = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.38, "white");
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(1800, t0);
  bp.frequency.exponentialRampToValueAtTime(900, t0 + 0.32);
  bp.Q.value = 0.9;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.11, t0 + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.36);
  src.connect(bp);
  bp.connect(g);
  g.connect(c.destination);
  src.start(t0);
  src.stop(t0 + 0.4);
}

export function playCoverOpen() {
  const c = getCtx();
  if (c.state === "suspended") void c.resume();
  const t0 = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.7, "brown");
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(600, t0);
  lp.frequency.exponentialRampToValueAtTime(240, t0 + 0.6);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.65);
  src.connect(lp);
  lp.connect(g);
  g.connect(c.destination);
  src.start(t0);
  src.stop(t0 + 0.7);
}

export function playPull() {
  const c = getCtx();
  if (c.state === "suspended") void c.resume();
  const t0 = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.45, "brown");
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 420;
  bp.Q.value = 1.4;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.07, t0 + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
  src.connect(bp);
  bp.connect(g);
  g.connect(c.destination);
  src.start(t0);
  src.stop(t0 + 0.45);
}
