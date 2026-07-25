/**
 * Utility audio murni (tanpa Web Audio API) untuk Live Mock Interview —
 * sengaja pure function/class agar gampang di-unit-test (T-M5-05).
 *
 * Format Gemini Live: input mic PCM16 mono 16kHz (base64), output PCM16 24kHz.
 */

/** Float32 [-1..1] → PCM16 little-endian. */
export function floatTo16BitPcm(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2)
  const view = new DataView(buffer)
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]!))
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return buffer
}

/** PCM16 little-endian → Float32 [-1..1] (untuk playback audio pewawancara). */
export function pcm16ToFloat32(buffer: ArrayBuffer): Float32Array {
  const view = new DataView(buffer)
  const out = new Float32Array(Math.floor(buffer.byteLength / 2))
  for (let i = 0; i < out.length; i++) {
    const s = view.getInt16(i * 2, true)
    out[i] = s < 0 ? s / 0x8000 : s / 0x7fff
  }
  return out
}

/** ArrayBuffer → base64 — chunked agar aman untuk buffer besar. */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

/** RMS level 0..1 — dipakai noise gate & indikator level mic. */
export function computeRms(samples: Float32Array): number {
  if (samples.length === 0) return 0
  let sum = 0
  for (let i = 0; i < samples.length; i++) sum += samples[i]! * samples[i]!
  return Math.sqrt(sum / samples.length)
}

/** Downsample naif (rata-rata per blok) → 16kHz mono untuk input Gemini Live. */
export function downsampleBuffer(input: Float32Array, inputRate: number, targetRate = 16000): Float32Array {
  if (inputRate === targetRate) return input
  if (inputRate < targetRate) {
    throw new Error(`inputRate ${inputRate} lebih kecil dari targetRate ${targetRate}`)
  }
  const ratio = inputRate / targetRate
  const outLength = Math.floor(input.length / ratio)
  const out = new Float32Array(outLength)
  for (let i = 0; i < outLength; i++) {
    const start = Math.floor(i * ratio)
    const end = Math.min(Math.floor((i + 1) * ratio), input.length)
    let sum = 0
    for (let j = start; j < end; j++) sum += input[j]!
    out[i] = end > start ? sum / (end - start) : 0
  }
  return out
}

export type NoiseGateOptions = {
  /** RMS minimum yang dianggap suara (default 0.012 — kalibrasi referensi Career-Vibe). */
  threshold?: number
  /** Frame keras beruntun sebelum gate terbuka — anti letupan/klik. */
  openFrames?: number
  /** Frame senyap sebelum gate menutup — biar ekor kata tidak terpotong. */
  holdFrames?: number
}

/** Noise gate stateful: hanya kirim audio saat kandidat benar-benar bicara. */
export class NoiseGate {
  private threshold: number
  private openFrames: number
  private holdFrames: number
  private loudStreak = 0
  private quietStreak = 0
  private open = false

  constructor(options: NoiseGateOptions = {}) {
    this.threshold = options.threshold ?? 0.012
    this.openFrames = options.openFrames ?? 2
    this.holdFrames = options.holdFrames ?? 12
  }

  /** Proses satu frame; return true bila frame boleh dikirim. */
  process(rms: number): boolean {
    if (rms >= this.threshold) {
      this.loudStreak += 1
      this.quietStreak = 0
      if (!this.open && this.loudStreak >= this.openFrames) this.open = true
    } else {
      this.quietStreak += 1
      this.loudStreak = 0
      if (this.open && this.quietStreak > this.holdFrames) this.open = false
    }
    return this.open
  }

  reset(): void {
    this.loudStreak = 0
    this.quietStreak = 0
    this.open = false
  }
}
