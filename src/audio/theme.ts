/** A note of the theme: when it starts and how long it lasts, in beats from the start of the loop, and its MIDI number (69 is the A of 440 Hz). */
export type Note = { start: number; length: number; midi: number }

export const BEATS_PER_BAR = 4

type Bar = {
  /** The root and the fifth of the chord, low: the bass plays them one after the other. */
  bass: [number, number]
  /** The three notes of the chord, struck by the brass on the off beats. */
  chord: [number, number, number]
}

const B_FLAT: Bar = { bass: [34, 41], chord: [58, 62, 65] }
const E_FLAT: Bar = { bass: [39, 46], chord: [55, 58, 63] }
const F_MAJOR: Bar = { bass: [41, 48], chord: [57, 60, 65] }
const G_MINOR: Bar = { bass: [43, 50], chord: [58, 62, 67] }
const C_MINOR: Bar = { bass: [36, 43], chord: [55, 60, 63] }

// Sixteen bars in B flat major: two bars of fanfare for the trumpets alone, then the march, which ends on the dominant so that the fanfare comes back.
const BARS: Bar[] = [
  B_FLAT, B_FLAT, E_FLAT, B_FLAT, F_MAJOR, B_FLAT, E_FLAT, F_MAJOR,
  B_FLAT, G_MINOR, E_FLAT, C_MINOR, F_MAJOR, F_MAJOR, E_FLAT, F_MAJOR,
]

export const LOOP_BEATS = BARS.length * BEATS_PER_BAR

const FANFARE_BARS = 2
const SCALE_PITCH_CLASSES = [0, 2, 3, 5, 7, 9, 10]
const LOWEST_MIDI = 36
const HIGHEST_MIDI = 96
const THIRD_IN_SCALE_STEPS = 2

// The tune, an original one for this game: a call on repeated notes that leaps up, then a march in dotted rhythm for brass.
export const MELODY: Note[] = [
  { start: 0, length: 0.5, midi: 65 }, { start: 0.5, length: 0.5, midi: 65 }, { start: 1, length: 1.5, midi: 70 }, { start: 2.5, length: 0.5, midi: 70 }, { start: 3, length: 1, midi: 74 },
  { start: 4, length: 3, midi: 77 }, { start: 7, length: 0.5, midi: 74 }, { start: 7.5, length: 0.5, midi: 75 },
  { start: 8, length: 1.5, midi: 79 }, { start: 9.5, length: 0.5, midi: 77 }, { start: 10, length: 1, midi: 75 }, { start: 11, length: 1, midi: 74 },
  { start: 12, length: 1.5, midi: 74 }, { start: 13.5, length: 0.5, midi: 72 }, { start: 14, length: 2, midi: 70 },
  { start: 16, length: 1.5, midi: 72 }, { start: 17.5, length: 0.5, midi: 74 }, { start: 18, length: 1, midi: 75 }, { start: 19, length: 1, midi: 77 },
  { start: 20, length: 2, midi: 74 }, { start: 22, length: 1, midi: 70 }, { start: 23, length: 1, midi: 74 },
  { start: 24, length: 1.5, midi: 79 }, { start: 25.5, length: 0.5, midi: 77 }, { start: 26, length: 1, midi: 75 }, { start: 27, length: 1, midi: 79 },
  { start: 28, length: 1.5, midi: 77 }, { start: 29.5, length: 0.5, midi: 75 }, { start: 30, length: 1, midi: 74 }, { start: 31, length: 1, midi: 72 },
  { start: 32, length: 1.5, midi: 82 }, { start: 33.5, length: 0.5, midi: 81 }, { start: 34, length: 1, midi: 79 }, { start: 35, length: 1, midi: 77 },
  { start: 36, length: 1.5, midi: 74 }, { start: 37.5, length: 0.5, midi: 75 }, { start: 38, length: 2, midi: 74 },
  { start: 40, length: 1.5, midi: 79 }, { start: 41.5, length: 0.5, midi: 77 }, { start: 42, length: 1, midi: 75 }, { start: 43, length: 1, midi: 77 },
  { start: 44, length: 1.5, midi: 75 }, { start: 45.5, length: 0.5, midi: 74 }, { start: 46, length: 2, midi: 72 },
  { start: 48, length: 0.5, midi: 72 }, { start: 48.5, length: 0.5, midi: 74 }, { start: 49, length: 0.5, midi: 75 }, { start: 49.5, length: 0.5, midi: 77 }, { start: 50, length: 1, midi: 79 }, { start: 51, length: 1, midi: 81 },
  { start: 52, length: 2, midi: 81 }, { start: 54, length: 1, midi: 79 }, { start: 55, length: 1, midi: 77 },
  { start: 56, length: 1.5, midi: 79 }, { start: 57.5, length: 0.5, midi: 77 }, { start: 58, length: 1, midi: 75 }, { start: 59, length: 1, midi: 74 },
  { start: 60, length: 0.5, midi: 69 }, { start: 60.5, length: 0.5, midi: 72 }, { start: 61, length: 2, midi: 77 },
]

