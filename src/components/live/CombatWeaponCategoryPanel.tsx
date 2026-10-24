import type { ReactNode } from 'react'
import type { ActiveForm, Character, InventoryItem, Weapon, WeaponProficiencyEra } from '../../types'
import type { AmmoReservesState } from '../../lib/ammoReserves'
import {
  addCombatEraSlot,
  characterHasWpForWeapon,
  combatWeaponGlyphId,
  listSlotWeaponOptions,
  modernTwoGunStrikePenalty,
  normalizeCombatEraSlots,
  removeCombatEraSlot,
  resolvePairedWeaponsSlotStatus,
  resolvePickedWeaponId,
  type CombatWeaponGlyphId,
  weaponById,
} from '../../lib/combatWeaponSlots'
import { CombatWeaponGlyph } from './CombatWeaponGlyph'
import { CombatWeaponSlotRow } from './CombatWeaponSlotRow'
import { WeaponStrikeCard, type StrikeBannerState } from './WeaponStrikeCard'
import { defaultFireModeId } from '../../lib/fireModes'

type Props = {
  morphus: boolean
  era: WeaponProficiencyEra
  categoryLabel: string
  inventoryItems: readonly InventoryItem[]
  /** Per-era slot weapon ids (always ≥1; null = None). */
  slotWeaponIds: readonly (string | null)[]
  expandedSlotIndex: number | null
  character: Character
  activeForm: ActiveForm
  ammoReserves: AmmoReservesState
  fireModeByWeaponId: Record<string, string>
  reloadShakeByWeaponId: Record<string, number>
  hostNote?: string
  /** Left-column quick stats for the primary (slot 0) selection. */
  summary: ReactNode
  onSlotsChange: (next: (string | null)[]) => void
  onExpandedSlotChange: (slotIndex: number | null) => void
  onPrimaryReadySync?: (weaponId: string | null) => void
  onFireModeChange: (weaponId: string, modeId: string) => void
  onStrikeResolved: (banner: NonNullable<StrikeBannerState>) => void
  onSpendAmmo: (weaponId: string, rounds: number) => void
  onReload: (weaponId: string) => void
  onReloadFailed: (weaponId: string) => void
  onRequestReloadShake: (weaponId: string) => void
}

/**
 * Ancient / Modern Action-tab category: quick-stats + multi weapon slots (dropdown, + on primary,
 * Expand per slot). Unified Path — one panel for both eras.
 */
