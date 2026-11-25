import { DEFAULT_MOOD, MOODS } from './moods'
import type { Mood, MoodSettings } from './moods'
import { bassNotes, drumHits, harmonyNotes, LOOP_BEATS, MELODY, stabNotes } from './theme'
import type { Note } from './theme'

type Voice = {
  type: OscillatorType
  gain: number
  attackSeconds: number
  releaseSeconds: number
  cutoffHertz: number
  /** How long the filter takes to open at the start of a note: the blare of brass. */
  swellSeconds: number
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
const MOOD_FADE_SECONDS = 0.3
const MOOD_DISCONNECT_MILLISECONDS = 3000
// The notes the march lowers to turn minor, as pitch classes: the third (D), the sixth (G) and the seventh (A) of B flat.
const MINOR_LOWERED_PITCH_CLASSES = [2, 7, 9]
const MINOR_LOWERING_SEMITONES = 1
// The legato of the parts that are not the tune: their notes keep their length.
const NO_LEGATO = 1
const STOP_FADE_SECONDS = 0.05
const STOP_MILLISECONDS = 150
const NOISE_SECONDS = 1
const END_MARGIN_SECONDS = 0.05
const CHOICE_KEY = 'french-touch-music'
const CHOICE_OFF = 'off'
const CHOICE_ON = 'on'
// The first of these that the player does, anywhere on the page, lets the music start.
const GESTURE_EVENTS = ['pointerdown', 'keydown']

const SWELL_START_SHARE = 0.3

const LEAD: Voice = { type: 'sawtooth', gain: 0.1, attackSeconds: 0.03, releaseSeconds: 0.12, cutoffHertz: 2600, swellSeconds: 0.09, detunes: [-6, 6] }
const HARMONY: Voice = { type: 'sawtooth', gain: 0.07, attackSeconds: 0.03, releaseSeconds: 0.12, cutoffHertz: 2000, swellSeconds: 0.09, detunes: [-4, 4] }
const STABS: Voice = { type: 'sawtooth', gain: 0.04, attackSeconds: 0.02, releaseSeconds: 0.08, cutoffHertz: 1500, swellSeconds: 0.06, detunes: [0] }
const BASS: Voice = { type: 'square', gain: 0.1, attackSeconds: 0.005, releaseSeconds: 0.06, cutoffHertz: 500, swellSeconds: 0.02, detunes: [0] }

const KICK_GAIN = 0.5
const KICK_START_HERTZ = 140
const KICK_END_HERTZ = 45
const KICK_SECONDS = 0.12
const SNARE_GAIN = 0.22
const SNARE_SECONDS = 0.14
const SNARE_HIGH_PASS_HERTZ = 1200
const GHOST_GAIN = 0.08
const GHOST_SECONDS = 0.06
const CRASH_GAIN = 0.14
const CRASH_SECONDS = 0.9
const CRASH_HIGH_PASS_HERTZ = 4500

function hertzOf(midi: number): number {
  return A4_HERTZ * 2 ** ((midi - A4_MIDI) / SEMITONES_PER_OCTAVE)
}

/** The note as the mood plays it: lowered a semitone if it is one the minor mode lowers, then moved up or down. */
function pitchOf(midi: number, mood: MoodSettings): number {
  const lowered = mood.isMinor && MINOR_LOWERED_PITCH_CLASSES.includes(midi % SEMITONES_PER_OCTAVE) ? midi - MINOR_LOWERING_SEMITONES : midi
  return lowered + mood.transposeSemitones
}

/** Whether the player has not turned the music off; it is on until they do. */
function wantsMusic(): boolean {
  try {
    return localStorage.getItem(CHOICE_KEY) !== CHOICE_OFF
  } catch {
    return true
  }
}

function rememberChoice(wantsIt: boolean): void {
  try {
    localStorage.setItem(CHOICE_KEY, wantsIt ? CHOICE_ON : CHOICE_OFF)
  } catch {
    // Storage is refused (a private window, for one): the choice only lasts until the page is closed.
  }
}

/**
 * Plays the theme of the game, over and over, with the Web Audio API: a brass fanfare of detuned saws, a bass and a march on the drums. Browsers allow sound only
 * after a gesture of the player, so the music starts at the first click or key, unless the player has turned it off; their choice is kept.
 * Everything is made of oscillators and noise, so there is no sound file.
 */
export class MusicPlayer {
  private context: AudioContext | undefined
  private master: GainNode | undefined
  // What the loops of the mood being played go through: it fades out when another mood takes over.
  private bus: GainNode | undefined
  private timer: number | undefined
  private nextLoopSeconds = 0
  private playedMood: Mood = DEFAULT_MOOD
  // The moods asked for, the last one first to be heard: when it is taken back, the one before plays again.
  private readonly askedMoods: Mood[] = []
  private isWaitingForGesture = false
  private readonly listeners = new Set<() => void>()

  get isPlaying(): boolean {
    return this.context !== undefined
  }

  /** Whether the music is on: it plays, or it will as soon as the player does something on the page. */
  get isOn(): boolean {
    return this.isPlaying || this.isWaitingForGesture
  }

  /** For `useSyncExternalStore`: calls the listener when the music starts or stops. */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Turns the music on or off, and keeps the choice for the next visit. */
  toggle(): void {
    if (this.isOn) {
      this.isWaitingForGesture = false
      this.stop()
      rememberChoice(false)
    } else {
      this.start()
      rememberChoice(true)
    }
    this.notify()
  }

  /** Starts the music at the first gesture of the player, unless they have turned it off; a click on the music button is not that gesture. */
  startOnFirstGesture(): void {
    if (this.isOn || !wantsMusic()) {
      return
    }
    this.isWaitingForGesture = true
    const begin = (event: Event): void => {
      if (event.target instanceof Element && event.target.closest('.music-toggle') !== null) {
        return
      }
      GESTURE_EVENTS.forEach((name) => window.removeEventListener(name, begin))
      if (this.isWaitingForGesture) {
        this.isWaitingForGesture = false
        this.start()
      }
    }
    GESTURE_EVENTS.forEach((name) => window.addEventListener(name, begin))
    this.notify()
  }

  start(): void {
    const context = new AudioContext()
    this.context = context
    void context.resume()
    const master = context.createGain()
    master.gain.value = MASTER_GAIN
    master.connect(context.destination)
    this.master = master
    this.bus = this.newBus(context)
    this.nextLoopSeconds = context.currentTime + END_MARGIN_SECONDS
    this.scheduleDueLoops(context)
    this.timer = window.setInterval(() => this.scheduleDueLoops(context), CHECK_MILLISECONDS)
    this.notify()
  }

  /** Asks for a mood of the theme until the returned function is called; the last mood asked for is the one played. */
  pushMood(mood: Mood): () => void {
    this.askedMoods.push(mood)
    this.followAskedMoods()

    return () => {
      this.askedMoods.splice(this.askedMoods.lastIndexOf(mood), 1)
      this.followAskedMoods()
    }
  }

  stop(): void {
    const context = this.context
    if (context === undefined) {
      return
    }
    window.clearInterval(this.timer)
    this.context = undefined
    this.bus = undefined
    this.notify()
    this.master!.gain.setTargetAtTime(0, context.currentTime, STOP_FADE_SECONDS)
    window.setTimeout(() => void context.close(), STOP_MILLISECONDS)
  }

  /** Puts the next loop in the audio graph once it is about to start. */
  private scheduleDueLoops(context: AudioContext): void {
    const mood = MOODS[this.playedMood]
    while (this.nextLoopSeconds < context.currentTime + LOOKAHEAD_SECONDS) {
      renderLoop(context, this.bus!, this.nextLoopSeconds, mood)
      this.nextLoopSeconds += (LOOP_BEATS * SECONDS_PER_MINUTE) / mood.beatsPerMinute
    }
  }

  private newBus(context: AudioContext): GainNode {
    const bus = context.createGain()
    bus.connect(this.master!)

    return bus
  }

  /** Plays the mood asked for last, or the march when none is asked for: the loops of the mood before fade out and the new mood starts from its fanfare. */
  private followAskedMoods(): void {
    const wanted = this.askedMoods[this.askedMoods.length - 1] ?? DEFAULT_MOOD
    if (wanted === this.playedMood) {
      return
    }
    this.playedMood = wanted
    const context = this.context
    if (context === undefined) {
      return
    }
    const previousBus = this.bus!
    previousBus.gain.setTargetAtTime(0, context.currentTime, MOOD_FADE_SECONDS)
    window.setTimeout(() => previousBus.disconnect(), MOOD_DISCONNECT_MILLISECONDS)
    this.bus = this.newBus(context)
    this.nextLoopSeconds = context.currentTime + END_MARGIN_SECONDS
    this.scheduleDueLoops(context)
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener())
  }
}

