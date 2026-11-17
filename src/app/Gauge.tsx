const BAD_BELOW = 0.34
const WARNING_BELOW = 0.67
const PERCENT = 100

type Props = {
  label: string
  value: number
  max: number
  /** Whether a full gauge is good news (durability) or bad news (fatigue, stress). */
  higherIsBetter: boolean
}

function toneOf(ratio: number, higherIsBetter: boolean): 'good' | 'warning' | 'bad' {
  const goodness = higherIsBetter ? ratio : 1 - ratio
  if (goodness < BAD_BELOW) {
    return 'bad'
  }
  if (goodness < WARNING_BELOW) {
    return 'warning'
  }
  return 'good'
}

/** A named bar that fills with the value; its colour says whether that is good, worrying or bad. */
function Gauge({ label, value, max, higherIsBetter }: Props) {
  const ratio = Math.min(1, Math.max(0, value / max))

  return (
    <div className="gauge-line">
      <span className="gauge-label" aria-hidden="true">
        {label}
      </span>
      <div className="gauge" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} data-tone={toneOf(ratio, higherIsBetter)}>
        <div className="gauge-fill" style={{ width: `${ratio * PERCENT}%` }} />
      </div>
    </div>
  )
}

export default Gauge
