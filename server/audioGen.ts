import crypto from 'crypto';

interface TrackPreset {
  bpm: number;
  rootHz: number;
  scale: number[];
  style: 'bollywood' | 'punjabi' | 'english' | 'bhojpuri' | 'lofi';
  durationSec: number;
}

const PRESETS: Record<string, TrackPreset> = {
  'chaand-ni-raat': {bpm: 92, rootHz: 220, scale: [0, 2, 4, 6, 7, 9, 11], style: 'bollywood', durationSec: 48},
  'baarish-echoes': {bpm: 84, rootHz: 196, scale: [0, 2, 3, 5, 7, 8, 10], style: 'lofi', durationSec: 45},
  'ishq-ka-safar': {bpm: 102, rootHz: 246.94, scale: [0, 2, 4, 5, 7, 9, 11], style: 'bollywood', durationSec: 50},
  'mehfil-e-shab': {bpm: 88, rootHz: 185, scale: [0, 1, 4, 5, 7, 8, 11], style: 'bollywood', durationSec: 46},
  'pind-di-hawa': {bpm: 118, rootHz: 146.83, scale: [0, 2, 4, 7, 9], style: 'punjabi', durationSec: 44},
  'amber-bhangra': {bpm: 124, rootHz: 164.81, scale: [0, 2, 5, 7, 9, 10], style: 'punjabi', durationSec: 42},
  'patiala-nights': {bpm: 112, rootHz: 174.61, scale: [0, 2, 3, 5, 7, 10], style: 'punjabi', durationSec: 46},
  'midnight-velvet': {bpm: 116, rootHz: 130.81, scale: [0, 3, 5, 7, 10], style: 'english', durationSec: 48},
  'glass-horizon': {bpm: 120, rootHz: 146.83, scale: [0, 2, 4, 7, 9, 11], style: 'english', durationSec: 46},
  'static-bloom': {bpm: 108, rootHz: 196, scale: [0, 2, 3, 7, 8], style: 'english', durationSec: 44},
  'neon-afterglow': {bpm: 122, rootHz: 164.81, scale: [0, 3, 5, 7, 10, 12], style: 'english', durationSec: 45},
  'ganga-kinare': {bpm: 96, rootHz: 220, scale: [0, 2, 4, 7, 9], style: 'bhojpuri', durationSec: 45},
  'sawan-jhoola': {bpm: 104, rootHz: 196, scale: [0, 2, 4, 5, 7, 9], style: 'bhojpuri', durationSec: 44},
  'desh-matiya': {bpm: 110, rootHz: 174.61, scale: [0, 2, 4, 7, 9], style: 'bhojpuri', durationSec: 42},
  'sitara-glow': {bpm: 98, rootHz: 207.65, scale: [0, 2, 4, 6, 7, 9, 11], style: 'bollywood', durationSec: 47},
  'aurora-drive': {bpm: 118, rootHz: 155.56, scale: [0, 2, 3, 5, 7, 10], style: 'english', durationSec: 46},
};

const wavCache = new Map<string, Buffer>();

