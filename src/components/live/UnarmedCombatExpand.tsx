import { useState } from 'react'
import type { ActiveForm, Character } from '../../types'
import type { HandToHandCombatProfile } from '../../lib/handToHandPipeline'
import type { SheetCombatDerived } from '../../lib/sheetBonuses'
import { formatSheetBonusEquation } from '../../lib/sheetBonuses'
import { formatBonus } from '../../lib/combatQuickBonuses'
import { ManualRollField } from '../combat/ManualRollField'
import {
  computeUnarmedStrikeBreakdown,
  unarmedDamageLabel,
} from '../../lib/strikeEngine'
import { getHandToHandSkillById } from '../../data/library/handToHandCatalogLoader'
import type { HandToHandSkill } from '../../types'
import type { StrengthCapacities } from '../../types'
import { HandToHandStylePicker } from './HandToHandStylePicker'

function SheetCombatStatTile({
  label,
  detail,
  morphus,
}: {
  label: string
  detail: SheetCombatDerived['strike']
  morphus: boolean
}) {
  const tip = formatSheetBonusEquation(detail, formatBonus)
  return (
    <div
      className={`group relative min-h-[5rem] rounded-md border px-2 py-2 text-center ${
        morphus ? 'border-violet-400/80 bg-slate-950/80' : 'border-blue-200 bg-white'
      }`}
    >
      <p
        className={`mb-1 text-[9px] font-bold uppercase leading-tight opacity-80 ${
          morphus ? 'text-violet-200' : 'text-slate-700'
        }`}
      >
        {label}
      </p>
      <p
        className={`font-mono text-2xl font-black tabular-nums leading-none ${
          morphus ? 'text-amber-300' : 'text-blue-800'
        }`}
      >
        {formatBonus(detail.total)}
      </p>
      <div
        role="tooltip"
        className={`pointer-events-none invisible absolute bottom-full left-1/2 z-20 mb-1 w-[min(100vw-2rem,22rem)] -translate-x-1/2 rounded-md border-2 px-2 py-1.5 text-left text-[10px] font-semibold leading-snug opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 ${
          morphus
            ? 'border-violet-400/90 bg-black/92 text-violet-50'
            : 'border-blue-400 bg-white text-slate-900'
        }`}
      >
        {tip}
      </div>
    </div>
  )
}

