import { BEATS_PER_MINUTE, bassNotes, drumHits, LOOP_BEATS, MELODY, padNotes } from './theme'
import type { Note } from './theme'

type Voice = {
  type: OscillatorType
  gain: number
  attackSeconds: number
  releaseSeconds: number
  cutoffHertz: number
  /** One oscillator per detune, in cents: several slightly apart sound like a section of instruments. */
  detunes: number[]
}

const SECONDS_PER_MINUTE = 60
const A4_MIDI = 69
const A4_HERTZ = 440
const SEMITONES_PER_OCTAVE = 12
const MASTER_GAIN = 0.6
const LOOKAHEAD_SECONDS = 2
const CHECK_MILLISECONDS = 500
const STOP_FADE_SECONDS = 0.05
const STOP_MILLISECONDS = 150
const NOISE_SECONDS = 1
const END_MARGIN_SECONDS = 0.05

const LEAD: Voice = { type: 'sawtooth', gain: 0.1, attackSeconds: 0.03, releaseSeconds: 0.12, cutoffHertz: 2400, detunes: [-7, 7] }
const PAD: Voice = { type: 'triangle', gain: 0.06, attackSeconds: 0.15, releaseSeconds: 0.3, cutoffHertz: 3000, detunes: [0] }
const BASS: Voice = { type: 'square', gain: 0.1, attackSeconds: 0.005, releaseSeconds: 0.06, cutoffHertz: 500, detunes: [0] }

const KICK_GAIN = 0.5
const KICK_START_HERTZ = 140
const KICK_END_HERTZ = 45
const KICK_SECONDS = 0.12
const SNARE_GAIN = 0.22
const SNARE_SECONDS = 0.14
const SNARE_HIGH_PASS_HERTZ = 1200
const HAT_GAIN = 0.05
const HAT_SECONDS = 0.04
const HAT_HIGH_PASS_HERTZ = 7000

function hertzOf(midi: number): number {
  return A4_HERTZ * 2 ** ((midi - A4_MIDI) / SEMITONES_PER_OCTAVE)
}

/**
 * Plays the theme of the game, over and over, with the Web Audio API: a lead of detuned saws, a pad, a bass and drums. It has to be started by
 * a click, as browsers allow nothing else. Everything is made of oscillators and noise, so there is no sound file.
 */
export class MusicPlayer {
  private context: AudioContext | undefined
  private master: GainNode | undefined
  private timer: number | undefined
  private nextLoopSeconds = 0
  private readonly listeners = new Set<() => void>()

  get isPlaying(): boolean {
    return this.context !== undefined
  }

  /** For `useSyncExternalStore`: calls the listener when the music starts or stops. */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  toggle(): void {
    if (this.isPlaying) {
      this.stop()
    } else {
      this.start()
    }
  }

  start(): void {
    const context = new AudioContext()
    this.context = context
    void context.resume()
    const master = context.createGain()
    master.gain.value = MASTER_GAIN
    master.connect(context.destination)
    this.master = master
    this.nextLoopSeconds = context.currentTime + END_MARGIN_SECONDS
    this.scheduleDueLoops(context, master)
    this.timer = window.setInterval(() => this.scheduleDueLoops(context, master), CHECK_MILLISECONDS)
    this.notify()
  }

  stop(): void {
    const context = this.context
    if (context === undefined) {
      return
    }
    window.clearInterval(this.timer)
    this.context = undefined
    this.notify()
    this.master!.gain.setTargetAtTime(0, context.currentTime, STOP_FADE_SECONDS)
    window.setTimeout(() => void context.close(), STOP_MILLISECONDS)
  }

  /** Puts the next loop in the audio graph once it is about to start. */
  private scheduleDueLoops(context: AudioContext, destination: AudioNode): void {
    while (this.nextLoopSeconds < context.currentTime + LOOKAHEAD_SECONDS) {
      renderLoop(context, destination, this.nextLoopSeconds)
      this.nextLoopSeconds += (LOOP_BEATS * SECONDS_PER_MINUTE) / BEATS_PER_MINUTE
    }
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener())
  }
}

