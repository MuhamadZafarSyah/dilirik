import {
  EndSensitivity,
  GoogleGenAI,
  Modality,
  StartSensitivity,
  type LiveServerMessage,
  type Session,
} from "@google/genai"

/**
 * Wrapper tipis di atas Gemini Live API (T-M5-08).
 * Browser connect memakai EPHEMERAL TOKEN dari API Dilirik — GEMINI_API_KEY asli
 * tidak pernah sampai ke browser (perbaikan utama vs referensi Career-Vibe).
 */
export type LiveClientCallbacks = {
  onOpen?: () => void
  /** Chunk audio pewawancara — PCM16 24kHz base64. */
  onAudioChunk?: (base64Pcm24k: string) => void
  /** Potongan transkrip ucapan kandidat (input transcription). */
  onInputTranscript?: (text: string) => void
  /** Potongan transkrip ucapan pewawancara (output transcription). */
  onOutputTranscript?: (text: string) => void
  onTurnComplete?: () => void
  /** Kandidat memotong ucapan — buang antrean audio yang belum terputar. */
  onInterrupted?: () => void
  onError?: (message: string) => void
  onClose?: (reason?: string) => void
}

export class InterviewLiveClient {
  private session: Session | null = null
  private callbacks: LiveClientCallbacks = {}
  private closedByUs = false

  get connected(): boolean {
    return this.session !== null
  }

  async connect(args: {
    token: string
    model: string
    systemInstruction: string
    language: string
    voiceName?: string
    callbacks: LiveClientCallbacks
  }): Promise<void> {
    this.callbacks = args.callbacks
    this.closedByUs = false

    // Ephemeral token dipakai sebagai apiKey — hangus setelah sekali connect.
    const ai = new GoogleGenAI({ apiKey: args.token, httpOptions: { apiVersion: "v1alpha" } })

    this.session = await ai.live.connect({
      model: args.model,
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: args.systemInstruction,
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: args.voiceName ?? "Aoede" } },
          languageCode: args.language === "id" ? "id-ID" : "en-US",
        },
        // Transkrip dua arah — sumber data riwayat & feedback pasca-sesi.
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        realtimeInputConfig: {
          automaticActivityDetection: {
            prefixPaddingMs: 300,
            silenceDurationMs: 2500, // jeda mikir panjang itu wajar saat interview
            startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_LOW,
            endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW,
          },
        },
      },
      callbacks: {
        onopen: () => this.callbacks.onOpen?.(),
        onmessage: (message: LiveServerMessage) => this.handleMessage(message),
        onerror: (event: ErrorEvent) => this.callbacks.onError?.(event.message || "Koneksi live bermasalah"),
        onclose: (event: CloseEvent) => {
          this.session = null
          if (!this.closedByUs) this.callbacks.onClose?.(event.reason || undefined)
        },
      },
    })
  }

  /** Pesan teks pembuka — memancing pewawancara menyapa & bertanya duluan. */
  sendKickoff(text: string): void {
    this.session?.sendClientContent({ turns: [{ role: "user", parts: [{ text }] }], turnComplete: true })
  }

  /** Chunk mic — PCM16 mono 16kHz base64. */
  sendAudioChunk(base64Pcm16k: string): void {
    this.session?.sendRealtimeInput({ audio: { data: base64Pcm16k, mimeType: "audio/pcm;rate=16000" } })
  }

  disconnect(): void {
    this.closedByUs = true
    try {
      this.session?.close()
    } catch {
      // sesi sudah tertutup — aman diabaikan
    }
    this.session = null
  }

  private handleMessage(message: LiveServerMessage): void {
    const content = message.serverContent
    if (!content) return
    if (content.interrupted) this.callbacks.onInterrupted?.()
    if (content.inputTranscription?.text) this.callbacks.onInputTranscript?.(content.inputTranscription.text)
    if (content.outputTranscription?.text) this.callbacks.onOutputTranscript?.(content.outputTranscription.text)
    const parts = content.modelTurn?.parts ?? []
    for (const part of parts) {
      const data = part.inlineData?.data
      if (typeof data === "string" && data.length > 0) this.callbacks.onAudioChunk?.(data)
    }
    if (content.turnComplete) this.callbacks.onTurnComplete?.()
  }
}
