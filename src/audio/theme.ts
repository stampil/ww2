/** A note of the theme: when it starts and how long it lasts, in beats from the start of the loop, and its MIDI number (69 is the A of 440 Hz). */
export type Note = { start: number; length: number; midi: number }

export const BEATS_PER_MINUTE = 108
export const BEATS_PER_BAR = 4

type Bar = {
  /** The root and the fifth of the chord, low: the bass plays them one after the other. */
  bass: [number, number]
  /** The three notes of the chord, held by the pad. */
  chord: [number, number, number]
}

const D_MINOR: Bar = { bass: [38, 45], chord: [50, 53, 57] }
const B_FLAT: Bar = { bass: [34, 41], chord: [46, 50, 53] }
const C_MAJOR: Bar = { bass: [36, 43], chord: [48, 52, 55] }
const A_MAJOR: Bar = { bass: [33, 40], chord: [45, 49, 52] }
const F_MAJOR: Bar = { bass: [41, 48], chord: [53, 57, 60] }

// Sixteen bars: a first strain that climbs to the dominant, a second that comes back home to D minor.
const BARS: Bar[] = [
  D_MINOR, D_MINOR, B_FLAT, B_FLAT, C_MAJOR, C_MAJOR, D_MINOR, A_MAJOR,
  F_MAJOR, F_MAJOR, C_MAJOR, C_MAJOR, B_FLAT, B_FLAT, A_MAJOR, D_MINOR,
]

export const LOOP_BEATS = BARS.length * BEATS_PER_BAR

// The tune, an original one for this game: dotted rhythm and rising fourths, as a march for brass.
export const MELODY: Note[] = [
  { start: 0, length: 1.5, midi: 62 }, { start: 1.5, length: 0.5, midi: 65 }, { start: 2, length: 2, midi: 69 },
  { start: 4, length: 1.5, midi: 74 }, { start: 5.5, length: 0.5, midi: 72 }, { start: 6, length: 1, midi: 69 }, { start: 7, length: 1, midi: 65 },
  { start: 8, length: 1.5, midi: 70 }, { start: 9.5, length: 0.5, midi: 69 }, { start: 10, length: 2, midi: 67 },
  { start: 12, length: 1, midi: 65 }, { start: 13, length: 1, midi: 67 }, { start: 14, length: 1, midi: 69 }, { start: 15, length: 1, midi: 70 },
  { start: 16, length: 1.5, midi: 72 }, { start: 17.5, length: 0.5, midi: 70 }, { start: 18, length: 2, midi: 67 },
  { start: 20, length: 1.5, midi: 76 }, { start: 21.5, length: 0.5, midi: 74 }, { start: 22, length: 1, midi: 72 }, { start: 23, length: 1, midi: 67 },
  { start: 24, length: 1, midi: 74 }, { start: 25, length: 1, midi: 77 }, { start: 26, length: 1, midi: 76 }, { start: 27, length: 1, midi: 74 },
  { start: 28, length: 2, midi: 73 }, { start: 30, length: 2, midi: 69 },
  { start: 32, length: 1.5, midi: 69 }, { start: 33.5, length: 0.5, midi: 72 }, { start: 34, length: 2, midi: 77 },
  { start: 36, length: 1.5, midi: 76 }, { start: 37.5, length: 0.5, midi: 74 }, { start: 38, length: 2, midi: 72 },
  { start: 40, length: 1.5, midi: 67 }, { start: 41.5, length: 0.5, midi: 72 }, { start: 42, length: 2, midi: 76 },
  { start: 44, length: 1.5, midi: 74 }, { start: 45.5, length: 0.5, midi: 72 }, { start: 46, length: 2, midi: 67 },
  { start: 48, length: 1.5, midi: 74 }, { start: 49.5, length: 0.5, midi: 77 }, { start: 50, length: 2, midi: 70 },
  { start: 52, length: 1, midi: 69 }, { start: 53, length: 1, midi: 70 }, { start: 54, length: 1, midi: 72 }, { start: 55, length: 1, midi: 74 },
  { start: 56, length: 1.5, midi: 76 }, { start: 57.5, length: 0.5, midi: 73 }, { start: 58, length: 2, midi: 69 },
  { start: 60, length: 3, midi: 74 },
]

const BASS_NOTE_BEATS = 0.45
const PAD_NOTE_BEATS = 3.9
const LAST_BAR = BARS.length - 1
const FILL_BARS = [7, LAST_BAR]
const FILL_START_BEAT = 3
const FILL_STEP_BEATS = 0.25

/** The bass: the root, the fifth, the root, the fifth, on the four beats of each bar. */
export function bassNotes(): Note[] {
  const notes: Note[] = []
  BARS.forEach((bar, index) => {
    for (let beat = 0; beat < BEATS_PER_BAR; beat += 1) {
      notes.push({ start: index * BEATS_PER_BAR + beat, length: BASS_NOTE_BEATS, midi: bar.bass[beat % 2] })
    }
  })
  return notes
}

/** The chords, held for the whole bar. */
export function padNotes(): Note[] {
  const notes: Note[] = []
  BARS.forEach((bar, index) => {
    for (const midi of bar.chord) {
      notes.push({ start: index * BEATS_PER_BAR, length: PAD_NOTE_BEATS, midi })
    }
  })
  return notes
}

/** When each drum is hit, in beats from the start of the loop: the kick on the first and third beats, the snare on the others, the hat on the half beats, a roll of the snare at the end of the strains. */
export function drumHits(): { kick: number[]; snare: number[]; hat: number[] } {
  const hits = { kick: [] as number[], snare: [] as number[], hat: [] as number[] }
  for (let bar = 0; bar < BARS.length; bar += 1) {
    const barStart = bar * BEATS_PER_BAR
    hits.kick.push(barStart, barStart + 2)
    hits.snare.push(barStart + 1)
    if (FILL_BARS.includes(bar)) {
      for (let step = FILL_START_BEAT; step < BEATS_PER_BAR; step += FILL_STEP_BEATS) {
        hits.snare.push(barStart + step)
      }
    } else {
      hits.snare.push(barStart + 3)
    }
    for (let half = 0; half < BEATS_PER_BAR * 2; half += 1) {
      hits.hat.push(barStart + half / 2)
    }
  }
  return hits
}