/** Schedules every note and drum hit of one loop of the theme, from a time on the clock of the context. */
export function renderLoop(context: BaseAudioContext, destination: AudioNode, startSeconds: number): void {
  const secondsPerBeat = SECONDS_PER_MINUTE / BEATS_PER_MINUTE
  const playNotes = (notes: Note[], voice: Voice): void => {
    for (const note of notes) {
      playNote(context, destination, voice, startSeconds + note.start * secondsPerBeat, note.length * secondsPerBeat, hertzOf(note.midi))
    }
  }
  playNotes(MELODY, LEAD)
  playNotes(padNotes(), PAD)
  playNotes(bassNotes(), BASS)
  const noise = noiseBuffer(context)
  const hits = drumHits()
  hits.kick.forEach((beat) => playKick(context, destination, startSeconds + beat * secondsPerBeat))
  hits.snare.forEach((beat) => playNoise(context, destination, noise, startSeconds + beat * secondsPerBeat, SNARE_SECONDS, SNARE_GAIN, SNARE_HIGH_PASS_HERTZ))
  hits.hat.forEach((beat) => playNoise(context, destination, noise, startSeconds + beat * secondsPerBeat, HAT_SECONDS, HAT_GAIN, HAT_HIGH_PASS_HERTZ))
}

/** One note of a voice: its oscillators through a low-pass filter, with a swell at the start and a fade at the end. */
function playNote(context: BaseAudioContext, destination: AudioNode, voice: Voice, whenSeconds: number, lengthSeconds: number, hertz: number): void {
  const envelope = context.createGain()
  envelope.gain.setValueAtTime(0, whenSeconds)
  envelope.gain.linearRampToValueAtTime(voice.gain, whenSeconds + voice.attackSeconds)
  envelope.gain.setValueAtTime(voice.gain, whenSeconds + lengthSeconds)
  envelope.gain.linearRampToValueAtTime(0, whenSeconds + lengthSeconds + voice.releaseSeconds)
  const filter = context.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = voice.cutoffHertz
  filter.connect(envelope)
  envelope.connect(destination)
  for (const detune of voice.detunes) {
    const oscillator = context.createOscillator()
    oscillator.type = voice.type
    oscillator.frequency.value = hertz
    oscillator.detune.value = detune
    oscillator.connect(filter)
    oscillator.start(whenSeconds)
    oscillator.stop(whenSeconds + lengthSeconds + voice.releaseSeconds + END_MARGIN_SECONDS)
  }
}

function playKick(context: BaseAudioContext, destination: AudioNode, whenSeconds: number): void {
  const oscillator = context.createOscillator()
  const envelope = context.createGain()
  oscillator.frequency.setValueAtTime(KICK_START_HERTZ, whenSeconds)
  oscillator.frequency.exponentialRampToValueAtTime(KICK_END_HERTZ, whenSeconds + KICK_SECONDS)
  envelope.gain.setValueAtTime(KICK_GAIN, whenSeconds)
  envelope.gain.exponentialRampToValueAtTime(0.001, whenSeconds + KICK_SECONDS)
  oscillator.connect(envelope)
  envelope.connect(destination)
  oscillator.start(whenSeconds)
  oscillator.stop(whenSeconds + KICK_SECONDS + END_MARGIN_SECONDS)
}

/** A burst of noise through a high-pass filter, which fades away: the snare and the hat. */
function playNoise(context: BaseAudioContext, destination: AudioNode, noise: AudioBuffer, whenSeconds: number, lengthSeconds: number, gain: number, highPassHertz: number): void {
  const source = context.createBufferSource()
  source.buffer = noise
  const filter = context.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = highPassHertz
  const envelope = context.createGain()
  envelope.gain.setValueAtTime(gain, whenSeconds)
  envelope.gain.exponentialRampToValueAtTime(0.001, whenSeconds + lengthSeconds)
  source.connect(filter)
  filter.connect(envelope)
  envelope.connect(destination)
  source.start(whenSeconds)
  source.stop(whenSeconds + lengthSeconds + END_MARGIN_SECONDS)
}

function noiseBuffer(context: BaseAudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, context.sampleRate * NOISE_SECONDS, context.sampleRate)
  const samples = buffer.getChannelData(0)
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = Math.random() * 2 - 1
  }
  return buffer
}

export const music = new MusicPlayer()
