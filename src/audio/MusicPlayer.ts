import { assetUrl } from '../assetUrl'

/** The jingles that play over the general music: the one of a success and the one of a failure. */
export type Jingle = 'success' | 'failure'

const GENERAL_FILE = 'audio/music-general.mp3'
const JINGLE_FILES: Record<Jingle, string> = { success: 'audio/jingle-success.mp3', failure: 'audio/jingle-failure.mp3' }
const GENERAL_VOLUME = 0.5
const JINGLE_VOLUME = 0.8
const FADE_MILLISECONDS = 500
const FADE_STEP_MILLISECONDS = 50
const CHOICE_KEY = 'french-touch-music'
const CHOICE_OFF = 'off'
const CHOICE_ON = 'on'
// The first of these that the player does, anywhere on the page, lets the music start.
const GESTURE_EVENTS = ['pointerdown', 'keydown']

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
 * Plays the music of the game, a track that goes round and round, and over it the jingle of a success or of a failure while something asks for one: the track waits, the jingle plays
 * until what asked for it is gone (it fades out then) or until it ends, and the track goes on from where it stopped. Browsers allow sound only after a gesture of the player, so the music
 * starts at the first click or key, unless the player has turned it off; their choice is kept.
 */
export class MusicPlayer {
  private general: HTMLAudioElement | undefined
  private jingles: Record<Jingle, HTMLAudioElement> | undefined
  private playedJingle: Jingle | null = null
  // The jingles asked for, the last one first to be heard: when it is given back, the one before plays again.
  private readonly askedJingles: Jingle[] = []
  private readonly fades = new Map<HTMLAudioElement, number>()
  private isWaitingForGesture = false
  private readonly listeners = new Set<() => void>()

  get isPlaying(): boolean {
    return this.general !== undefined
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
    const general = new Audio(assetUrl(GENERAL_FILE))
    general.loop = true
    general.volume = GENERAL_VOLUME
    this.general = general
    this.jingles = { success: this.newJingle('success'), failure: this.newJingle('failure') }
    this.playedJingle = null
    void general.play()
    this.followAskedJingles()
    this.notify()
  }

  stop(): void {
    if (this.general === undefined) {
      return
    }
    this.general.pause()
    Object.values(this.jingles!).forEach((jingle) => jingle.pause())
    this.general = undefined
    this.jingles = undefined
    this.notify()
  }

  /** Asks for the jingle of a success or of a failure until the returned function is called; the last jingle asked for is the one played. */
  pushJingle(jingle: Jingle): () => void {
    this.askedJingles.push(jingle)
    this.followAskedJingles()

    return () => {
      this.askedJingles.splice(this.askedJingles.lastIndexOf(jingle), 1)
      this.followAskedJingles()
    }
  }

  /**
   * A jingle, made ready: it is played silent and stopped at once, in the gesture that starts the music, so that the browsers that only let a sound start inside a gesture let it start later.
   * When it ends before what asked for it is gone, the track goes on.
   */
  private newJingle(jingle: Jingle): HTMLAudioElement {
    const audio = new Audio(assetUrl(JINGLE_FILES[jingle]))
    audio.volume = 0
    void audio.play().then(() => {
      if (this.playedJingle !== jingle) {
        audio.pause()
        audio.currentTime = 0
      }
      audio.volume = JINGLE_VOLUME
    })
    audio.addEventListener('ended', () => void this.general?.play())

    return audio
  }

  /** Plays what is asked for now: the jingle asked for last, with the track waiting, or the track alone when none is asked for. */
  private followAskedJingles(): void {
    const general = this.general
    if (general === undefined) {
      return
    }
    const wanted = this.askedJingles[this.askedJingles.length - 1] ?? null
    if (wanted === this.playedJingle) {
      return
    }
    if (this.playedJingle !== null) {
      this.fadeOut(this.jingles![this.playedJingle])
    }
    this.playedJingle = wanted
    if (wanted === null) {
      void general.play()
      return
    }
    general.pause()
    const jingle = this.jingles![wanted]
    window.clearInterval(this.fades.get(jingle))
    jingle.currentTime = 0
    jingle.volume = JINGLE_VOLUME
    void jingle.play()
  }

  private fadeOut(audio: HTMLAudioElement): void {
    const step = audio.volume / (FADE_MILLISECONDS / FADE_STEP_MILLISECONDS)
    const timer = window.setInterval(() => {
      audio.volume = Math.max(0, audio.volume - step)
      if (audio.volume === 0) {
        window.clearInterval(timer)
        audio.pause()
      }
    }, FADE_STEP_MILLISECONDS)
    this.fades.set(audio, timer)
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener())
  }
}

export const music = new MusicPlayer()
