import type { MorphusDerivedSheetSlice } from '../../lib/morphusPassiveBridge'
import {
  formatMorphusDamageAffinityMultiplier,
  GIMMICK_TOY_SWITCH_LOCATION_LABELS,
} from '../../lib/morphusCharacteristicAggregation'
import { formatPolymorphicModifier } from '../../lib/morphusPolymorphicResolver'

const WEAPON_TRAIT_LABELS: Record<string, string> = {
  indestructible: 'Indestructible',
  disarm_immune: 'Disarm immune',
  infinite_ammo: 'Infinite ammo',
  auto_returning: 'Auto-returning',
}

const SENSORY_OBFUSCATION_LABELS: Record<string, string> = {
  digital_photo_blur: 'Digital photo blur',
  video_distortion: 'Video distortion',
  biometric_scrambling: 'Biometric scrambling',
  scent_masking: 'Scent masking',
}

const BURROW_SUBSTRATE_LABELS: Record<string, string> = {
  soil_dirt: 'Soil / dirt',
  solid_rock: 'Solid rock',
  concrete: 'Concrete',
}

const GIMMICK_FLAG_LABELS: Record<string, string> = {
  infinite_ammo: 'Infinite uses',
  fragile: 'Fragile',
  auto_returning: 'Auto-returning',
}

const REGEN_LABELS: Record<string, string> = {
  hourly: 'Hourly',
  daily: 'Daily',
  per_24_hours: 'Every 24 hours',
  per_transformation: 'Per transformation',
  per_encounter: 'Per encounter',
}

