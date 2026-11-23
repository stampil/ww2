import { assetUrl } from '../assetUrl'
import type { Part, Stock } from './useBase'

/** The picture of a spare part or of a stock in the frame of a card, drawn in the style of the game, with no mark of nationality. */
function GoodsPicture({ name }: { name: Part | Stock }) {
  return (
    <span className="portrait" aria-hidden="true">
      <img src={assetUrl(`sprites/goods/${name}.png`)} alt="" draggable={false} />
    </span>
  )
}

export default GoodsPicture
