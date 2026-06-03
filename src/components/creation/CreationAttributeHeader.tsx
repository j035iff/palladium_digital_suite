import { useMemo } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { resolveEffectivePalladiumOcc } from '../../lib/occComposition'
import type { ForgeAttrKey } from '../../lib/attributeKeys'
import { FORGE_ATTRIBUTE_KEYS } from '../../lib/attributeKeys'
import { isDiceNotation } from '../../lib/diceNotationBounds'

const ATTR_LABELS: Record<ForgeAttrKey, string> = {
  iq: 'I.Q.',
  me: 'M.E.',
  ma: 'M.A.',
  ps: 'P.S.',
  pp: 'P.P.',
  pe: 'P.E.',
  pb: 'P.B.',
  spd: 'Spd',
}

function bonusDisplay(raw: number | string | undefined): string | null {
  if (raw == null) return null
  if (typeof raw === 'number') return raw >= 0 ? `+${raw}` : String(raw)
  if (isDiceNotation(raw)) return `+${raw}`
  return String(raw)
}

export function CreationAttributeHeader() {
  const { activeRace, effectiveOcc, character, activeFormState } = useCharacter()

  const occ = useMemo(
    () =>
      effectiveOcc
        ? resolveEffectivePalladiumOcc(
            effectiveOcc,
            character.occSpecializationId,
          )
        : undefined,
    [effectiveOcc, character.occSpecializationId],
  )

  const raceDice = activeRace?.attributes
  const reqs = occ?.attributeRequirements as Record<string, number> | undefined
  const attrBonuses = occ?.staticBonuses?.attributes

  return (
    <section
      aria-label="Creation attribute header"
      className="rounded-lg border-2 border-blue-300 bg-sky-50/90 px-4 py-3 dark:border-violet-700 dark:bg-violet-950/40"
    >
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-blue-800 dark:text-violet-300">
        Primary attributes — race dice &amp; O.C.C. overlays
      </p>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {FORGE_ATTRIBUTE_KEYS.map((attr) => {
          const dice =
            raceDice?.[attr === 'ps' ? 'ps' : attr]?.toString() ?? '3D6'
          const min = reqs?.[attr === 'ps' ? 'ps' : attr]
          const bonus = bonusDisplay(attrBonuses?.[attr])
          const value =
            attr === 'ps'
              ? activeFormState.attributes.ps.score
              : activeFormState.attributes[attr]
          return (
            <div
              key={attr}
              className="relative rounded border border-blue-200 bg-white px-2 py-2 dark:border-violet-800 dark:bg-slate-950/60"
            >
              {min != null && min > 0 ? (
                <span
                  className="absolute -top-2 left-1/2 -translate-x-1/2 rounded bg-rose-600 px-1.5 py-0.5 text-[9px] font-black uppercase text-white"
                  title="O.C.C. minimum"
                >
                  {min}+
                </span>
              ) : null}
              <dt className="text-center text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:text-violet-300">
                {ATTR_LABELS[attr]}
              </dt>
              <dd className="text-center font-mono text-[10px] font-semibold uppercase text-slate-500 dark:text-violet-400/80">
                {dice}
              </dd>
              <dd className="text-center font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-violet-50">
                {value}
              </dd>
              {bonus ? (
                <dd className="text-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  {bonus}
                </dd>
              ) : null}
            </div>
          )
        })}
      </dl>
    </section>
  )
}
