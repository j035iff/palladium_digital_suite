import type {
  MorphusCustomTraitResolution,
  MorphusCustomTraitInstance,
  MorphusPolymorphicModifier,
  MorphusSaveModifiers,
  MorphusStatModifiers,
} from '../../../types'
import {
  fieldAllowedForCustomTrait,
  MORPHUS_COMMON_SAVE_KEYS,
  MORPHUS_COMMON_STAT_KEYS,
  MORPHUS_EXPERT_STAT_KEYS,
  MORPHUS_SAVE_KEY_LABELS,
  MORPHUS_STAT_KEY_LABELS,
} from '../../../lib/morphusCustomTrait'
import { PolymorphicModifierRow } from './PolymorphicModifierRow'

type Props = {
  instance: MorphusCustomTraitInstance
  resolution?: MorphusCustomTraitResolution
  expertMode: boolean
  onChange: (next: MorphusCustomTraitInstance) => void
}

function patchStat(
  stats: MorphusStatModifiers | undefined,
  key: keyof MorphusStatModifiers,
  mod: MorphusPolymorphicModifier | undefined,
): MorphusStatModifiers {
  const next = { ...(stats ?? {}) }
  if (mod == null) delete next[key]
  else next[key] = mod
  return next
}

function patchSave(
  saves: MorphusSaveModifiers | undefined,
  key: keyof MorphusSaveModifiers,
  value: number | undefined,
): MorphusSaveModifiers {
  const next = { ...(saves ?? {}) }
  if (value == null) delete next[key]
  else next[key] = value
  return next
}

export function MorphusStatModifierEditor({
  instance,
  resolution,
  expertMode,
  onChange,
}: Props) {
  const showStats = fieldAllowedForCustomTrait(resolution, 'statModifiers')
  const showSaves = fieldAllowedForCustomTrait(resolution, 'saveModifiers')

  if (!showStats && !showSaves) return null

  const statKeys = expertMode
    ? [...MORPHUS_COMMON_STAT_KEYS, ...MORPHUS_EXPERT_STAT_KEYS]
    : [...MORPHUS_COMMON_STAT_KEYS]

  return (
    <div className="space-y-4">
      {showStats ? (
        <fieldset className="space-y-2 rounded-lg border border-violet-700/40 p-3">
          <legend className="px-1 text-xs font-bold uppercase tracking-wide text-violet-300">
            {expertMode ? 'Stat modifiers (full)' : 'Common bonuses'}
          </legend>
          <div className="space-y-2">
            {statKeys.map((key) => (
              <PolymorphicModifierRow
                key={key}
                label={MORPHUS_STAT_KEY_LABELS[key]}
                value={instance.statModifiers?.[key]}
                onChange={(mod) =>
                  onChange({
                    ...instance,
                    statModifiers: patchStat(instance.statModifiers, key, mod),
                  })
                }
                compact={!expertMode}
              />
            ))}
          </div>
        </fieldset>
      ) : null}

      {showSaves && expertMode ? (
        <fieldset className="space-y-2 rounded-lg border border-violet-700/40 p-3">
          <legend className="px-1 text-xs font-bold uppercase tracking-wide text-violet-300">
            Save bonuses
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {MORPHUS_COMMON_SAVE_KEYS.map((key) => (
              <label key={key} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-violet-100/90">{MORPHUS_SAVE_KEY_LABELS[key]}</span>
                <input
                  type="number"
                  className="w-20 rounded border border-violet-700/60 bg-violet-950/40 px-2 py-1 text-violet-50"
                  value={instance.saveModifiers?.[key] ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value.trim()
                    const n = raw === '' ? undefined : Number(raw)
                    onChange({
                      ...instance,
                      saveModifiers: patchSave(
                        instance.saveModifiers,
                        key,
                        n != null && Number.isFinite(n) ? n : undefined,
                      ),
                    })
                  }}
                />
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
    </div>
  )
}