const BASS_NOTE_BEATS = 0.45
const STAB_NOTE_BEATS = 0.45
const STAB_BEATS_IN_BAR = [1, 3]
const LAST_BAR = BARS.length - 1
const CRASH_BARS = [0, FANFARE_BARS, 8]
const FILL_BARS = [7, LAST_BAR]
const FILL_START_BEAT = 3
const FILL_STEP_BEATS = 0.25

/** The second trumpets: the tune a third lower, in the notes of the key, so that the brass sounds as a section. */
export function harmonyNotes(): Note[] {
  const scale: number[] = []
  for (let midi = LOWEST_MIDI; midi <= HIGHEST_MIDI; midi += 1) {
    if (SCALE_PITCH_CLASSES.includes(midi % 12)) {
      scale.push(midi)
    }
  }
  return MELODY.map((note) => ({ ...note, midi: scale[scale.indexOf(note.midi) - THIRD_IN_SCALE_STEPS] }))
}

/** The bass: the root, the fifth, the root, the fifth, on the four beats of each bar, once the march has begun. */
export function bassNotes(): Note[] {
  const notes: Note[] = []
  BARS.forEach((bar, index) => {
    if (index < FANFARE_BARS) {
      return
    }
    for (let beat = 0; beat < BEATS_PER_BAR; beat += 1) {
      notes.push({ start: index * BEATS_PER_BAR + beat, length: BASS_NOTE_BEATS, midi: bar.bass[beat % 2] })
    }
  })
  return notes
}

/** The chords, struck short by the brass on the second and fourth beats of each bar of the march. */
export function stabNotes(): Note[] {
  const notes: Note[] = []
  BARS.forEach((bar, index) => {
    if (index < FANFARE_BARS) {
      return
    }
    for (const beat of STAB_BEATS_IN_BAR) {
      for (const midi of bar.chord) {
        notes.push({ start: index * BEATS_PER_BAR + beat, length: STAB_NOTE_BEATS, midi })
      }
    }
  })
  return notes
}

/**
 * When each drum is hit, in beats from the start of the loop: the bass drum on the first and third beats, the snare strong on the others and light
 * between, a roll of the snare at the end of the strains, and the cymbal where the band comes in. The drums are silent during the fanfare.
 */
export function drumHits(): { kick: number[]; snare: number[]; ghost: number[]; crash: number[] } {
  const hits = { kick: [] as number[], snare: [] as number[], ghost: [] as number[], crash: [] as number[] }
  for (let bar = 0; bar < BARS.length; bar += 1) {
    const barStart = bar * BEATS_PER_BAR
    if (CRASH_BARS.includes(bar)) {
      hits.crash.push(barStart)
    }
    if (bar < FANFARE_BARS) {
      continue
    }
    hits.kick.push(barStart, barStart + 2)
    hits.snare.push(barStart + 1)
    hits.ghost.push(barStart + 0.5, barStart + 1.5, barStart + 2.5)
    if (FILL_BARS.includes(bar)) {
      for (let step = FILL_START_BEAT; step < BEATS_PER_BAR; step += FILL_STEP_BEATS) {
        hits.snare.push(barStart + step)
      }
    } else {
      hits.snare.push(barStart + 3)
      hits.ghost.push(barStart + 3.5)
    }
  }
  return hits
}