export function CombatWeaponCategoryPanel({
  morphus,
  era,
  categoryLabel,
  inventoryItems,
  slotWeaponIds,
  expandedSlotIndex,
  character,
  activeForm,
  ammoReserves,
  fireModeByWeaponId,
  reloadShakeByWeaponId,
  hostNote,
  summary,
  onSlotsChange,
  onExpandedSlotChange,
  onPrimaryReadySync,
  onFireModeChange,
  onStrikeResolved,
  onSpendAmmo,
  onReload,
  onReloadFailed,
  onRequestReloadShake,
}: Props) {
  const slots = normalizeCombatEraSlots(slotWeaponIds)
  const selectedWeapons: (Weapon | null)[] = slots.map((id, i) => {
    const opts = listSlotWeaponOptions(inventoryItems, era, i)
    const resolved = resolvePickedWeaponId(opts, id)
    return weaponById(opts, resolved)
  })
  const primary = selectedWeapons[0] ?? null
  const glyphId: CombatWeaponGlyphId = combatWeaponGlyphId(primary)
  const paired = resolvePairedWeaponsSlotStatus(selectedWeapons, character, activeForm)

  const shell = morphus
    ? 'border-violet-300 bg-slate-950/90 text-violet-50'
    : 'border-slate-900 bg-white text-slate-900'

  const muted = morphus ? 'text-violet-300/90' : 'text-slate-600'

  const setSlotWeapon = (slotIndex: number, weaponId: string | null) => {
    const next = [...slots]
    while (next.length <= slotIndex) next.push(null)
    next[slotIndex] = weaponId
    onSlotsChange(normalizeCombatEraSlots(next))
    if (slotIndex === 0) onPrimaryReadySync?.(weaponId)
  }

  return (
    <article className={`overflow-hidden rounded-[1.75rem] border-2 ${shell}`}>
      <div className="grid grid-cols-1 items-start gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(6.5rem,auto)_minmax(0,1.35fr)]">
        <div className="flex min-w-0 items-start gap-3">
          <span className={morphus ? 'text-violet-200' : 'text-blue-800'}>
            <CombatWeaponGlyph id={glyphId} />
          </span>
          <div className="min-w-0 text-[11px] font-semibold leading-snug">{summary}</div>
        </div>

        <p
          className={`text-center text-base font-semibold leading-tight tracking-tight sm:text-lg ${
            morphus ? 'text-violet-100' : 'text-slate-900'
          }`}
        >
          {categoryLabel}
        </p>

        <div className="flex min-w-0 flex-col gap-2">
          {slots.map((pickedId, slotIndex) => {
            const options = listSlotWeaponOptions(inventoryItems, era, slotIndex)
            const resolvedId = resolvePickedWeaponId(options, pickedId)
            const selected = weaponById(options, resolvedId)
            const twoGun =
              era === 'modern'
                ? modernTwoGunStrikePenalty(selectedWeapons, slotIndex)
                : 0
            const expanded = expandedSlotIndex === slotIndex
            return (
              <div key={`slot-${slotIndex}`} className="space-y-0">
                <CombatWeaponSlotRow
                  morphus={morphus}
                  slotIndex={slotIndex}
                  showAddSlot={slotIndex === 0}
                  showRemove={slotIndex > 0}
                  options={options}
                  selectedId={resolvedId}
                  selected={selected}
                  character={character}
                  activeForm={activeForm}
                  expanded={expanded}
                  twoGunPenalty={twoGun}
                  onSelectWeapon={(id) => setSlotWeapon(slotIndex, id)}
                  onAddSlot={() => onSlotsChange(addCombatEraSlot(slots))}
                  onRemoveSlot={() => {
                    const next = removeCombatEraSlot(slots, slotIndex)
                    onSlotsChange(next)
                    if (expandedSlotIndex === slotIndex) onExpandedSlotChange(null)
                    else if (
                      expandedSlotIndex != null &&
                      expandedSlotIndex > slotIndex
                    ) {
                      onExpandedSlotChange(expandedSlotIndex - 1)
                    }
                  }}
                  onToggleExpand={() =>
                    onExpandedSlotChange(expanded ? null : slotIndex)
                  }
                />
                {expanded && selected ? (
                  <div
                    className={`mt-2 border-t px-1 py-3 ${
                      morphus
                        ? 'border-violet-700/80 bg-black/35'
                        : 'border-slate-200 bg-slate-50/90'
                    }`}
                  >
                    {hostNote && slotIndex === 0 ? (
                      <p className={`mb-2 text-[11px] font-semibold ${muted}`}>
                        {hostNote}
                      </p>
                    ) : null}
                    {!characterHasWpForWeapon(character, activeForm, selected) ? (
                      <p
                        className={`mb-2 rounded-md px-2 py-1.5 text-[11px] font-black uppercase tracking-wide ${
                          morphus
                            ? 'bg-red-700 text-white'
                            : 'bg-red-600 text-white'
                        }`}
                        role="status"
                      >
                        Missing W.P. — strike/parry do not include proficiency bonuses
                      </p>
                    ) : null}
                    <ul className="list-none p-0">
                      <WeaponStrikeCard
                        weapon={selected}
                        character={character}
                        activeForm={activeForm}
                        morphus={morphus}
                        ammoReserves={ammoReserves}
                        fireModeId={
                          fireModeByWeaponId[selected.id] ??
                          defaultFireModeId(selected)
                        }
                        reloadShakeTrigger={
                          reloadShakeByWeaponId[selected.id] ?? 0
                        }
                        strikePenalty={twoGun}
                        onFireModeChange={(modeId) =>
                          onFireModeChange(selected.id, modeId)
                        }
                        onStrikeResolved={onStrikeResolved}
                        onSpendAmmo={onSpendAmmo}
                        onReload={() => onReload(selected.id)}
                        onReloadFailed={() => onReloadFailed(selected.id)}
                        onRequestReloadShake={() =>
                          onRequestReloadShake(selected.id)
                        }
                      />
                    </ul>
                  </div>
                ) : null}
                {expanded && !selected ? (
                  <div
                    className={`mt-2 border-t px-1 py-3 text-[11px] font-semibold ${muted}`}
                  >
                    Select a weapon (or leave None). Add gear on the Gear tab when the
                    list is empty.
                  </div>
                ) : null}
              </div>
            )
          })}

          {paired.abilitiesActive ? (
            <p
              className={`text-right text-[10px] font-bold ${
                morphus ? 'text-emerald-300' : 'text-emerald-800'
              }`}
            >
              Paired Weapons abilities available for this pair
            </p>
          ) : null}
          {paired.blockedReason ? (
            <p className={`text-right text-[10px] font-semibold ${muted}`}>
              {paired.blockedReason}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  )
}
