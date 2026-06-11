import { useState } from 'react'
import { getMorphusCharacteristicById } from '../../../data/library/morphusTableCatalogLoader'
import {
  emptyMorphusCustomTraitInstance,
  isMorphusCustomTraitSlotComplete,
  fieldAllowedForCustomTrait,
  sanitizeMorphusCustomTraitInstance,
} from '../../../lib/morphusCustomTrait'
import type { MorphusCustomTraitInstance, MorphusTraitSlotResolution } from '../../../types'
import { MorphusStatModifierEditor } from './MorphusStatModifierEditor'

type Props = {
  slot: MorphusTraitSlotResolution
  onChange: (slotId: string, instance: MorphusCustomTraitInstance) => void
  onRemove?: (slotId: string) => void
}

export function CustomTraitWorkshop({ slot, onChange, onRemove }: Props) {
  const catalog = getMorphusCharacteristicById(slot.catalogEntryId)
  const resolution = catalog?.customTraitResolution
  const [expertMode, setExpertMode] = useState(false)

  if (!catalog?.customTraitResolution) return null

  const instance = slot.customInstance ?? emptyMorphusCustomTraitInstance()
  const complete = isMorphusCustomTraitSlotComplete(slot)

  const update = (next: MorphusCustomTraitInstance) => {
    onChange(slot.slotId, sanitizeMorphusCustomTraitInstance(next))
  }

  const showAbilities = expertMode && fieldAllowedForCustomTrait(resolution, 'atWillAbilities')
  const showWeapons = expertMode && fieldAllowedForCustomTrait(resolution, 'naturalWeapons')
  const showNotes = expertMode && fieldAllowedForCustomTrait(resolution, 'customOneOffs')
  const showNaturalAr = expertMode && fieldAllowedForCustomTrait(resolution, 'naturalAr')

  return (
    <article
      className={`rounded-xl border-2 p-4 ${
        complete
          ? 'border-emerald-500/50 bg-emerald-950/20'
          : 'border-amber-500/50 bg-amber-950/15'
      }`}
    >
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-violet-400">
            Custom trait · {catalog.tableCategory}
          </p>
          <h3 className="text-base font-semibold text-violet-50">{catalog.name}</h3>
          {resolution.prompt ? (
            <p className="mt-1 max-w-prose text-sm text-violet-200/80">{resolution.prompt}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setExpertMode((v) => !v)}
            className="rounded border border-violet-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-200 hover:bg-violet-900/50"
          >
            {expertMode ? 'Common view' : 'Expert mode'}
          </button>
          {onRemove ? (
            <button
              type="button"
              onClick={() => onRemove(slot.slotId)}
              className="rounded border border-red-700/60 px-2 py-1 text-[10px] font-bold uppercase text-red-200 hover:bg-red-950/40"
            >
              Remove
            </button>
          ) : null}
        </div>
      </header>

      <div className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-violet-100">Trait name</span>
          <input
            type="text"
            required
            className="w-full rounded border border-violet-700/60 bg-violet-950/40 px-3 py-2 text-violet-50"
            value={instance.displayName}
            onChange={(e) => update({ ...instance, displayName: e.target.value })}
            placeholder="e.g. Manticore"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-violet-100">Description</span>
          <textarea
            required
            rows={3}
            className="w-full rounded border border-violet-700/60 bg-violet-950/40 px-3 py-2 text-violet-50"
            value={instance.description}
            onChange={(e) => update({ ...instance, description: e.target.value })}
            placeholder="What does this Morphus feature look like and how does it behave?"
          />
        </label>

        <MorphusStatModifierEditor
          instance={instance}
          resolution={resolution}
          expertMode={expertMode}
          onChange={update}
        />

        {showNaturalAr ? (
          <label className="flex items-center gap-3 text-sm">
            <span className="font-medium text-violet-100">Natural A.R.</span>
            <input
              type="number"
              min={0}
              className="w-24 rounded border border-violet-700/60 bg-violet-950/40 px-2 py-1"
              value={instance.naturalAr ?? ''}
              onChange={(e) => {
                const raw = e.target.value.trim()
                const n = raw === '' ? undefined : Number(raw)
                update({
                  ...instance,
                  naturalAr: n != null && Number.isFinite(n) ? Math.max(0, n) : undefined,
                })
              }}
            />
          </label>
        ) : null}

        {showAbilities ? (
          <fieldset className="space-y-2 rounded-lg border border-violet-700/40 p-3">
            <legend className="px-1 text-xs font-bold uppercase tracking-wide text-violet-300">
              Special abilities
            </legend>
            {(instance.atWillAbilities ?? []).map((ability, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  type="text"
                  className="rounded border border-violet-700/60 bg-violet-950/40 px-2 py-1 text-sm"
                  value={ability.label}
                  placeholder="Ability name"
                  onChange={(e) => {
                    const list = [...(instance.atWillAbilities ?? [])]
                    list[index] = { ...ability, label: e.target.value }
                    update({ ...instance, atWillAbilities: list })
                  }}
                />
                <input
                  type="text"
                  className="rounded border border-violet-700/60 bg-violet-950/40 px-2 py-1 text-sm"
                  value={ability.note ?? ''}
                  placeholder="Effect notes"
                  onChange={(e) => {
                    const list = [...(instance.atWillAbilities ?? [])]
                    list[index] = { ...ability, note: e.target.value || undefined }
                    update({ ...instance, atWillAbilities: list })
                  }}
                />
                <button
                  type="button"
                  className="text-xs text-red-300 hover:underline"
                  onClick={() => {
                    const list = (instance.atWillAbilities ?? []).filter((_, i) => i !== index)
                    update({ ...instance, atWillAbilities: list.length ? list : undefined })
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-xs font-bold uppercase tracking-wide text-violet-300 hover:text-violet-100"
              onClick={() =>
                update({
                  ...instance,
                  atWillAbilities: [
                    ...(instance.atWillAbilities ?? []),
                    { id: 'other', label: '' },
                  ],
                })
              }
            >
              + Add ability
            </button>
          </fieldset>
        ) : null}

        {showWeapons ? (
          <fieldset className="space-y-2 rounded-lg border border-violet-700/40 p-3">
            <legend className="px-1 text-xs font-bold uppercase tracking-wide text-violet-300">
              Natural weapons
            </legend>
            {(instance.naturalWeapons ?? []).map((weapon, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  type="text"
                  className="rounded border border-violet-700/60 bg-violet-950/40 px-2 py-1 text-sm"
                  value={weapon.label ?? ''}
                  placeholder="Weapon label"
                  onChange={(e) => {
                    const list = [...(instance.naturalWeapons ?? [])]
                    list[index] = { ...weapon, label: e.target.value || undefined }
                    update({ ...instance, naturalWeapons: list })
                  }}
                />
                <input
                  type="text"
                  className="rounded border border-violet-700/60 bg-violet-950/40 px-2 py-1 text-sm"
                  value={weapon.damageFormula}
                  placeholder="2D6"
                  onChange={(e) => {
                    const list = [...(instance.naturalWeapons ?? [])]
                    list[index] = { ...weapon, damageFormula: e.target.value }
                    update({ ...instance, naturalWeapons: list })
                  }}
                />
                <button
                  type="button"
                  className="text-xs text-red-300 hover:underline"
                  onClick={() => {
                    const list = (instance.naturalWeapons ?? []).filter((_, i) => i !== index)
                    update({ ...instance, naturalWeapons: list.length ? list : undefined })
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-xs font-bold uppercase tracking-wide text-violet-300 hover:text-violet-100"
              onClick={() =>
                update({
                  ...instance,
                  naturalWeapons: [
                    ...(instance.naturalWeapons ?? []),
                    { limbType: 'misc_limbs', damageFormula: '1D6', isAdditiveToHth: true },
                  ],
                })
              }
            >
              + Add natural weapon
            </button>
          </fieldset>
        ) : null}

        {showNotes ? (
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-violet-100">
              Additional rules (narrative)
            </span>
            <textarea
              rows={3}
              className="w-full rounded border border-violet-700/60 bg-violet-950/40 px-3 py-2 text-violet-50"
              value={(instance.customOneOffs ?? []).join('\n')}
              onChange={(e) => {
                const lines = e.target.value
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean)
                update({ ...instance, customOneOffs: lines.length ? lines : undefined })
              }}
              placeholder="One rule per line — penalties, limitations, situational effects"
            />
          </label>
        ) : null}

        {resolution.requiresGmApproval !== false ? (
          <label className="flex items-center gap-2 rounded-lg border border-violet-600/40 bg-violet-950/30 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={instance.gmApproved}
              onChange={(e) => update({ ...instance, gmApproved: e.target.checked })}
            />
            <span className="text-violet-100">
              G.M. has reviewed and approved this custom trait
            </span>
          </label>
        ) : null}
      </div>

      {!complete ? (
        <p className="mt-3 text-xs text-amber-200/90" role="status">
          Complete name, description
          {resolution.requiresGmApproval !== false ? ', and G.M. approval' : ''} to finalize this
          slot.
        </p>
      ) : null}
    </article>
  )
}
