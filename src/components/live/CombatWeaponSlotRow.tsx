import type { ActiveForm, Character, Weapon } from '../../types'
import {
  characterHasWpForWeapon,
  isShieldWeapon,
  isWeaponPairable,
  isWeaponTwoHanded,
  resolveWeaponCombatWpSkillId,
} from '../../lib/combatWeaponSlots'

type Props = {
  morphus: boolean
  slotIndex: number
  /** Primary slot only — add another weapon slot. */
  showAddSlot: boolean
  /** Extra slots — remove control. */
  showRemove: boolean
  options: readonly Weapon[]
  selectedId: string | null
  selected: Weapon | null
  character: Character
  activeForm: ActiveForm
  expanded: boolean
  twoGunPenalty: number
  onSelectWeapon: (weaponId: string | null) => void
  onAddSlot: () => void
  onRemoveSlot: () => void
  onToggleExpand: () => void
}

/**
 * One S/P/D weapon slot: dropdown + indicators + Expand (per slot).
 * `+` lives on primary only; extras have remove.
 */
export function CombatWeaponSlotRow({
  morphus,
  slotIndex,
  showAddSlot,
  showRemove,
  options,
  selectedId,
  selected,
  character,
  activeForm,
  expanded,
  twoGunPenalty,
  onSelectWeapon,
  onAddSlot,
  onRemoveSlot,
  onToggleExpand,
}: Props) {
  const hasWp = selected ? characterHasWpForWeapon(character, activeForm, selected) : true
  const wpId = selected ? resolveWeaponCombatWpSkillId(selected) : null
  const pairable = selected ? isWeaponPairable(selected) : false
  const twoHanded = selected ? isWeaponTwoHanded(selected) : false
  const shield = selected ? isShieldWeapon(selected) : false

  const selectCls = morphus
    ? 'rounded-md border-2 border-violet-400/80 bg-slate-950 px-2 py-1.5 text-[11px] font-semibold text-violet-50'
    : 'rounded-md border-2 border-slate-800 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-900'

  const expandBtn = morphus
    ? 'rounded-full border-2 border-violet-200 bg-violet-700 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white hover:bg-violet-600'
    : 'rounded-full border-2 border-slate-900 bg-blue-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white hover:bg-blue-500'

  const iconBtn = morphus
    ? 'inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-violet-300 text-violet-100 hover:bg-violet-900'
    : 'inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-800 text-slate-900 hover:bg-slate-100'

  const slotLabel = slotIndex === 0 ? 'Primary weapon' : `Weapon slot ${slotIndex + 1}`

  return (
    <div className="space-y-1.5" data-combat-weapon-slot={slotIndex}>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {showAddSlot ? (
          <button
            type="button"
            className={iconBtn}
            title="Add another weapon slot"
            aria-label="Add another weapon slot"
            onClick={onAddSlot}
          >
            <span className="text-lg font-black leading-none" aria-hidden>
              +
            </span>
          </button>
        ) : null}

        <label className="sr-only" htmlFor={`combat-weapon-slot-${slotIndex}`}>
          {slotLabel}
        </label>
        <select
          id={`combat-weapon-slot-${slotIndex}`}
          className={`${selectCls} min-w-[9rem] max-w-[14rem]`}
          value={selectedId ?? ''}
          onChange={(e) => {
            const v = e.target.value
            onSelectWeapon(v === '' ? null : v)
          }}
        >
          <option value="">None</option>
          {options.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
              {isShieldWeapon(w) ? ' (shield)' : ''}
              {isWeaponTwoHanded(w) ? ' (2H)' : ''}
            </option>
          ))}
        </select>

        {showRemove ? (
          <button
            type="button"
            className={iconBtn}
            title="Remove this weapon slot"
            aria-label="Remove this weapon slot"
            onClick={onRemoveSlot}
          >
            <span className="text-base font-black leading-none" aria-hidden>
              ×
            </span>
          </button>
        ) : null}

        <button
          type="button"
          className={expandBtn}
          aria-expanded={expanded}
          onClick={onToggleExpand}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {selected ? (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {pairable ? (
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                morphus
                  ? 'bg-violet-800/80 text-violet-100 ring-1 ring-violet-400/50'
                  : 'bg-sky-100 text-sky-950 ring-1 ring-sky-500/50'
              }`}
            >
              pairable
            </span>
          ) : null}
          {twoHanded ? (
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                morphus
                  ? 'bg-amber-900/80 text-amber-100 ring-1 ring-amber-400/60'
                  : 'bg-amber-100 text-amber-950 ring-1 ring-amber-600/50'
              }`}
              title="Two-handed — indication only; extra slots stay available"
            >
              two-handed
            </span>
          ) : null}
          {shield ? (
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                morphus
                  ? 'bg-slate-800 text-violet-100 ring-1 ring-violet-500/40'
                  : 'bg-slate-200 text-slate-800 ring-1 ring-slate-400/60'
              }`}
            >
              shield
            </span>
          ) : null}
          {twoGunPenalty !== 0 ? (
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                morphus
                  ? 'bg-orange-900/90 text-orange-100 ring-1 ring-orange-400/60'
                  : 'bg-orange-100 text-orange-950 ring-1 ring-orange-500/60'
              }`}
              title="Modern two-gun strike penalty"
            >
              two guns {twoGunPenalty}
            </span>
          ) : null}
          {!hasWp ? (
            <span
              className={`rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wide shadow-sm ${
                morphus
                  ? 'bg-red-600 text-white ring-2 ring-red-300'
                  : 'bg-red-600 text-white ring-2 ring-red-900'
              }`}
              role="status"
              title={
                wpId
                  ? `Missing weapon proficiency (${wpId})`
                  : 'Missing weapon proficiency for this weapon'
              }
            >
              No W.P. — {selected.wpCategory ?? 'proficiency missing'}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
