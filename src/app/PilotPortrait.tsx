import { assetUrl } from '../assetUrl'

// How many faces the sheet of portraits has; a pilot keeps the face their number gives them.
const PORTRAIT_COUNT = 8

/** The face of a pilot in a card, in the style of the game: one of eight, always the same for the same pilot. */
function PilotPortrait({ pilotId }: { pilotId: number }) {
  const face = (pilotId % PORTRAIT_COUNT) + 1

  return (
    <span className="portrait" aria-hidden="true">
      <img src={assetUrl(`sprites/pilots/pilot-${face}.png`)} alt="" draggable={false} />
    </span>
  )
}

export default PilotPortrait
