import { formatBonus, formatPercent } from './GmApmPips'
import type { GmPartyObserverSlice } from '../../lib/gm/partyObserver'

/** Shared vitals / attributes / HtH / abilities block for People PC cards. */
export function GmPartySummaryFields({
  pc,
}: {
  pc: GmPartyObserverSlice
}) {
  const attrs = pc.attributes
  return (
    <>
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
          <dt className="text-[9px] uppercase text-slate-500">P.P.E.</dt>
          <dd>
            {pc.ppeCurrent}/{pc.ppeMax}
          </dd>
        </div>
        <div>
          <dt className="text-[9px] uppercase text-slate-500">I.S.P.</dt>
          <dd>
            {pc.ispCurrent}/{pc.ispMax}
          </dd>
        </div>
        <div>
          <dt className="text-[9px] uppercase text-slate-500">HtH</dt>
          <dd className="truncate" title={pc.hthSkillName ?? undefined}>
            {pc.hthSkillName ?? '—'}
          </dd>
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

      <dl className="mt-3 grid grid-cols-4 gap-2 font-mono text-[11px] text-slate-200">
        {(
          [
            ['I.Q.', attrs.iq],
            ['M.E.', attrs.me],
            ['M.A.', attrs.ma],
            ['P.S.', attrs.ps],
            ['P.P.', attrs.pp],
            ['P.E.', attrs.pe],
            ['P.B.', attrs.pb],
            ['Spd', attrs.spd],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt className="text-[9px] uppercase text-slate-500">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {pc.abilities.length > 0 ? (
        <div className="mt-3 space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
            Abilities
          </p>
          {pc.abilities.map((section) => (
            <div key={section.id}>
              <p className="text-[10px] font-semibold text-slate-400">
                {section.label}
              </p>
              <p className="text-[11px] leading-snug text-slate-300">
                {section.names.join(' · ')}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-slate-500">No abilities listed.</p>
      )}
    </>
  )
}