function formatWindow(values: readonly number[] | undefined): string | null {
  if (!values?.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  if (sorted.length === 1) return `${sorted[0]}`
  return `${sorted[0]}–${sorted[sorted.length - 1]}`
}

function upcomingUnlocks(skill: HandToHandSkill | undefined, level: number): string[] {
  if (!skill) return []
  const lines: string[] = []
  const seen = new Set<string>()
  for (const [key, row] of Object.entries(skill.progression)) {
    const at = Number.parseInt(key, 10)
    if (!Number.isFinite(at) || at <= level) continue
    const bits: string[] = []
    if (row.kickAttack) bits.push(`Kick ${row.kickAttack.damageFormula}`)
    if (row.bodyThrowFlip) bits.push(`Body throw ${row.bodyThrowFlip.damageFormula}`)
    if (row.jumpKick) bits.push('Jump Kick')
    if (row.leapAttack) bits.push('Leap Attack')
    if (row.entangleUnlocked) bits.push('Entangle')
    if (row.disarmUnlocked) bits.push('Disarm')
    if (row.pairedWeapons) bits.push('Paired weapons')
    if (bits.length === 0) continue
    const label = `Lv ${at}: ${bits.join(', ')}`
    if (!seen.has(label)) {
      seen.add(label)
      lines.push(label)
    }
  }
  return lines
}

type Props = {
  morphus: boolean
  character: Character
  activeForm: ActiveForm
  combat: SheetCombatDerived
  hth: HandToHandCombatProfile
  ownedStyles: readonly { catalogId: string; name: string }[]
  onSelectStyle: (catalogId: string) => void
  strengthCapacities: StrengthCapacities
  onStrikeResolved: (payload: { title: string; detail: string; total: number }) => void
}

/**
 * Unarmed expand — remaining combat-sheet bonuses + HtH maneuvers + dice (not Initiative).
 */
export function UnarmedCombatExpand({
  morphus,
  character,
  activeForm,
  combat,
  hth,
  ownedStyles,
  onSelectStyle,
  strengthCapacities,
  onStrikeResolved,
}: Props) {
  const [strikeManual, setStrikeManual] = useState('')
  const [damageManual, setDamageManual] = useState('')
  const acc = hth.accumulated
  const catalog = hth.skillId ? getHandToHandSkillById(hth.skillId) : undefined
  const locked = upcomingUnlocks(catalog, character.level)
  const strike = computeUnarmedStrikeBreakdown(character, activeForm, {
    skillName: hth.skillName,
    accumulated: acc,
  })
  const punchHint = unarmedDamageLabel(character, activeForm, acc.damage)
  const crit = formatWindow(acc.criticalStrikeWindow)
  const ko = formatWindow(acc.knockoutStunWindow)
  const death = formatWindow(acc.deathBlowWindow)
  const muted = morphus ? 'text-violet-300/90' : 'text-slate-600'
  const card = morphus ? 'border-violet-700/70 bg-black/30 text-violet-100' : 'border-slate-200 bg-white text-slate-800'

  return (
    <div className="space-y-4">
      <HandToHandStylePicker
        morphus={morphus}
        styles={ownedStyles}
        activeCatalogId={hth.skillId}
        onSelect={onSelectStyle}
        heading="Known Hand-to-Hand"
        singleStyleHint={`${ownedStyles[0]?.name ?? 'Hand-to-Hand: None'} — listed on the Skills tab. A second style (rare) unlocks a switcher here.`}
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SheetCombatStatTile label="Strike" detail={combat.strike} morphus={morphus} />
        <SheetCombatStatTile label="Parry" detail={combat.parry} morphus={morphus} />
        <SheetCombatStatTile label="Dodge" detail={combat.dodge} morphus={morphus} />
        <SheetCombatStatTile label="Roll w/ Impact" detail={combat.rollWithImpact} morphus={morphus} />
      </div>

      <section className={`rounded-lg border px-3 py-2 text-[11px] ${card}`}>
        <h4 className={`mb-1 text-[10px] font-black uppercase tracking-wider ${morphus ? 'text-violet-200' : 'text-blue-900'}`}>
          Punch / unarmed damage
        </h4>
        <p className="font-mono font-semibold">{punchHint}</p>
        {strengthCapacities.handToHandDamage.kind === 'supernatural' ? (
          <ul className="mt-2 space-y-0.5 font-mono">
            <li>Restrained: {strengthCapacities.handToHandDamage.restrainedPunch}</li>
            <li>Full: {strengthCapacities.handToHandDamage.fullStrengthPunch}</li>
            <li>
              Power: {strengthCapacities.handToHandDamage.powerPunch} —{' '}
              {strengthCapacities.handToHandDamage.powerPunchMeleeActions} APM
            </li>
          </ul>
        ) : null}
      </section>

      <section className={`rounded-lg border px-3 py-2 text-[11px] ${card}`}>
        <h4 className={`mb-1 text-[10px] font-black uppercase tracking-wider ${morphus ? 'text-violet-200' : 'text-blue-900'}`}>
          Hand-to-Hand maneuvers
        </h4>
        <ul className="space-y-1">
          {acc.kickAttack ? (
            <li>
              Kick: {acc.kickAttack.damageFormula}
              {acc.kickAttack.description ? ` — ${acc.kickAttack.description}` : ''}
            </li>
          ) : (
            <li className={`opacity-55 ${muted}`}>Kick — not yet unlocked</li>
          )}
          {acc.bodyThrowFlip ? (
            <li>
              Body throw / flip: {acc.bodyThrowFlip.damageFormula}
              {acc.bodyThrowFlip.effects?.length
                ? ` (${acc.bodyThrowFlip.effects.join('; ')})`
                : ''}
            </li>
          ) : (
            <li className={`opacity-55 ${muted}`}>Body throw / flip — not yet unlocked</li>
          )}
          <li className={acc.jumpKick ? '' : `opacity-55 ${muted}`}>
            Jump Kick{acc.jumpKick ? ' — automatic critical; uses remaining attacks this melee' : ' — not yet unlocked'}
          </li>
          <li className={acc.leapAttack ? '' : `opacity-55 ${muted}`}>
            Leap Attack{acc.leapAttack ? ' — automatic critical; uses remaining attacks this melee' : ' — not yet unlocked'}
          </li>
          <li>
            Pull punch {formatBonus(acc.pullPunch)}
            {acc.entangleUnlocked ? ` · Entangle ${formatBonus(acc.entangle)}` : ' · Entangle locked'}
            {acc.disarmUnlocked ? ` · Disarm ${formatBonus(acc.disarm)}` : ' · Disarm locked'}
          </li>
          {crit ? <li>Critical strike on {crit}</li> : null}
          {ko ? <li>Knockout / stun on {ko}</li> : null}
          {death ? <li>Death blow on {death}</li> : null}
          {acc.criticalStrikeFromBehind ? (
            <li>Critical from behind ×{acc.fromBehindDamageMultiplier}</li>
          ) : null}
          {acc.pairedWeapons ? <li>Paired weapons</li> : null}
        </ul>
        {locked.length > 0 ? (
          <p className={`mt-2 text-[10px] ${muted}`}>Later unlocks: {locked.join(' · ')}</p>
        ) : null}
        {hth.attackApmCost > 1 ? (
          <p className={`mt-2 font-bold ${morphus ? 'text-amber-200' : 'text-amber-800'}`}>
            Untrained attacks cost {hth.attackApmCost} A.P.M. (tap the pips once per action).
          </p>
        ) : null}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <ManualRollField
          label="Strike (d20)"
          morphus={morphus}
          manualValue={strikeManual}
          onManualValueChange={setStrikeManual}
          calculatedBonus={strike.total}
          onRecord={() => {
            const d = Number(strikeManual.trim())
            if (!Number.isFinite(d)) return
            const t = d + strike.total
            onStrikeResolved({
              title: 'Unarmed strike',
              detail: `Manual (${d}) + bonus (${strike.total}) = ${t}`,
              total: t,
            })
          }}
          recordLabel="Record strike"
        />
        <ManualRollField
          label="Damage"
          morphus={morphus}
          manualValue={damageManual}
          onManualValueChange={setDamageManual}
          calculatedBonus={0}
          hint={punchHint}
        />
      </div>
    </div>
  )
}
