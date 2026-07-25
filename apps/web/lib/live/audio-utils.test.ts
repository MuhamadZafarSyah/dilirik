import { describe, expect, it } from "vitest"
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  computeRms,
  downsampleBuffer,
  floatTo16BitPcm,
  NoiseGate,
  pcm16ToFloat32,
} from "./audio-utils"

describe("audio-utils", () => {
  it("roundtrip float → pcm16 → float mendekati nilai awal", () => {
    const input = new Float32Array([0, 0.5, -0.5, 1, -1, 0.25])
    const out = pcm16ToFloat32(floatTo16BitPcm(input))
    expect(out.length).toBe(input.length)
    for (let i = 0; i < input.length; i++) {
      expect(Math.abs(out[i]! - input[i]!)).toBeLessThan(0.001)
    }
  })

  it("roundtrip base64 mempertahankan byte", () => {
    const buffer = floatTo16BitPcm(new Float32Array([0.1, -0.2, 0.3]))
    const roundtrip = base64ToArrayBuffer(arrayBufferToBase64(buffer))
    expect(new Uint8Array(roundtrip)).toEqual(new Uint8Array(buffer))
  })

  it("computeRms: sinyal konstan 0.5 → rms 0.5, senyap → 0", () => {
    expect(computeRms(new Float32Array(256).fill(0.5))).toBeCloseTo(0.5, 5)
    expect(computeRms(new Float32Array(256))).toBe(0)
    expect(computeRms(new Float32Array(0))).toBe(0)
  })

  it("downsampleBuffer 48k → 16k memotong jumlah sampel jadi 1/3", () => {
    const input = new Float32Array(4800).fill(0.4)
    const out = downsampleBuffer(input, 48000, 16000)
    expect(out.length).toBe(1600)
    expect(out[0]).toBeCloseTo(0.4, 5)
  })

  it("downsampleBuffer menolak upsample", () => {
    expect(() => downsampleBuffer(new Float32Array(10), 8000, 16000)).toThrow()
  })

  describe("NoiseGate", () => {
    it("terbuka setelah openFrames frame keras beruntun", () => {
      const gate = new NoiseGate({ threshold: 0.012, openFrames: 2, holdFrames: 12 })
      expect(gate.process(0.5)).toBe(false) // frame keras pertama — belum cukup
      expect(gate.process(0.5)).toBe(true) // frame kedua → terbuka
    })

    it("tetap terbuka selama holdFrames frame senyap (ekor kata aman)", () => {
      const gate = new NoiseGate({ threshold: 0.012, openFrames: 2, holdFrames: 3 })
      gate.process(0.5)
      gate.process(0.5)
      expect(gate.process(0.001)).toBe(true) // senyap 1
      expect(gate.process(0.001)).toBe(true) // senyap 2
      expect(gate.process(0.001)).toBe(true) // senyap 3 (masih hold)
      expect(gate.process(0.001)).toBe(false) // senyap 4 → menutup
    })

    it("letupan satu frame tidak membuka gate", () => {
      const gate = new NoiseGate({ threshold: 0.012, openFrames: 2, holdFrames: 3 })
      expect(gate.process(0.9)).toBe(false)
      expect(gate.process(0.001)).toBe(false) // streak putus → tetap tertutup
    })
  })
})
