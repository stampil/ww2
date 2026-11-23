import { assetUrl } from '../assetUrl'
import type { MissionType } from './useBase'

/** The picture of a type of mission in the frame of a card: a scene of the flight, the same for both sides, with no mark of nationality. */
function MissionPicture({ type }: { type: MissionType }) {
  return (
    <span className="portrait" aria-hidden="true">
      <img src={assetUrl(`sprites/missions/${type}.png`)} alt="" draggable={false} />
    </span>
  )
}

export default MissionPicture
