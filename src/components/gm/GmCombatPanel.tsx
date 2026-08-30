import { useMemo, useState } from 'react'
import { listEncounterArchetypes } from '../../data/library/encounterArchetypeCatalogLoader'
import { useGmCombatRoster, useGmSession } from '../../context/GmSessionContext'
import { npcParryBonus, npcStrikeBonus } from '../../lib/gm/npcInstance'
import { formatBonus } from './GmApmPips'
import { GmApmPips } from './GmApmPips'

function GmMathIn({
  label,
  bonus,
  onRecord,
}: {
  label: string
  bonus: number
  onRecord: (d20: number) => void
}) {
  const [raw, setRaw] = useState('')
  const parsed = Number(raw.trim())
  const die = raw.trim().length > 0 && Number.isFinite(parsed) ? parsed : null
  const total = die != null ? die + bonus : null
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
        <input
          type="number"
          inputMode="numeric"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Physical d20"
          className="mt-1 w-full rounded-lg border border-amber-700/60 bg-slate-950 px-2 py-1.5 text-center font-mono text-lg font-black text-amber-50"
        />
      </label>
      <p className="mt-1 font-mono text-[11px] text-slate-400">
        {die ?? '—'} {formatBonus(bonus)}
        {total != null ? ` = ${total}` : ''}
      </p>
      <button
        type="button"
        disabled={die == null}
        onClick={() => {
          if (die == null) return
          onRecord(die)
          setRaw('')
        }}
        className="mt-1 rounded bg-amber-600 px-2 py-1 text-[10px] font-black uppercase text-slate-950 disabled:opacity-40"
      >
        Record
      </button>
    </div>
  )
}

