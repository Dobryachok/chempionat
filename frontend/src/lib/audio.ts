/**
 * All sounds are synthesised with the Web Audio API, so the prototype ships without
 * any binary audio assets and still has the atmosphere described in the brief.
 */
class AudioEngine {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private enabled = true

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    if (this.master) {
      this.master.gain.value = enabled ? 0.5 : 0
    }
  }

  /** Browsers only allow audio after a user gesture. */
  unlock() {
    const context = this.ensureContext()
    if (context && context.state === 'suspended') {
      void context.resume()
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context
    const Constructor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Constructor) return null
    this.context = new Constructor()
    this.master = this.context.createGain()
    this.master.gain.value = this.enabled ? 0.5 : 0
    this.master.connect(this.context.destination)
    return this.context
  }

  private tone(options: {
    from: number
    to?: number
    duration: number
    type?: OscillatorType
    gain?: number
    delay?: number
  }) {
    const context = this.ensureContext()
    if (!context || !this.master || !this.enabled) return
    const start = context.currentTime + (options.delay ?? 0)
    const oscillator = context.createOscillator()
    const envelope = context.createGain()
    oscillator.type = options.type ?? 'sine'
    oscillator.frequency.setValueAtTime(options.from, start)
    if (options.to && options.to !== options.from) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, options.to), start + options.duration)
    }
    const peak = options.gain ?? 0.25
    envelope.gain.setValueAtTime(0.0001, start)
    envelope.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.03, options.duration / 3))
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + options.duration)
    oscillator.connect(envelope).connect(this.master)
    oscillator.start(start)
    oscillator.stop(start + options.duration + 0.02)
  }

  private noise(duration: number, filterFrom: number, filterTo: number, gain = 0.35) {
    const context = this.ensureContext()
    if (!context || !this.master || !this.enabled) return
    const frames = Math.floor(context.sampleRate * duration)
    const buffer = context.createBuffer(1, frames, context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < frames; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames)
    }
    const source = context.createBufferSource()
    source.buffer = buffer
    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(filterFrom, context.currentTime)
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, filterTo), context.currentTime + duration)
    const envelope = context.createGain()
    envelope.gain.setValueAtTime(gain, context.currentTime)
    envelope.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration)
    source.connect(filter).connect(envelope).connect(this.master)
    source.start()
  }

  /** Random bird chirp used by the animated sky. */
  bird() {
    const base = 1800 + Math.random() * 1200
    this.tone({ from: base, to: base * 1.6, duration: 0.09, type: 'triangle', gain: 0.14 })
    this.tone({ from: base * 1.4, to: base * 0.9, duration: 0.08, type: 'triangle', gain: 0.1, delay: 0.12 })
  }

  /** Short water drop played when a theme is chosen. */
  drop() {
    this.tone({ from: 900, to: 220, duration: 0.22, type: 'sine', gain: 0.3 })
  }

  click() {
    this.tone({ from: 520, to: 660, duration: 0.06, type: 'triangle', gain: 0.16 })
  }

  levelUp(level: number) {
    const base = 620 + level * 40
    this.tone({ from: base, to: base * 1.25, duration: 0.12, type: 'square', gain: 0.12 })
  }

  boost() {
    this.tone({ from: 440, to: 660, duration: 0.12, type: 'triangle', gain: 0.2 })
    this.tone({ from: 660, to: 990, duration: 0.16, type: 'triangle', gain: 0.2, delay: 0.1 })
    this.tone({ from: 990, to: 1320, duration: 0.2, type: 'triangle', gain: 0.18, delay: 0.22 })
  }

  cashout() {
    this.tone({ from: 1046, to: 1046, duration: 0.12, type: 'sine', gain: 0.22 })
    this.tone({ from: 1568, to: 1568, duration: 0.2, type: 'sine', gain: 0.2, delay: 0.09 })
  }

  crash() {
    this.noise(0.55, 2400, 120, 0.4)
    this.tone({ from: 220, to: 60, duration: 0.5, type: 'sawtooth', gain: 0.2 })
  }

  reward() {
    this.tone({ from: 880, to: 1320, duration: 0.18, type: 'sine', gain: 0.18 })
    this.tone({ from: 1320, to: 1760, duration: 0.22, type: 'sine', gain: 0.16, delay: 0.16 })
  }
}

export const audio = new AudioEngine()
