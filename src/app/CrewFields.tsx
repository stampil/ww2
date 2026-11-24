import { useTranslation } from 'react-i18next'
import { useRankName } from './ClanContext'
import type { CrewChoice } from './useCrewChoice'

/** The two choices of a flight, an aircraft and its pilot, among those that are free. */
function CrewFields({ crew }: { crew: CrewChoice }) {
  const { t } = useTranslation()
  const rankName = useRankName()

  return (
    <>
      <label>
        <span>{t('stationing.aircraft')}</span>
        <select value={crew.aircraft?.id ?? ''} onChange={(event) => crew.setAircraftId(Number(event.target.value))}>
          {crew.freeAircraft.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {t('base.mission.aircraftOption', { name: candidate.model.name, number: candidate.number, durability: candidate.durability })}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{t('base.mission.pilot')}</span>
        <select value={crew.pilot?.id ?? ''} onChange={(event) => crew.setPilotId(Number(event.target.value))}>
          {crew.freePilots.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}, {rankName(candidate.rank)}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}

export default CrewFields