/** Schedules every note and drum hit of one loop of the theme in a mood, from a time on the clock of the context. */
export function renderLoop(context: BaseAudioContext, destination: AudioNode, startSeconds: number, mood: MoodSettings): void {
  const secondsPerBeat = SECONDS_PER_MINUTE / mood.beatsPerMinute
  const playNotes = (notes: Note[], voice: Voice, legato: number): void => {
    const brightVoice = { ...voice, cutoffHertz: voice.cutoffHertz * mood.brightness }
    for (const note of notes) {
      playNote(context, destination, brightVoice, startSeconds + note.start * secondsPerBeat, note.length * secondsPerBeat * legato, hertzOf(pitchOf(note.midi, mood)))
    }
  }
  playNotes(MELODY, LEAD, mood.legato)
  if (mood.parts.harmony) {
    playNotes(harmonyNotes(), HARMONY, mood.legato)
  }
  if (mood.parts.stabs) {
    playNotes(stabNotes(), STABS, NO_LEGATO)
  }
  if (mood.parts.bass) {
    playNotes(bassNotes(), BASS, NO_LEGATO)
  }
  if (mood.parts.drums === 'none') {
    return
  }
  const hits = drumHits()
  hits.kick.forEach((beat) => playKick(context, destination, startSeconds + beat * secondsPerBeat))
  if (mood.parts.drums === 'kick') {
    return
  }
  const noise = noiseBuffer(context)
  hits.snare.forEach((beat) => playNoise(context, destination, noise, startSeconds + beat * secondsPerBeat, SNARE_SECONDS, SNARE_GAIN, SNARE_HIGH_PASS_HERTZ))
  hits.ghost.forEach((beat) => playNoise(context, destination, noise, startSeconds + beat * secondsPerBeat, GHOST_SECONDS, GHOST_GAIN, SNARE_HIGH_PASS_HERTZ))
  hits.crash.forEach((beat) => playNoise(context, destination, noise, startSeconds + beat * secondsPerBeat, CRASH_SECONDS, CRASH_GAIN, CRASH_HIGH_PASS_HERTZ))
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
  filter.frequency.setValueAtTime(voice.cutoffHertz * SWELL_START_SHARE, whenSeconds)
  filter.frequency.linearRampToValueAtTime(voice.cutoffHertz, whenSeconds + voice.swellSeconds)
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

/** A burst of noise through a high-pass filter, which fades away: the snare and the cymbal. */
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