export function MorphusTraitsPanel({
  derived,
  activeBurstKeys,
  onToggleBurst,
  activeGimmickSwitchKeys,
  onToggleGimmickSwitch,
}: {
  derived: MorphusDerivedSheetSlice
  activeBurstKeys: readonly string[]
  onToggleBurst: (burstKey: string) => void
  activeGimmickSwitchKeys: readonly string[]
  onToggleGimmickSwitch: (switchKey: string) => void
}) {
  const hasWeapons = derived.naturalWeapons.length > 0
  const hasCompanions = derived.companions.length > 0
  const hasNotes = derived.traitNotes.length > 0
  const hasTraits = derived.weaponTraits.length > 0
  const hasRolls = derived.customSystemRolls.length > 0
  const hasBurrow = derived.burrowingEngine != null
  const hasObfuscation = derived.externalSensoryObfuscation.length > 0
  const hasPoly = derived.polymorphicTemplates.length > 0
  const hasGimmicks = derived.gimmickInventory.length > 0
  const hasDisabled =
    derived.disabledNaturalAttackTags.length > 0
  const hasVarScale = derived.variableScaleNotes.length > 0
  const jump = derived.jumpBonuses
  const hasJump =
    jump.standingHeight > 0 ||
    jump.standingDistance > 0 ||
    jump.runningHeight > 0 ||
    jump.runningDistance > 0
  const hasSwim = derived.swimSpeedBonus !== 0
  const hasAffinity = derived.damageAffinityNotes.length > 0
  const hasLimbs = derived.limbComponents.length > 0
  const hasBursts = derived.activatedAbilities.length > 0
  const hasGimmickSwitches = derived.gimmickToySwitches.length > 0
  const hasIntercepts = derived.combatInterceptions.length > 0
  const hasNv = derived.nightvisionRangeFlatBonus > 0
  const flight = derived.flightEngine
  const hasFlight =
    flight != null &&
    (flight.flySpdAttribute > 0 ||
      flight.maxSpeedMph > 0 ||
      flight.maxAltitudeFeet != null ||
      flight.strikeBonus !== 0 ||
      flight.parryBonus !== 0 ||
      flight.dodgeBonus !== 0)
  const hasTelescopic = derived.sensoryFlags.telescopicVision
  const hasSeeInvisible = derived.sensoryFlags.seeInvisible
  if (
    !hasWeapons &&
    !hasCompanions &&
    !hasNotes &&
    !hasTraits &&
    !hasRolls &&
    !hasBurrow &&
    !hasObfuscation &&
    !hasPoly &&
    !hasGimmicks &&
    !hasDisabled &&
    !hasVarScale &&
    !hasJump &&
    !hasSwim &&
    !hasAffinity &&
    !hasLimbs &&
    !hasBursts &&
    !hasGimmickSwitches &&
    !hasIntercepts &&
    !hasNv &&
    !hasFlight &&
    !hasTelescopic &&
    !hasSeeInvisible
  ) {
    return null
  }

  return (
    <section
      aria-labelledby="morphus-traits-heading"
      className="rounded-lg border border-violet-800/60 bg-violet-950/30 px-4 py-3"
    >
      <h2
        id="morphus-traits-heading"
        className="mb-2 text-sm font-semibold uppercase tracking-wide text-violet-300"
      >
        Morphus traits (aggregated)
      </h2>
      {hasPoly ? (
        <p className="mb-2 text-xs font-semibold text-amber-200/95">
          Polymorphic template:{' '}
          {derived.polymorphicTemplates.map((p) => p.traitName).join(' · ')}
        </p>
      ) : null}
      {hasBurrow && derived.burrowingEngine ? (
        <p className="mb-2 text-xs text-violet-200/90">
          Burrow {derived.burrowingEngine.feetPerMeleeRound} ft/melee on{' '}
          {derived.burrowingEngine.allowedSubstrates
            .map((s) => BURROW_SUBSTRATE_LABELS[s] ?? s)
            .join(', ')}
        </p>
      ) : null}
      {hasObfuscation ? (
        <p className="mb-2 text-xs text-violet-200/90">
          Identity shield:{' '}
          {derived.externalSensoryObfuscation
            .map((o) => SENSORY_OBFUSCATION_LABELS[o] ?? o)
            .join(' · ')}
        </p>
      ) : null}
      {hasRolls ? (
        <ul className="mb-2 list-inside list-disc text-sm text-violet-100/95">
          {derived.customSystemRolls.map((r, i) => (
            <li key={`${r.sourceTraitId}-${r.rollName}-${i}`}>
              <span className="font-medium">{r.rollName}</span>
              {' — '}
              {r.resolvedChance}% at level
              <span className="text-violet-400/80"> ({r.sourceTraitName})</span>
            </li>
          ))}
        </ul>
      ) : null}
      {hasDisabled ? (
        <p className="mb-2 text-xs text-rose-200/90">
          Disabled natural attacks:{' '}
          {derived.disabledNaturalAttackTags.join(', ')}
        </p>
      ) : null}
      {hasVarScale ? (
        <ul className="mb-2 list-inside list-disc text-xs text-violet-200/85">
          {derived.variableScaleNotes.map((n) => (
            <li key={`${n.traitId}-${n.statKey}`}>
              <span className="font-medium">{n.traitName}</span> ({n.statKey}):{' '}
              {n.conditions.join(' · ')}
            </li>
          ))}
        </ul>
      ) : null}
      {hasJump ? (
        <p className="mb-2 text-xs text-violet-200/90">
          Jump +{jump.standingHeight} ft height / +{jump.standingDistance} ft distance
          {jump.runningHeight > 0 || jump.runningDistance > 0
            ? ` (run +${jump.runningHeight}/+${jump.runningDistance})`
            : ''}
        </p>
      ) : null}
      {hasSwim ? (
        <p className="mb-2 text-xs text-violet-200/90">
          Swim speed bonus: +{derived.swimSpeedBonus}
        </p>
      ) : null}
      {hasNv ? (
        <p className="mb-2 text-xs text-violet-200/90">
          Nightvision +{derived.nightvisionRangeFlatBonus} ft (Morphus)
        </p>
      ) : null}
      {hasTelescopic ? (
        <p className="mb-2 text-xs text-violet-200/90">
          Telescopic vision (Morphus)
        </p>
      ) : null}
      {hasSeeInvisible ? (
        <p className="mb-2 text-xs text-violet-200/90">
          See invisible (Morphus)
        </p>
      ) : null}
      {hasFlight && flight ? (
        <p className="mb-2 text-xs text-violet-200/90">
          Flight
          {flight.flySpdAttribute > 0 ? ` Spd ${flight.flySpdAttribute}` : ''}
          {flight.maxSpeedMph > 0 ? ` up to ${flight.maxSpeedMph} mph` : ''}
          {flight.maxAltitudeFeet != null
            ? ` · max altitude ${flight.maxAltitudeFeet} ft`
            : ''}
          {flight.strikeBonus !== 0 ||
          flight.parryBonus !== 0 ||
          flight.dodgeBonus !== 0
            ? ` · in-flight combat +${[
                flight.strikeBonus ? `strike ${flight.strikeBonus}` : '',
                flight.parryBonus ? `parry ${flight.parryBonus}` : '',
                flight.dodgeBonus ? `dodge ${flight.dodgeBonus}` : '',
              ]
                .filter(Boolean)
                .join(', ')}`
            : ''}
        </p>
      ) : null}
      {hasAffinity ? (
        <p className="mb-2 text-xs text-violet-200/90">
          Damage affinities:{' '}
          {derived.damageAffinityNotes
            .map((a) => `${a.label} (${formatMorphusDamageAffinityMultiplier(a.multiplier)})`)
            .join(' · ')}
        </p>
      ) : null}
      {hasLimbs ? (
        <ul className="mb-2 space-y-1 text-sm text-violet-100/95">
          {derived.limbComponents.map((limb, i) => (
            <li
              key={`${limb.sourceTraitId}-${limb.limbName}-${i}`}
              className="rounded border border-violet-700/40 bg-slate-950/30 px-2 py-1"
            >
              <span className="font-medium">{formatPolymorphicModifier(limb.quantity)}× {limb.limbName}</span>
              {' — '}
              S.D.C. {formatPolymorphicModifier(limb.sdc)}
              {limb.hp != null ? ` · H.P. ${formatPolymorphicModifier(limb.hp)}` : ''}
              {limb.ar != null ? ` · A.R. ${limb.ar}` : ''}
              {limb.calledShotPenalty != null
                ? ` · called shot ${limb.calledShotPenalty}`
                : ''}
              {limb.destructionConditionOverrides ? (
                <span className="text-xs text-amber-200/80">
                  {' '}
                  · on destroy: spd/other overrides apply
                </span>
              ) : null}
              <span className="text-violet-400/80"> ({limb.sourceTraitName})</span>
            </li>
          ))}
        </ul>
      ) : null}
      {hasGimmickSwitches ? (
        <div className="mb-2 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-300/90">
            Gimmick toy switches
          </p>
          <p className="text-[10px] text-violet-300/70">
            Toggle effects while active (one switch press). Preset rows are catalog
            options until assigned at creation.
          </p>
          <ul className="max-h-48 space-y-1 overflow-y-auto text-sm text-violet-100/95">
            {derived.gimmickToySwitches.map((sw) => {
              const on = activeGimmickSwitchKeys.includes(sw.switchKey)
              const loc =
                sw.bodyLocation != null
                  ? GIMMICK_TOY_SWITCH_LOCATION_LABELS[sw.bodyLocation]
                  : null
              const detail = [
                sw.effect.durationFormula,
                sw.effect.durationMeleeRounds != null
                  ? `${sw.effect.durationMeleeRounds} melee round(s)`
                  : null,
                sw.effect.damageFormula
                  ? `dmg ${sw.effect.damageFormula}`
                  : null,
                sw.effect.strikeBonus != null ? `strike +${sw.effect.strikeBonus}` : null,
                sw.effect.dodgeBonus != null ? `dodge +${sw.effect.dodgeBonus}` : null,
                sw.effect.rangeFeet != null ? `${sw.effect.rangeFeet} ft` : null,
              ]
                .filter(Boolean)
                .join(' · ')
              return (
                <li
                  key={sw.switchKey}
                  className="flex flex-wrap items-center gap-2 rounded border border-violet-700/50 bg-slate-950/40 px-2 py-1"
                >
                  <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => onToggleGimmickSwitch(sw.switchKey)}
                      className="mt-0.5 accent-violet-500"
                    />
                    <span className="min-w-0">
                      <span className="font-medium">{sw.label}</span>
                      {loc ? (
                        <span className="text-violet-300/80"> — {loc}</span>
                      ) : null}
                      {sw.isPresetCatalog ? (
                        <span className="text-amber-200/80 text-xs"> (preset)</span>
                      ) : null}
                      {detail ? (
                        <span className="block text-xs text-violet-300/80">{detail}</span>
                      ) : null}
                      {sw.effect.notes ? (
                        <span className="block text-xs text-violet-400/75">
                          {sw.effect.notes}
                        </span>
                      ) : null}
                    </span>
                  </label>
                  <span className="shrink-0 text-violet-400/80 text-xs">
                    ({sw.sourceTraitName})
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
      {hasBursts ? (
        <div className="mb-2 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-300/90">
            Activated abilities
          </p>
          <ul className="space-y-1 text-sm text-violet-100/95">
            {derived.activatedAbilities.map((ab) => {
              const on = activeBurstKeys.includes(ab.burstKey)
              return (
                <li
                  key={ab.burstKey}
                  className="flex flex-wrap items-center gap-2 rounded border border-violet-700/50 bg-slate-950/40 px-2 py-1"
                >
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => onToggleBurst(ab.burstKey)}
                      className="accent-violet-500"
                    />
                    <span className="font-medium">{ab.abilityName}</span>
                  </label>
                  <span className="text-xs text-violet-300/80">
                    {ab.chargesPerPeriod === 0
                      ? 'Unlimited'
                      : `${ab.chargesPerPeriod}/${REGEN_LABELS[ab.resetPeriod] ?? ab.resetPeriod}`}
                    {' · '}
                    {ab.durationFormula}
                  </span>
                  <span className="text-violet-400/80 text-xs">
                    ({ab.sourceTraitName})
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
      {hasIntercepts ? (
        <p className="mb-2 text-xs text-violet-200/90">
          Combat intercepts:{' '}
          {derived.combatInterceptions
            .map(
              (r) =>
                `${r.label} ${r.modifierFlat >= 0 ? '+' : ''}${r.modifierFlat}`,
            )
            .join(' · ')}
        </p>
      ) : null}
      {hasGimmicks ? (
        <ul className="mb-2 space-y-1.5 text-sm text-violet-100/95">
          {derived.gimmickInventory.map((g, i) => (
            <li
              key={`${g.sourceTraitId}-${g.itemName}-${i}`}
              className="rounded border border-violet-700/40 bg-slate-950/30 px-2 py-1"
            >
              <span className="font-medium">{g.itemName}</span>
              {' — '}
              S.D.C. {g.sdc}
              {g.usageLimit != null ? ` · ${g.usageLimit} uses` : ''}
              {g.usageLimitFormula != null
                ? ` · ${g.usageLimitFormula} uses`
                : ''}
              {g.regenerationRule
                ? ` · ${REGEN_LABELS[g.regenerationRule] ?? g.regenerationRule}`
                : ''}
              {(g.components?.length ?? 0) > 0
                ? ` · ${g.components!.map((c) => `${formatPolymorphicModifier(c.quantity)}× ${c.limbName} ${formatPolymorphicModifier(c.sdc)} S.D.C.`).join(', ')}`
                : ''}
              <br />
              <span className="text-xs text-violet-300/80">{g.effectFormula}</span>
              {(g.traitFlags?.length ?? 0) > 0 ? (
                <span className="text-xs text-violet-400/70">
                  {' '}
                  ·{' '}
                  {g.traitFlags!
                    .map((f) => GIMMICK_FLAG_LABELS[f] ?? f)
                    .join(' · ')}
                </span>
              ) : null}
              <span className="text-violet-400/80"> ({g.sourceTraitName})</span>
            </li>
          ))}
        </ul>
      ) : null}
      {hasTraits ? (
        <p className="mb-2 text-xs text-violet-200/90">
          Weapon flags:{' '}
          {derived.weaponTraits
            .map((t) => WEAPON_TRAIT_LABELS[t] ?? t)
            .join(' · ')}
        </p>
      ) : null}
      {hasWeapons ? (
        <ul className="mb-2 list-inside list-disc text-sm text-violet-100/95">
          {derived.naturalWeapons.map((w, i) => (
            <li
              key={`${w.sourceTraitId}-${i}`}
              className={w.isLimbTypeDisabled ? 'opacity-60 line-through' : undefined}
            >
              <span className="font-medium">{w.label ?? w.limbType}</span>
              {' — '}
              {w.displayDamage}
              {w.isAdditiveToHth ? ' (+ HtH)' : ''}
              {w.isLimbTypeDisabled ? ' [disabled]' : ''}
              <span className="text-violet-400/80"> ({w.sourceTraitName})</span>
            </li>
          ))}
        </ul>
      ) : null}
      {hasCompanions ? (
        <div className="mb-2 space-y-2 text-sm text-violet-100/95">
          {derived.companions.map((c) => (
            <div
              key={c.sourceTraitId}
              className="rounded border border-violet-700/50 bg-slate-950/40 px-2 py-1.5"
            >
              <p className="font-medium text-violet-200">{c.entityName}</p>
              <p className="text-xs text-violet-400/90">
                Pool: {c.poolSharingRule.replace(/_/g, ' ')} · from {c.sourceTraitName}
              </p>
              {Object.keys(c.attributeDeltas).length > 0 ? (
                <p className="mt-1 font-mono text-xs">
                  {Object.entries(c.attributeDeltas)
                    .filter(([, v]) => v != null && v !== 0)
                    .map(([k, v]) => `${k} ${v! >= 0 ? '+' : ''}${v}`)
                    .join(' · ')}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {hasNotes ? (
        <details className="text-xs text-violet-300/80">
          <summary className="cursor-pointer font-semibold uppercase tracking-wide">
            Rules text ({derived.traitNotes.length} traits)
          </summary>
          <ul className="mt-2 space-y-2">
            {derived.traitNotes.map((n) => (
              <li key={n.traitId}>
                <span className="font-medium text-violet-200">{n.traitName}</span>
                <ul className="ml-4 list-disc">
                  {n.lines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  )
}

