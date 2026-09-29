import { useGmSession } from '../../context/GmSessionContext'
import {
  joinedPartyCharacterIds,
  playerNameForPartyCharacter,
} from '../../lib/gm/joinTableLeave'
import { formatBonus, formatPercent } from './GmApmPips'

export function GmPartyPanel() {
  const {
    session,
    partySlices,
    missingPartyIds,
    refreshCharacters,
    dropCharacterFromParty,
    setViewForm,
    joinSeats,
  } = useGmSession()

  if (!session) {
    return (
      <p className="p-6 text-sm text-slate-500">Open a session first.</p>
    )
  }

  const joinedIds = new Set(joinedPartyCharacterIds(joinSeats))
  const joinedSlices = partySlices.filter((pc) => joinedIds.has(pc.characterId))
  const joinedMissing = missingPartyIds.filter((id) => joinedIds.has(id))

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-amber-200/90">
            Joined party
          </h2>
          <p className="mt-1 max-w-xl text-xs text-slate-400">
            Characters from players at this table (party.snapshot). Local
            machine adds live on Cast. Snapshots use the joiner cache through
            the host genre — nothing is written back to player files.
          </p>
        </div>
        <button
          type="button"
          onClick={refreshCharacters}
          className="rounded-lg border border-slate-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-300 hover:border-slate-400"
        >
          Refresh saves
        </button>
      </div>

      {joinedMissing.length > 0 ? (
        <p className="mb-3 rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs text-red-300">
          Missing saves: {joinedMissing.join(', ')}. Remove them from the party
          or restore the character file.
        </p>
      ) : null}

      {joinedSlices.length === 0 ? (
        <p className="text-sm text-slate-500">
          No joined players yet. Open Table and wait for Join Session attaches.
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {joinedSlices.map((pc) => {
            const playerName = playerNameForPartyCharacter(
              joinSeats,
              pc.characterId,
            )
            return (
              <li
                key={pc.characterId}
                className="rounded-xl border border-slate-700 bg-slate-900/80 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">{pc.name}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">
                      Lv {pc.level} · {pc.creationGenreLabel}
                      {pc.crossGenre ? ` → ${pc.hostGenreLabel}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {playerName ? (
                      <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-300/90">
                        {playerName}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => dropCharacterFromParty(pc.characterId)}
                      className="text-[10px] uppercase text-red-400/80 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {pc.crossGenre ? (
                  <p className="mt-2 rounded-md border border-amber-800/50 bg-amber-950/30 px-2 py-1.5 text-[11px] leading-snug text-amber-100/90">
                    {pc.conversionNote}
                    {pc.lockedSkillCount > 0
                      ? ` ${pc.lockedSkillCount} skill(s) locked.`
                      : ''}
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] text-slate-500">
                    {pc.conversionNote}
                  </p>
                )}
                {pc.supportsDualForm ? (
                  <div className="mt-2 flex gap-1">
                    {(['primary', 'morphus'] as const).map((form) => (
                      <button
                        key={form}
                        type="button"
                        onClick={() => setViewForm(pc.characterId, form)}
                        className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${
                          pc.viewForm === form
                            ? 'bg-violet-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {form === 'primary' ? 'Facade' : 'Morphus'}
                      </button>
                    ))}
                  </div>
                ) : null}
                <dl className="mt-3 grid grid-cols-3 gap-2 font-mono text-[11px] text-slate-200">
                  <div>
                    <dt className="text-[9px] uppercase text-slate-500">H.P.</dt>
                    <dd>
                      {pc.hpCurrent}/{pc.hpMax}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[9px] uppercase text-slate-500">S.D.C.</dt>
                    <dd>
                      {pc.sdcCurrent}/{pc.sdcMax}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[9px] uppercase text-slate-500">APM</dt>
                    <dd>{pc.maxApm}</dd>
                  </div>
                  <div>
                    <dt className="text-[9px] uppercase text-slate-500">Init</dt>
                    <dd>{formatBonus(pc.initiativeBonus)}</dd>
                  </div>
                  <div>
                    <dt className="text-[9px] uppercase text-slate-500">Strike</dt>
                    <dd>{formatBonus(pc.strikeBonus)}</dd>
                  </div>
                  <div>
                    <dt className="text-[9px] uppercase text-slate-500">Parry</dt>
                    <dd>{formatBonus(pc.parryBonus)}</dd>
                  </div>
                  <div>
                    <dt className="text-[9px] uppercase text-slate-500">Percep</dt>
                    <dd>{formatBonus(pc.perceptionBonus)}</dd>
                  </div>
                  <div>
                    <dt className="text-[9px] uppercase text-slate-500">Trust</dt>
                    <dd>{formatPercent(pc.trustIntimidate)}</dd>
                  </div>
                  <div>
                    <dt className="text-[9px] uppercase text-slate-500">Charm</dt>
                    <dd>{formatPercent(pc.charmImpress)}</dd>
                  </div>
                </dl>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
