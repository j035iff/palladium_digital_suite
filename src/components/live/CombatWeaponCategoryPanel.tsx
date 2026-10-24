import type { ReactNode } from 'react'
import type {
  AccumulatedHandToHandBonuses,
  ActiveForm,
  Character,
  InventoryItem,
  Weapon,
  WeaponProficiencyEra,
} from '../../types'
import type { AmmoReservesState } from '../../lib/ammoReserves'
import { formatBonus } from '../../lib/combatQuickBonuses'
import { getWeaponFireModes } from '../../lib/fireModes'
import { computeWeaponProfileBonuses } from '../../lib/weaponBonuses'
import {
  addCombatEraSlot,
  applyStrikePenaltyToWeaponProfile,
  characterHasWpForWeapon,
  COMBAT_ERA_BASE_SLOT_COUNT,
  combatWeaponGlyphId,
  formatCombatWeaponSlotLabel,
  formatFireModeDamageLabel,
  listSlotWeaponOptions,
  modernTwoGunStrikePenalty,
  normalizeCombatEraSlots,
  pickBurstFireMode,
  pickSingleFireMode,
  removeCombatEraSlot,
  resolvePairedWeaponsSlotStatus,
  resolvePickedWeaponId,
  weaponById,
} from '../../lib/combatWeaponSlots'
import { CombatWeaponSlotRow } from './CombatWeaponSlotRow'
import { CombatExpandOverlay } from './CombatExpandOverlay'
import { WeaponStrikeCard } from './WeaponStrikeCard'
import { defaultFireModeId } from '../../lib/fireModes'

type Props = {
  morphus: boolean
  era: WeaponProficiencyEra
  categoryLabel: string
  inventoryItems: readonly InventoryItem[]
  /** Per-era slot weapon ids (always ≥2; null = None). */
  slotWeaponIds: readonly (string | null)[]
  expandedSlotIndex: number | null
  character: Character
  activeForm: ActiveForm
  handToHandAccumulated: AccumulatedHandToHandBonuses
  ammoReserves: AmmoReservesState
  fireModeByWeaponId: Record<string, string>
  hostNote?: string
  onSlotsChange: (next: (string | null)[]) => void
  onExpandedSlotChange: (slotIndex: number | null) => void
  onPrimaryReadySync?: (weaponId: string | null) => void
  onFireModeChange: (weaponId: string, modeId: string) => void
  onReload: (weaponId: string) => void
  onReloadFailed: (weaponId: string) => void
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="opacity-70">{label}: </span>
      <span className="font-mono font-bold">{value}</span>
    </p>
  )
}

function slotQuickStats(
  era: WeaponProficiencyEra,
  selected: Weapon | null,
  character: Character,
  activeForm: ActiveForm,
  handToHandAccumulated: AccumulatedHandToHandBonuses,
  selectedWeapons: readonly (Weapon | null)[],
  slotIndex: number,
  hostNote?: string,
): ReactNode {
  if (!selected) {
    if (era === 'modern') {
      return (
        <>
          <SummaryLine label="Aimed" value="—" />
          <SummaryLine label="Burst" value="—" />
          <SummaryLine label="Dam" value="—" />
        </>
      )
    }
    return (
      <>
        <SummaryLine label="Strike" value="—" />
        <SummaryLine label="Parry" value="—" />
        <SummaryLine label="Dam" value="—" />
      </>
    )
  }

  const raw = computeWeaponProfileBonuses(
    character,
    activeForm,
    selected,
    handToHandAccumulated,
  )
  const penalty =
    era === 'modern' ? modernTwoGunStrikePenalty(selectedWeapons, slotIndex) : 0
  const profile = applyStrikePenaltyToWeaponProfile(raw, penalty)

  if (era === 'modern') {
    const modes = getWeaponFireModes(selected)
    const single = pickSingleFireMode(modes)
    const burst = pickBurstFireMode(modes)
    return (
      <>
        {hostNote && slotIndex === 0 ? (
          <p className="mb-0.5 text-[9px] font-semibold opacity-70">{hostNote}</p>
        ) : null}
        <SummaryLine
          label="Aimed"
          value={formatBonus(profile.strike.total + (single?.strikeModifier ?? 0))}
        />
        <SummaryLine
          label="Burst"
          value={
            burst
              ? formatBonus(profile.strike.total + burst.strikeModifier)
              : '—'
          }
        />
        <SummaryLine
          label="Dam"
          value={formatFireModeDamageLabel(selected, single)}
        />
      </>
    )
  }

  return (
    <>
      <SummaryLine label="Strike" value={formatBonus(profile.strike.total)} />
      <SummaryLine label="Parry" value={formatBonus(profile.parry.total)} />
      <SummaryLine label="Dam" value={selected.damage} />
    </>
  )
}

