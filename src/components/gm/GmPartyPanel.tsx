import { useGmSession } from '../../context/GmSessionContext'
import { formatBonus, formatPercent } from './GmApmPips'

export function GmPartyPanel() {
  const {
    session,
    partySlices,
    missingPartyIds,
    finalizedCharacters,
    refreshCharacters,
    addCharacterToParty,
    dropCharacterFromParty,
    setViewForm,
  } = useGmSession()

  if (!session) {
    return (
      <p className="p-6 text-sm text-slate-500">Open a session first.</p>
    )
  }

  const inParty = new Set(session.partyCharacterIds)
  const available = finalizedCharacters.filter((row) => !inParty.has(row.id))

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-amber-200/90">
            Cached party
          </h2>
          <p className="mt-1 max-w-xl text-xs text-slate-400">
            Snapshots read local character saves through the host genre. Nothing
            is written back. Device reconnect / ghost state ships with LAN later.
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

      <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900/70 p-3">
        <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Add from this machine
        </h3>
        {available.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">
            No spawned characters left to add. Finish creation and spawn, then
            refresh.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-800">
            {available.map((row) => (
              <li key={row.id} className="flex items-center gap-2 py-2">
                <span className="min-w-0 flex-1 text-sm text-slate-200">
                  {row.name}
                  <span className="ml-2 text-[10px] uppercase text-slate-500">
                    {row.creationGenreId}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => addCharacterToParty(row.id)}
                  className="rounded bg-cyan-700/80 px-2 py-1 text-[10px] font-bold uppercase text-white hover:bg-cyan-600"
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {missingPartyIds.length > 0 ? (
        <p className="mb-3 rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs text-red-300">
          Missing saves: {missingPartyIds.join(', ')}. Remove them from the party
          or restore the character file.
        </p>
      ) : null}

      {partySlices.length === 0 ? (
        <p className="text-sm text-slate-500">Party is empty.</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {partySlices.map((pc) => (
            <li
              key={pc.characterId}
              className="rounded-xl border border-slate-700 bg-slate-900/80 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-white">{pc.name}</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">
                    Lv {pc.level} · {pc.creationGenreLabel}
                    {pc.crossGenre ? ` → ${pc.hostGenreLabel}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => dropCharacterFromParty(pc.characterId)}
                  className="text-[10px] uppercase text-red-400/80 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
              {pc.crossGenre ? (
                <p className="mt-2 rounded-md border border-amber-800/50 bg-amber-950/30 px-2 py-1.5 text-[11px] leading-snug text-amber-100/90">
                  {pc.conversionNote}
                  {pc.lockedSkillCount > 0
                    ? ` ${pc.lockedSkillCount} skill(s) locked.`
                    : ''}
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-slate-500">{pc.conversionNote}</p>
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
          ))}
        </ul>
      )}
    </div>
  )
}
