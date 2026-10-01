import { useMemo, useState } from 'react'
import { listEncounterArchetypes } from '../../data/library/encounterArchetypeCatalogLoader'
import { useGmSession } from '../../context/GmSessionContext'
import { joinedPartyCharacterIds } from '../../lib/gm/joinTableLeave'

export function GmCastPanel() {
  const {
    session,
    spawnArchetype,
    dropNpc,
    setNpcNotes,
    bumpNpcPool,
    finalizedCharacters,
    refreshCharacters,
    addCharacterToParty,
    dropCharacterFromParty,
    partySlices,
    joinSeats,
  } = useGmSession()
  const [filter, setFilter] = useState('')

  const catalog = useMemo(() => {
    if (!session) return []
    const q = filter.trim().toLowerCase()
    return listEncounterArchetypes(session.hostGenreId).filter((row) => {
      if (!q) return true
      return (
        row.name.toLowerCase().includes(q) ||
        row.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [session, filter])

  if (!session) {
    return <p className="p-6 text-sm text-slate-500">Open a session first.</p>
  }

  const joinedIds = new Set(joinedPartyCharacterIds(joinSeats))
  const inParty = new Set(session.partyCharacterIds)
  const available = finalizedCharacters.filter((row) => !inParty.has(row.id))
  const localPartySlices = partySlices.filter(
    (pc) => !joinedIds.has(pc.characterId),
  )

  return (
    <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-2">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900/70">
        <div className="border-b border-slate-800 p-3">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-amber-200/90">
            Archetypes
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Encounter fodder Quick-Blocks. Full NPC character JSON is a later
            pass.
          </p>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter name or tag"
            className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-1.5 text-sm text-slate-100"
          />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {catalog.length === 0 ? (
            <li className="p-3 text-xs text-slate-500">
              No encounter archetypes ingested for {session.hostGenreId} yet.
            </li>
          ) : (
            catalog.map((row) => (
              <li
                key={row.id}
                className="mb-2 rounded-lg border border-slate-800 bg-slate-950/70 p-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{row.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">
                      {row.description}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-slate-400">
                      H.P. {row.vitals.hp} · S.D.C. {row.vitals.sdc} · APM{' '}
                      {row.handToHand.attacksPerMelee ?? '—'} · appearing{' '}
                      {row.numberAppearing.formula}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => spawnArchetype(row.id)}
                    className="shrink-0 rounded bg-amber-600 px-2 py-1 text-[10px] font-black uppercase text-slate-950 hover:bg-amber-400"
                  >
                    Spawn
                  </button>
                </div>
                {row.variants && row.variants.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {row.variants.map((v) => (
                      <button
                        key={v.variantId}
                        type="button"
                        onClick={() => spawnArchetype(row.id, v.variantId)}
                        className="rounded border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300 hover:border-amber-500"
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="flex min-h-0 flex-col gap-3 overflow-hidden">
        <div className="shrink-0 rounded-xl border border-slate-700 bg-slate-900/70 p-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Add from this machine
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Local character saves become GM-run NPCs for combat. Joined
                player seats stay on Characters → PCs only.
              </p>
            </div>
            <button
              type="button"
              onClick={refreshCharacters}
              className="rounded border border-slate-600 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400 hover:border-slate-400"
            >
              Refresh
            </button>
          </div>
          {available.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              No spawned characters left to add. Finish creation and spawn, then
              refresh.
            </p>
          ) : (
            <ul className="mt-2 max-h-40 divide-y divide-slate-800 overflow-y-auto">
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
          {localPartySlices.length > 0 ? (
            <ul className="mt-3 divide-y divide-slate-800 border-t border-slate-800 pt-2">
              {localPartySlices.map((pc) => (
                <li
                  key={pc.characterId}
                  className="flex items-center gap-2 py-1.5 text-xs text-slate-300"
                >
                  <span className="min-w-0 flex-1 truncate">{pc.name}</span>
                  <button
                    type="button"
                    onClick={() => dropCharacterFromParty(pc.characterId)}
                    className="text-[10px] uppercase text-red-400/80 hover:text-red-300"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900/70">
          <div className="border-b border-slate-800 p-3">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200/90">
              On the table
            </h2>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto p-2">
            {session.npcs.length === 0 ? (
              <li className="p-3 text-xs text-slate-500">No adversaries spawned.</li>
            ) : (
              session.npcs.map((npc) => (
                <li
                  key={npc.instanceId}
                  className="mb-2 rounded-lg border border-slate-800 bg-slate-950/70 p-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-white">
                      {npc.displayName}
                    </p>
                    <button
                      type="button"
                      onClick={() => dropNpc(npc.instanceId)}
                      className="text-[10px] uppercase text-red-400/80"
                    >
                      Remove
                    </button>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-slate-300">
                    H.P. {npc.hpCurrent}/{npc.hpMax} · S.D.C. {npc.sdcCurrent}/
                    {npc.sdcMax} · APM {npc.maxApm - npc.apmSpent}/{npc.maxApm}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <button
                      type="button"
                      className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-red-300"
                      onClick={() => bumpNpcPool(npc.instanceId, 'sdc', -4)}
                    >
                      −4 S.D.C.
                    </button>
                    <button
                      type="button"
                      className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-red-300"
                      onClick={() => bumpNpcPool(npc.instanceId, 'hp', -4)}
                    >
                      −4 H.P.
                    </button>
                    <button
                      type="button"
                      className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-emerald-300"
                      onClick={() => bumpNpcPool(npc.instanceId, 'hp', 4)}
                    >
                      +4 H.P.
                    </button>
                  </div>
                  <textarea
                    value={npc.notes}
                    onChange={(e) =>
                      setNpcNotes(npc.instanceId, e.target.value)
                    }
                    placeholder="Motives, names, tells…"
                    className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
                    rows={2}
                  />
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    </div>
  )
}
