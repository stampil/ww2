import { assetUrl } from '../assetUrl'
import { music } from './MusicPlayer'

const SOUND_FILES = {
  engine: 'audio/engine-loop.mp3',
  takeoff: 'audio/takeoff.mp3',
  landing: 'audio/landing.mp3',
} as const

export type SoundName = keyof typeof SOUND_FILES

const VOLUME = 0.5

/** A sound that plays, which can be stopped before or after it has begun. */
export type PlayingSound = { stop(): void }

/**
 * The sounds of the aircraft, engine, takeoff and landing, which play only while the music is on: the button of the music is the switch of all the sound of the game.
 * The files are loaded the first time they are asked for.
 */
class SoundEffects {
  private context: AudioContext | undefined
  private readonly buffers = new Map<SoundName, Promise<AudioBuffer>>()

  /** Plays the sound once. */
  play(name: SoundName): PlayingSound {
    return this.start(name, false)
  }

  /** Plays the sound over and over until it is stopped. */
  loop(name: SoundName): PlayingSound {
    return this.start(name, true)
  }

  private start(name: SoundName, repeats: boolean): PlayingSound {
    let isStopped = false
    let source: AudioBufferSourceNode | undefined
    if (music.isOn) {
      void this.bufferOf(name).then((buffer) => {
        if (isStopped || !music.isOn) {
          return
        }
        const context = this.audioContext()
        const gain = context.createGain()
        gain.gain.value = VOLUME
        gain.connect(context.destination)
        source = context.createBufferSource()
        source.buffer = buffer
        source.loop = repeats
        source.connect(gain)
        source.start()
      })
    }
    return {
      stop: () => {
        isStopped = true
        source?.stop()
      },
    }
  }

  private audioContext(): AudioContext {
    this.context ??= new AudioContext()
    void this.context.resume()
    return this.context
  }

  private bufferOf(name: SoundName): Promise<AudioBuffer> {
    let buffer = this.buffers.get(name)
    if (buffer === undefined) {
      buffer = fetch(assetUrl(SOUND_FILES[name]))
        .then((response) => response.arrayBuffer())
        .then((bytes) => this.audioContext().decodeAudioData(bytes))
      this.buffers.set(name, buffer)
    }

    return buffer
  }
}

export const effects = new SoundEffects()
