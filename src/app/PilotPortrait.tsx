import { useClan } from './ClanContext'
import { pilotFaceUrl } from './pilotFaces'

/** The face of a pilot in a card, in the style of the game and in the uniform of the side of the base. */
function PilotPortrait({ pilotId }: { pilotId: number }) {
  const clan = useClan()

  return (
    <span className="portrait" aria-hidden="true">
      <img src={pilotFaceUrl(pilotId, clan)} alt="" draggable={false} />
    </span>
  )
}

export default PilotPortrait
