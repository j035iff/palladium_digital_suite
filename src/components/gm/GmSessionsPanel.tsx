import { useState } from 'react'
import { formatGenreSlug, GENRE_MANIFEST, isGenreId } from '../../data/genres'
import type { GenreId } from '../../data/genres'
import { useGmSession } from '../../context/GmSessionContext'
import { formatBonus, formatPercent } from './GmApmPips'
import type { GmConversionPolicy } from '../../lib/gm/sessionTypes'

const POLICY_COPY: Record<
  GmConversionPolicy,
  { label: string; detail: string }
> = {
  disable_non_native: {
    label: 'Disable non-native',
    detail:
      'Keep native scale. Grey out host-illegal gear and skills. No M.D.C. ↔ S.D.C. conversion.',
  },
  apply_conversion: {
    label: 'Apply conversion',
    detail:
      'Request session-duration conversion in the view-model only. Structural mapping is not implemented yet — assets still lock to the host whitelist. Saves stay native.',
  },
}

export function GmSessionsPanel() {
  const {
    session,
    sessionList,
    createSession,
    openSession,
    removeSession,
    updateScratchpad,
    updateConversionPolicy,
    updateSessionName,
    partySlices,
  } = useGmSession()

  const [newName, setNewName] = useState('Friday table')
  const [newGenre, setNewGenre] = useState<GenreId>('nightbane')
  const [newPolicy, setNewPolicy] = useState<GmConversionPolicy>('disable_non_native')

  return (
    <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="flex min-h-0 flex-col gap-4">
        <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-amber-200/90">
            New session
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Host genre is locked for the life of the room. Player phones and LAN join
            come later — this workspace is GM-only on this machine.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Name
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Host genre
              <select
                value={newGenre}
                onChange={(e) => {
                  if (isGenreId(e.target.value)) setNewGenre(e.target.value)
                }}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                {GENRE_MANIFEST.filter((g) => g.playable !== false).map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <fieldset className="mt-3 space-y-2">
            <legend className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Cross-genre policy
            </legend>
            {(Object.keys(POLICY_COPY) as GmConversionPolicy[]).map((id) => (
              <label
                key={id}
                className="flex cursor-pointer gap-2 rounded-lg border border-slate-700 bg-slate-950/50 p-2 text-xs text-slate-300"
              >
                <input
                  type="radio"
                  name="new-policy"
                  checked={newPolicy === id}
                  onChange={() => setNewPolicy(id)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-bold text-slate-100">
                    {POLICY_COPY[id].label}
                  </span>
                  <span className="mt-0.5 block text-slate-500">
                    {POLICY_COPY[id].detail}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            onClick={() =>
              createSession({
                name: newName,
                hostGenreId: newGenre,
                conversionPolicy: newPolicy,
              })
            }
            className="mt-3 rounded-lg bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-950 hover:bg-amber-400"
          >
            Open table
          </button>
        </div>

        {session ? (
          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-amber-700/40 bg-slate-900/80 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-[12rem] flex-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Live session
                <input
                  value={session.name}
                  onChange={(e) => updateSessionName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-amber-700/50 bg-slate-950 px-3 py-2 text-sm font-semibold text-amber-50"
                />
              </label>
              <p className="text-xs text-slate-400">
                {formatGenreSlug(session.hostGenreId)} · Round {session.combat.round}
              </p>
            </div>
            <fieldset className="mt-3 space-y-2">
              <legend className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Conversion policy
              </legend>
              {(Object.keys(POLICY_COPY) as GmConversionPolicy[]).map((id) => (
                <label
                  key={id}
                  className="flex cursor-pointer gap-2 text-xs text-slate-300"
                >
                  <input
                    type="radio"
                    name="live-policy"
                    checked={session.conversionPolicy === id}
                    onChange={() => updateConversionPolicy(id)}
                  />
                  <span>
                    <span className="font-semibold text-slate-100">
                      {POLICY_COPY[id].label}
                    </span>
                    {' — '}
                    {POLICY_COPY[id].detail}
                  </span>
                </label>
              ))}
            </fieldset>
            <label className="mt-4 flex min-h-[12rem] flex-1 flex-col text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Scratchpad
              <textarea
                value={session.scratchpad}
                onChange={(e) => updateScratchpad(e.target.value)}
                placeholder="Scene notes, clocks, names… auto-saves to this session."
                className="mt-1 min-h-[12rem] flex-1 resize-y rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 font-sans text-sm font-normal normal-case tracking-normal text-slate-100"
              />
            </label>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-500">
            No live session. Open a saved table or create one above.
          </p>
        )}
      </section>

      <aside className="flex flex-col gap-4">
        <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            Saved tables
          </h2>
          {sessionList.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">None yet.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {sessionList.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1.5"
                >
                  <button
                    type="button"
                    onClick={() => openSession(row.id)}
                    className="min-w-0 flex-1 text-left text-xs font-semibold text-slate-200 hover:text-amber-200"
                  >
                    {row.name}
                    <span className="ml-2 text-[10px] font-normal uppercase text-slate-500">
                      {formatGenreSlug(row.hostGenreId)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="text-[10px] uppercase text-red-400/80 hover:text-red-300"
                    onClick={() => {
                      if (window.confirm(`Delete “${row.name}”?`)) {
                        removeSession(row.id)
                      }
                    }}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-cyan-800/40 bg-slate-900/70 p-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300/90">
            Passive matrix
          </h2>
          <p className="mt-1 text-[10px] leading-snug text-slate-500">
            Secret checks without polling the table. Perception is the I.Q. bonus,
            not Detect Ambush.
          </p>
          {partySlices.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              Add characters on the Party tab.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {partySlices.map((pc) => (
                <li
                  key={pc.characterId}
                  className="rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-2"
                >
                  <p className="text-xs font-bold text-slate-100">{pc.name}</p>
                  <p className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono text-[10px] text-slate-300">
                    <span>Percep {formatBonus(pc.perceptionBonus)}</span>
                    <span>Trust {formatPercent(pc.trustIntimidate)}</span>
                    <span>Charm {formatPercent(pc.charmImpress)}</span>
                    <span>
                      HF aura {pc.horrorAura == null ? 'N/A' : pc.horrorAura}
                    </span>
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Saves:{' '}
                    {pc.saveSummaries
                      .slice(0, 4)
                      .map((s) => `${s.label.replace('Save vs. ', '')} ${s.target}${formatBonus(s.bonus)}`)
                      .join(' · ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  )
}