export function GmCombatPanel() {
  const {
    session,
    partySlices,
    setPcInitiative,
    setNpcInit,
    tapNpcApm,
    lockInit,
    unlockInit,
    newMeleeRound,
    emitNpcHf,
    recordPcHfSave,
    recordStrike,
  } = useGmSession()
  const roster = useGmCombatRoster()
  const [hfDieByPc, setHfDieByPc] = useState<Record<string, string>>({})

  const archetypes = useMemo(() => {
    if (!session) return new Map()
    return new Map(
      listEncounterArchetypes(session.hostGenreId).map((row) => [row.id, row]),
    )
  }, [session])

  if (!session) {
    return <p className="p-6 text-sm text-slate-500">Open a session first.</p>
  }

  const locked = session.combat.initiativeLocked
  const emit = session.combat.activeHfEmit

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4">
      <header className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">
          Melee round {session.combat.round}
        </p>
        {emit ? (
          <span
            role="status"
            className="rounded border border-violet-500/70 bg-violet-950/80 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-100"
          >
            H.F. {emit.saveTarget} live
          </span>
        ) : null}
        {locked ? (
          <span className="rounded border border-amber-600/60 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-200">
            Initiative locked
          </span>
        ) : (
          <span className="rounded border border-slate-600 px-2 py-0.5 text-[10px] uppercase text-slate-500">
            Initiative open
          </span>
        )}
        <button
          type="button"
          onClick={locked ? unlockInit : lockInit}
          title={
            locked
              ? 'Unlock to change rolls (GM override)'
              : 'Lock order for this melee round'
          }
          className="rounded border border-slate-600 px-2 py-1 text-[10px] font-bold uppercase text-slate-200 hover:border-amber-500"
        >
          {locked ? 'Unlock' : 'Lock initiative'}
        </button>
        <button
          type="button"
          onClick={newMeleeRound}
          className="rounded bg-slate-800 px-2 py-1 text-[10px] font-bold uppercase text-cyan-200 hover:bg-slate-700"
        >
          New melee round
        </button>
      </header>

      {emit ? (
        <div
          role="status"
          className="rounded-lg border border-violet-700/50 bg-violet-950/30 px-3 py-2 text-xs text-violet-100"
        >
          H.F. {emit.saveTarget} is live
          {emit.useNightbaneHorrorFactor ? ' (Nightbane H.F.)' : ''}. Record
          physical saves below — failed saves are flagged only; APM is not
          auto-spent.
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900/80">
          <h2 className="border-b border-slate-800 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            Roster
          </h2>
          <ul className="min-h-0 flex-1 overflow-y-auto p-2">
            {roster.length === 0 ? (
              <li className="p-3 text-xs text-slate-500">
                Add party members and spawn fodder to fill the round.
              </li>
            ) : (
              roster.map((row) => (
                <li
                  key={row.key}
                  className={`mb-2 rounded-lg border p-2 ${
                    row.kind === 'pc'
                      ? 'border-cyan-900/50 bg-slate-950/80'
                      : 'border-amber-900/40 bg-slate-950/80'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-white">
                        {row.name}
                        <span className="ml-2 text-[10px] font-semibold uppercase text-slate-500">
                          {row.kind === 'pc' ? 'PC' : 'NPC'}
                        </span>
                        {row.hfOutcome === 'failed' ? (
                          <span className="ml-2 text-[10px] font-black uppercase text-red-400">
                            H.F. failed
                          </span>
                        ) : null}
                        {row.hfOutcome === 'passed' ? (
                          <span className="ml-2 text-[10px] font-black uppercase text-emerald-400">
                            H.F. saved
                          </span>
                        ) : null}
                      </p>
                      <p className="font-mono text-[11px] text-slate-400">
                        Init {row.initiativeTotal ?? '—'}
                        {row.initiativeRoll != null
                          ? ` (${row.initiativeRoll}${formatBonus(row.initiativeBonus)})`
                          : ` (bonus ${formatBonus(row.initiativeBonus)})`}
                      </p>
                    </div>
                    <label className="text-[10px] uppercase text-slate-500">
                      d20
                      <input
                        type="number"
                        disabled={locked}
                        title={
                          locked
                            ? 'Initiative locked this melee. Unlock to change.'
                            : 'Physical initiative die'
                        }
                        value={row.initiativeRoll ?? ''}
                        onChange={(e) => {
                          const v = e.target.value.trim()
                          const n = v === '' ? null : Number(v)
                          const die =
                            n != null && Number.isFinite(n) ? n : null
                          if (row.kind === 'pc' && row.characterId) {
                            setPcInitiative(row.characterId, die)
                          }
                          if (row.kind === 'npc' && row.npcInstanceId) {
                            setNpcInit(row.npcInstanceId, die)
                          }
                        }}
                        className="ml-1 w-16 rounded border border-slate-600 bg-slate-950 px-1 py-0.5 font-mono text-sm text-slate-100 disabled:opacity-40"
                      />
                    </label>
                  </div>
                  <div className="mt-2">
                    {row.kind === 'npc' && row.npcInstanceId ? (
                      <GmApmPips
                        maxApm={row.maxApm}
                        spent={row.apmSpent}
                        tappable
                        onSpend={() => tapNpcApm(row.npcInstanceId!)}
                        label={`${row.name} APM`}
                      />
                    ) : (
                      <div>
                        <GmApmPips
                          maxApm={row.maxApm}
                          spent={0}
                          tappable={false}
                          label={`${row.name} APM (player-managed)`}
                        />
                        <p className="mt-1 text-[10px] text-slate-500">
                          Player-managed. Device sync will check these off later.
                        </p>
                      </div>
                    )}
                  </div>
                  {row.kind === 'pc' && row.characterId && emit ? (
                    <div className="mt-2 flex items-end gap-2">
                      <label className="text-[10px] uppercase text-slate-500">
                        H.F. save d20
                        <input
                          type="number"
                          value={hfDieByPc[row.characterId] ?? ''}
                          onChange={(e) =>
                            setHfDieByPc((prev) => ({
                              ...prev,
                              [row.characterId!]: e.target.value,
                            }))
                          }
                          className="ml-1 w-16 rounded border border-violet-700 bg-slate-950 px-1 py-0.5 font-mono text-sm text-violet-100"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const n = Number(hfDieByPc[row.characterId!]?.trim())
                          if (!Number.isFinite(n)) return
                          recordPcHfSave(row.characterId!, n)
                          setHfDieByPc((prev) => ({
                            ...prev,
                            [row.characterId!]: '',
                          }))
                        }}
                        className="rounded bg-violet-700 px-2 py-1 text-[10px] font-bold uppercase text-white"
                      >
                        Record save
                      </button>
                    </div>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900/80">
          <h2 className="border-b border-slate-800 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            Adversary Quick-Blocks
          </h2>
          <ul className="min-h-0 flex-1 overflow-y-auto p-2">
            {session.npcs.length === 0 ? (
              <li className="p-3 text-xs text-slate-500">
                Spawn fodder on the Cast tab.
              </li>
            ) : (
              session.npcs.map((npc) => {
                const arch = archetypes.get(npc.archetypeId)
                const strike = arch ? npcStrikeBonus(arch, npc.variantId) : 0
                const parry = arch ? npcParryBonus(arch, npc.variantId) : 0
                const canHf = Boolean(arch?.horrorFactorMorale)
                return (
                  <li
                    key={npc.instanceId}
                    className="mb-2 rounded-lg border border-amber-900/40 bg-slate-950/80 p-3"
                  >
                    <p className="text-sm font-bold text-amber-50">{npc.displayName}</p>
                    <p className="font-mono text-[11px] text-slate-400">
                      H.P. {npc.hpCurrent}/{npc.hpMax} · S.D.C. {npc.sdcCurrent}/
                      {npc.sdcMax} · Strike {formatBonus(strike)} · Parry{' '}
                      {formatBonus(parry)}
                    </p>
                    {arch?.equipment.length ? (
                      <p className="mt-1 text-[11px] text-slate-500">
                        {arch.equipment
                          .map((eq) =>
                            eq.damageFormula
                              ? `${eq.label} ${eq.damageFormula}`
                              : eq.label,
                          )
                          .join(' · ')}
                      </p>
                    ) : null}
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <GmMathIn
                        label="Strike (math-in)"
                        bonus={strike}
                        onRecord={(d20) =>
                          recordStrike(npc.instanceId, d20, strike)
                        }
                      />
                      <div className="flex flex-col justify-end gap-2">
                        <button
                          type="button"
                          disabled={!canHf}
                          title={
                            canHf
                              ? 'Flash H.F. to the table. Player APM is not auto-spent.'
                              : 'This archetype has no H.F. / morale emitter.'
                          }
                          onClick={() => emitNpcHf(npc.instanceId)}
                          className="rounded-lg border border-violet-500/70 bg-violet-900/50 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-violet-100 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-600"
                        >
                          {canHf
                            ? `Emit H.F. ${arch?.horrorFactorMorale?.saveTarget}`
                            : 'No H.F. emitter'}
                        </button>
                        <GmApmPips
                          maxApm={npc.maxApm}
                          spent={npc.apmSpent}
                          tappable
                          onSpend={() => tapNpcApm(npc.instanceId)}
                          label={`${npc.displayName} APM`}
                        />
                      </div>
                    </div>
                  </li>
                )
              })
            )}
          </ul>
          <div className="max-h-36 overflow-y-auto border-t border-slate-800 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Table log
            </p>
            {session.eventLog.length === 0 ? (
              <p className="mt-1 text-[11px] text-slate-600">Empty.</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {session.eventLog.slice(0, 12).map((evt) => (
                  <li key={evt.id} className="text-[11px] text-slate-400">
                    {evt.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
      {partySlices.length === 0 ? null : (
        <p className="text-[10px] text-slate-600">
          Players contest the printed strike total on their own sheets. The hub
          does not wait for a parry prompt in v1.
        </p>
      )}
    </div>
  )
}
