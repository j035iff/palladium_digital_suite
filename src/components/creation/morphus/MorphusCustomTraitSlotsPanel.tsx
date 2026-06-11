import { useMemo } from 'react'
import { useCharacter } from '../../../context/CharacterContext'
import {
  allMorphusCustomTraitSlotsComplete,
  listMorphusCustomTraitCatalogEntries,
} from '../../../lib/morphusCustomTrait'
import type { MorphusCustomTraitInstance } from '../../../types'
import { CustomTraitWorkshop } from './CustomTraitWorkshop'

export function MorphusCustomTraitSlotsPanel() {
  const {
    character,
    addMorphusCustomTraitSlot,
    setMorphusCustomTraitInstance,
    removeMorphusCustomTraitSlot,
  } = useCharacter()

  const catalogOptions = useMemo(() => listMorphusCustomTraitCatalogEntries(), [])
  const slots = character.morphusTraitSlotResolutions ?? []
  const allComplete = allMorphusCustomTraitSlotsComplete(slots)

  return (
    <section className="mt-6 space-y-4" aria-labelledby="morphus-custom-trait-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3
            id="morphus-custom-trait-heading"
            className="text-sm font-bold uppercase tracking-wide text-violet-200"
          >
            Custom traits (Other)
          </h3>
          <p className="mt-1 max-w-2xl text-xs text-violet-300/80">
            When a table result is <strong>Other</strong>, define the feature here with common
            bonuses first — open <strong>Expert mode</strong> for full stat keys, saves, weapons, and
            narrative rules.
          </p>
        </div>
        {catalogOptions.length > 0 ? (
          <label className="text-xs">
            <span className="mb-1 block text-violet-400">Add custom trait slot</span>
            <select
              className="rounded border border-violet-600 bg-violet-950 px-2 py-1.5 text-sm text-violet-50"
              defaultValue=""
              onChange={(e) => {
                const id = e.target.value
                if (id) addMorphusCustomTraitSlot(id)
                e.target.value = ''
              }}
            >
              <option value="" disabled>
                Select table row…
              </option>
              {catalogOptions.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.tableCategory}: {entry.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {slots.length === 0 ? (
        <p className="text-sm text-violet-400/70">
          No custom trait slots yet. Add one when you roll or pick an &quot;Other&quot; result.
        </p>
      ) : (
        <div className="space-y-4">
          {slots.map((slot) => (
            <CustomTraitWorkshop
              key={slot.slotId}
              slot={slot}
              onChange={(slotId, instance: MorphusCustomTraitInstance) =>
                setMorphusCustomTraitInstance(slotId, instance)
              }
              onRemove={removeMorphusCustomTraitSlot}
            />
          ))}
        </div>
      )}

      {slots.length > 0 ? (
        <p
          className={`text-xs font-medium uppercase tracking-wide ${
            allComplete ? 'text-emerald-400' : 'text-amber-300'
          }`}
          role="status"
        >
          {allComplete
            ? 'All custom trait slots complete'
            : 'One or more custom trait slots need attention'}
        </p>
      ) : null}
    </section>
  )
}