function seededRand(seedStr: string) {
  const hash = crypto.createHash('sha256').update(seedStr).digest();
  let state = hash.readUInt32LE(0) || 123456789;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function midiRatio(semitones: number): number {
  return Math.pow(2, semitones / 12);
}

export function getOrGenerateWav(slug: string): Buffer {
  const cleanSlug = slug.replace(/\.wav$/i, '').toLowerCase();
  const cached = wavCache.get(cleanSlug);
  if (cached) return cached;

  const preset: TrackPreset = PRESETS[cleanSlug] || {
    bpm: 105,
    rootHz: 196,
    scale: [0, 2, 4, 7, 9],
    style: 'english',
    durationSec: 44,
  };

  const sampleRate = 22050;
  const numChannels = 2;
  const bitsPerSample = 16;
  const totalSamples = Math.floor(sampleRate * preset.durationSec);
  const dataSize = totalSamples * numChannels * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF/WAV Header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  const rand = seededRand(cleanSlug);
  const beatDur = 60 / preset.bpm;
  const sixteenthDur = beatDur / 4;

  // Deterministic 16-step melody and chord progression
  const chordRoots = [0, 5, 7, 3].map((idx) => preset.scale[idx % preset.scale.length]);
  const melodyPattern: number[] = [];
  for (let i = 0; i < 32; i++) {
    if (rand() < 0.28) {
      melodyPattern.push(-1);
    } else {
      const deg = preset.scale[Math.floor(rand() * preset.scale.length)];
      melodyPattern.push(deg + (rand() > 0.72 ? 12 : 0));
    }
  }

  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const step = Math.floor(t / sixteenthDur);
    const stepPos = (t % sixteenthDur) / sixteenthDur;
    const beatPos = (t % beatDur) / beatDur;
    const barIdx = Math.floor(t / (beatDur * 4)) % 4;

    const chordSemi = chordRoots[barIdx];
    const bassFreq = preset.rootHz * 0.5 * midiRatio(chordSemi);

    // Warm sub-bass with gentle pluck envelope
    const bassEnv = Math.exp(-beatPos * (preset.style === 'punjabi' ? 4.5 : 2.8));
    const bass = Math.sin(2 * Math.PI * bassFreq * t) * 0.24 * bassEnv;

    // Pad chord (root + third + fifth + seventh)
    const third = preset.scale[(barIdx + 2) % preset.scale.length];
    const fifth = preset.scale[(barIdx + 4) % preset.scale.length];
    const padFreq1 = preset.rootHz * midiRatio(chordSemi);
    const padFreq2 = preset.rootHz * midiRatio(third);
    const padFreq3 = preset.rootHz * midiRatio(fifth);
    const pad =
      (Math.sin(2 * Math.PI * padFreq1 * t) +
        0.75 * Math.sin(2 * Math.PI * padFreq2 * t) +
        0.65 * Math.sin(2 * Math.PI * padFreq3 * t)) *
      0.085;

    // Melodic lead voice
    const melSemi = melodyPattern[step % melodyPattern.length];
    let leadL = 0;
    let leadR = 0;
    if (melSemi >= 0) {
      const melFreq = preset.rootHz * 2 * midiRatio(melSemi);
      const env = Math.min(1, stepPos * 18) * Math.exp(-stepPos * 3.8);
      const harmonic =
        preset.style === 'bollywood' || preset.style === 'bhojpuri'
          ? Math.sin(2 * Math.PI * melFreq * t) + 0.35 * Math.sin(4 * Math.PI * melFreq * t)
          : Math.sin(2 * Math.PI * melFreq * t) + 0.22 * Math.sin(6 * Math.PI * melFreq * t);
      const pan = 0.5 + 0.25 * Math.sin(t * 0.8);
      leadL = harmonic * env * 0.16 * (1 - pan * 0.4);
      leadR = harmonic * env * 0.16 * (0.6 + pan * 0.4);
    }

    // Soft rhythmic percussion
    let kick = 0;
    if (step % 4 === 0 || (preset.style === 'punjabi' && step % 8 === 6)) {
      const kEnv = Math.exp(-stepPos * 16);
      const kFreq = 135 * Math.exp(-stepPos * 18) + 46;
      kick = Math.sin(2 * Math.PI * kFreq * stepPos * sixteenthDur) * kEnv * 0.28;
    }

    let hat = 0;
    if (step % 2 === 1 && preset.style !== 'lofi') {
      const hEnv = Math.exp(-stepPos * 28);
      const noise = Math.sin(i * 12.9898) * 43758.5453;
      const frac = noise - Math.floor(noise) - 0.5;
      hat = frac * hEnv * 0.055;
    }

    // Smooth fade-in and fade-out at track edges
    const edgeFade = Math.min(1, t / 1.2, (preset.durationSec - t) / 1.8);

    const sampleL = Math.max(-0.95, Math.min(0.95, (bass + pad + leadL + kick + hat) * edgeFade));
    const sampleR = Math.max(-0.95, Math.min(0.95, (bass + pad + leadR + kick - hat * 0.6) * edgeFade));

    buffer.writeInt16LE(Math.round(sampleL * 32767), offset);
    buffer.writeInt16LE(Math.round(sampleR * 32767), offset + 2);
    offset += 4;
  }

  if (wavCache.size >= 24) {
    const oldestKey = wavCache.keys().next().value;
    if (oldestKey) wavCache.delete(oldestKey);
  }
  wavCache.set(cleanSlug, buffer);
  return buffer;
}
