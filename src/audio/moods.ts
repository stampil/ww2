/** The moods the theme is played in: the march of the game, a more triumphant one, a melodramatic one and a sorrowful one. */
export type Mood = 'march' | 'triumph' | 'melodrama' | 'sorrow'

/** What the drums play: the whole march, only the bass drum, or nothing. */
export type Drums = 'march' | 'kick' | 'none'

export type MoodSettings = {
  beatsPerMinute: number
  /** Whether the third, the sixth and the seventh of the key are lowered, which turns the march into a lament. */
  isMinor: boolean
  transposeSemitones: number
  /** What the brightness of the brass is multiplied by. */
  brightness: number
  /** What the length of the notes of the tune is multiplied by: above one they run into each other. */
  legato: number
  /** Which parts play besides the tune: the second trumpets, the chords, the bass and the drums. */
  parts: { harmony: boolean; stabs: boolean; bass: boolean; drums: Drums }
}

export const DEFAULT_MOOD: Mood = 'march'

export const MOODS: Record<Mood, MoodSettings> = {
  march: { beatsPerMinute: 120, isMinor: false, transposeSemitones: 0, brightness: 1, legato: 1, parts: { harmony: true, stabs: true, bass: true, drums: 'march' } },
  triumph: { beatsPerMinute: 132, isMinor: false, transposeSemitones: 2, brightness: 1.35, legato: 1, parts: { harmony: true, stabs: true, bass: true, drums: 'march' } },
  melodrama: { beatsPerMinute: 66, isMinor: true, transposeSemitones: 0, brightness: 0.8, legato: 1.5, parts: { harmony: true, stabs: false, bass: true, drums: 'kick' } },
  sorrow: { beatsPerMinute: 54, isMinor: true, transposeSemitones: -2, brightness: 0.55, legato: 1.8, parts: { harmony: true, stabs: false, bass: false, drums: 'none' } },
}