/**
 * Ancient / Modern Action-tab category (mockup): outer box, centered title,
 * `+` top-right; nested Primary + Secondary (+ 3rd…) rows; Expand → overlay.
 * Unified Path — one panel for both eras.
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
  handToHandAccumulated,
  ammoReserves,
  fireModeByWeaponId,
  hostNote,
  onSlotsChange,
  onExpandedSlotChange,
  onPrimaryReadySync,
  onFireModeChange,
  onReload,
  onReloadFailed,
}: Props) {
  const slots = normalizeCombatEraSlots(slotWeaponIds)
  const selectedWeapons: (Weapon | null)[] = slots.map((id, i) => {
    const opts = listSlotWeaponOptions(inventoryItems, era, i)
    const resolved = resolvePickedWeaponId(opts, id)
    return weaponById(opts, resolved)
  })
  const paired = resolvePairedWeaponsSlotStatus(selectedWeapons, character, activeForm)

  const shell = morphus
    ? 'border-violet-300 bg-slate-950/90 text-violet-50'
    : 'border-slate-900 bg-white text-slate-900'

  const muted = morphus ? 'text-violet-300/90' : 'text-slate-600'

  const addBtn = morphus
    ? 'absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-violet-300 text-violet-100 hover:bg-violet-900'
    : 'absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-800 text-slate-900 hover:bg-slate-100'

  const setSlotWeapon = (slotIndex: number, weaponId: string | null) => {
    const next = [...slots]
    while (next.length <= slotIndex) next.push(null)
    next[slotIndex] = weaponId
    onSlotsChange(normalizeCombatEraSlots(next))
    if (slotIndex === 0) onPrimaryReadySync?.(weaponId)
  }

  const expandedSelected =
    expandedSlotIndex != null ? selectedWeapons[expandedSlotIndex] ?? null : null
  const expandedTwoGun =
    expandedSlotIndex != null && era === 'modern'
      ? modernTwoGunStrikePenalty(selectedWeapons, expandedSlotIndex)
      : 0

  return (
    <>
      <article className={`relative overflow-hidden rounded-[1.75rem] border-2 ${shell}`}>
        <button
          type="button"
          className={addBtn}
          title="Add another weapon slot"
          aria-label="Add another weapon slot"
          onClick={() => onSlotsChange(addCombatEraSlot(slots))}
        >
          <span className="text-lg font-black leading-none" aria-hidden>
            +
          </span>
        </button>

        <p
          className={`px-12 pt-3 text-center text-base font-semibold leading-tight tracking-tight sm:text-lg ${
            morphus ? 'text-violet-100' : 'text-slate-900'
          }`}
        >
          {categoryLabel}
        </p>

        <div className="space-y-2 px-3 pb-3 pt-2">
          {slots.map((pickedId, slotIndex) => {
            const options = listSlotWeaponOptions(inventoryItems, era, slotIndex)
            const resolvedId = resolvePickedWeaponId(options, pickedId)
            const selected = weaponById(options, resolvedId)
            const twoGun =
              era === 'modern'
                ? modernTwoGunStrikePenalty(selectedWeapons, slotIndex)
                : 0
            return (
              <CombatWeaponSlotRow
                key={`slot-${slotIndex}`}
                morphus={morphus}
                slotIndex={slotIndex}
                showRemove={slotIndex >= COMBAT_ERA_BASE_SLOT_COUNT}
                glyphId={combatWeaponGlyphId(selected)}
                summary={slotQuickStats(
                  era,
                  selected,
                  character,
                  activeForm,
                  handToHandAccumulated,
                  selectedWeapons,
                  slotIndex,
                  hostNote,
                )}
                options={options}
                selectedId={resolvedId}
                selected={selected}
                character={character}
                activeForm={activeForm}
                twoGunPenalty={twoGun}
                onSelectWeapon={(id) => setSlotWeapon(slotIndex, id)}
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
                onExpand={() => onExpandedSlotChange(slotIndex)}
              />
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
      </article>

      {expandedSlotIndex != null ? (
        <CombatExpandOverlay
          morphus={morphus}
          eyebrow={`Action · ${categoryLabel}`}
          title={
            expandedSelected
              ? `${formatCombatWeaponSlotLabel(expandedSlotIndex)} · ${expandedSelected.name}`
              : `${formatCombatWeaponSlotLabel(expandedSlotIndex)} · None`
          }
          onClose={() => onExpandedSlotChange(null)}
        >
          {hostNote && expandedSlotIndex === 0 ? (
            <p className={`mb-2 text-[11px] font-semibold ${muted}`}>{hostNote}</p>
          ) : null}
          {expandedSelected ? (
            <>
              {!characterHasWpForWeapon(character, activeForm, expandedSelected) ? (
                <p
                  className={`mb-2 rounded-md px-2 py-1.5 text-[11px] font-black uppercase tracking-wide ${
                    morphus ? 'bg-red-700 text-white' : 'bg-red-600 text-white'
                  }`}
                  role="status"
                >
                  Missing W.P. — strike/parry do not include proficiency bonuses
                </p>
              ) : null}
              <ul className="list-none p-0">
                <WeaponStrikeCard
                  weapon={expandedSelected}
                  character={character}
                  activeForm={activeForm}
                  morphus={morphus}
                  ammoReserves={ammoReserves}
                  fireModeId={
                    fireModeByWeaponId[expandedSelected.id] ??
                    defaultFireModeId(expandedSelected)
                  }
                  reloadShakeTrigger={0}
                  strikePenalty={expandedTwoGun}
                  onFireModeChange={(modeId) =>
                    onFireModeChange(expandedSelected.id, modeId)
                  }
                  onReload={() => onReload(expandedSelected.id)}
                  onReloadFailed={() => onReloadFailed(expandedSelected.id)}
                />
              </ul>
            </>
          ) : (
            <p className={`text-[11px] font-semibold ${muted}`}>
              Select a weapon (or leave None). Add gear on the Gear tab when the list
              is empty.
            </p>
          )}
        </CombatExpandOverlay>
      ) : null}
    </>
  )
}
