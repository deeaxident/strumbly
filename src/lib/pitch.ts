const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

export function noteFromMidi(midi: number) {
  return { name: NOTE_NAMES[((midi % 12) + 12) % 12] ?? "–", freq: 440 * 2 ** ((midi - 69) / 12) };
}

export function describePitch(frequency: number, targets: number[]) {
  const midi = 69 + 12 * Math.log2(frequency / 440);
  let targetIndex = 0;
  let distance = Infinity;
  targets.forEach((target, index) => {
    const current = Math.abs(midi - target);
    if (current < distance) { distance = current; targetIndex = index; }
  });
  const targetMidi = targets[targetIndex] ?? 40;
  return { nearestNote: noteFromMidi(Math.round(midi)).name, targetIndex, cents: (midi - targetMidi) * 100 };
}

/** Normalized autocorrelation on a downsampled signal, with sub-sample peak interpolation.
 * Reuses working buffers; bounds lag search to the guitar's useful pitch range. */
export function createPitchDetector(bufferSize: number, sampleRate: number) {
  const stride = Math.max(1, Math.floor(sampleRate / 12000));
  const rate = sampleRate / stride;
  const size = Math.floor(bufferSize / stride);
  const samples = new Float32Array(size);
  const maxLag = Math.min(size - 2, Math.ceil(rate / 50));
  const minLag = Math.max(2, Math.floor(rate / 1000));
  const correlation = new Float32Array(maxLag + 2);

  return (input: Float32Array): number | null => {
    let mean = 0;
    for (let i = 0; i < size; i++) {
      let sum = 0;
      for (let j = 0; j < stride; j++) sum += input[i * stride + j] ?? 0;
      samples[i] = sum / stride;
      mean += samples[i] ?? 0;
    }
    mean /= size;
    let energy = 0;
    for (let i = 0; i < size; i++) {
      const value = (samples[i] ?? 0) - mean;
      samples[i] = value;
      energy += value * value;
    }
    if (Math.sqrt(energy / size) < 0.003) return null;

    let maximum = 0;
    for (let lag = minLag - 1; lag <= maxLag + 1; lag++) {
      let product = 0, norm = 0;
      for (let i = 0; i < size - lag; i++) {
        const a = samples[i] ?? 0, b = samples[i + lag] ?? 0;
        product += a * b;
        norm += a * a + b * b;
      }
      const value = norm > 0 ? 2 * product / norm : 0;
      correlation[lag] = value;
      if (value > maximum) maximum = value;
    }
    if (maximum < 0.75) return null;
    // Skip the zero-lag lobe, then take the first strong periodic peak, not a later multiple.
    let crossedZero = false;
    for (let lag = minLag; lag <= maxLag; lag++) {
      const left = correlation[lag - 1] ?? 0;
      const center = correlation[lag] ?? 0;
      const right = correlation[lag + 1] ?? 0;
      if (center < 0) crossedZero = true;
      if (!crossedZero || center < maximum * 0.93 || center < left || center < right) continue;
      const denominator = left - 2 * center + right;
      const offset = denominator === 0 ? 0 : Math.max(-0.5, Math.min(0.5, (left - right) / (2 * denominator)));
      return rate / (lag + offset);
    }
    return null;
  };
}