// AudioWorkletProcessor: converts incoming mono float32 audio (at the
// AudioContext's native rate) to 16kHz mono PCM16LE, buffers ~20ms chunks,
// and posts each chunk's ArrayBuffer to the main thread as a transferable.
//
// Always resamples via linear interpolation driven by the real native
// `sampleRate` global (AudioWorkletGlobalScope), rather than trusting that
// `new AudioContext({sampleRate: 16000})` was honored by the browser --
// correctness shouldn't depend on that hint being respected.

const TARGET_SAMPLE_RATE = 16000;
const CHUNK_MS = 20;
const CHUNK_SAMPLES = Math.round((TARGET_SAMPLE_RATE * CHUNK_MS) / 1000); // 320

class PCMDownsamplerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._ratio = sampleRate / TARGET_SAMPLE_RATE;
    this._outBuffer = new Int16Array(CHUNK_SAMPLES);
    this._outIndex = 0;
    this._resamplePos = 0;
    this._prevSample = 0;
  }

  process(inputs) {
    const channelData = inputs[0] && inputs[0][0];
    if (!channelData || channelData.length === 0) return true;

    let pos = this._resamplePos;
    const ratio = this._ratio;
    const n = channelData.length;

    while (pos < n) {
      const idx = Math.floor(pos);
      const frac = pos - idx;
      const s0 = idx === 0 ? this._prevSample : channelData[idx - 1];
      const s1 = channelData[idx];
      const sample = s0 + (s1 - s0) * frac;

      const clamped = Math.max(-1, Math.min(1, sample));
      this._outBuffer[this._outIndex++] = clamped < 0 ? clamped * 32768 : clamped * 32767;

      if (this._outIndex >= CHUNK_SAMPLES) {
        this.port.postMessage(this._outBuffer.buffer, [this._outBuffer.buffer]);
        this._outBuffer = new Int16Array(CHUNK_SAMPLES);
        this._outIndex = 0;
      }
      pos += ratio;
    }

    this._resamplePos = pos - n;
    this._prevSample = channelData[n - 1];
    return true;
  }
}

registerProcessor("pcm-downsampler", PCMDownsamplerProcessor);
