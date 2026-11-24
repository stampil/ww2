import { pilotFaceUrl } from './pilotFaces'

/** The face of a pilot in a card, in the style of the game. */
function PilotPortrait({ pilotId }: { pilotId: number }) {
  return (
    <span className="portrait" aria-hidden="true">
      <img src={pilotFaceUrl(pilotId)} alt="" draggable={false} />
    </span>
  )
}

export default PilotPortrait
