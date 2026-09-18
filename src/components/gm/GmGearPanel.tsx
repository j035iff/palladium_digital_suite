import { useMemo, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { useGmSession } from '../../context/GmSessionContext'
import { loadCharacterSave } from '../../lib/characterIndex'
import { buildGmGearForgeAdapter } from '../../lib/gear/gmGearForgeHost'
import {
  addWeaponToCharacterSave,
  dropItemFromCharacterSave,
  GM_CAST_GEAR_BLOCKED_REASON,
  gmGearCommitBlockedReason,
  listCharacterSaveInventory,
  updateWeaponOnCharacterSave,
} from '../../lib/gear/gmCharacterInventoryGrant'
import type {
  GearForgeWeaponPatch,
  GearForgeWeaponPiece,
} from '../../lib/gear/gearForgeHost'
import { GearForgeShell } from '../gear/GearForgeShell'

/**
 * GM Hub Gear tab — mounts the shared {@link GearForgeShell} with a
 * `kind: 'gm'` host adapter that grants into a selected party character save.
 * Party / Cast panels stay separate (no shell fork).
 */
export function GmGearPanel() {
  const { session, partySlices } = useGmSession()
  const {
    rawCharacter,
    inventoryItems,
    addWeaponToInventory,
    updateWeaponInInventory,
    dropItem,
  } = useCharacter()

  const [targetCharacterId, setTargetCharacterId] = useState<string | null>(
    null,
  )
  const [revision, setRevision] = useState(0)

  const campaignOpen = Boolean(session)
  const genreId = session?.hostGenreId?.trim() || 'nightbane'

  const targetSlice =
    partySlices.find((p) => p.characterId === targetCharacterId) ?? null
  const saveMissing = Boolean(
    targetCharacterId && loadCharacterSave(targetCharacterId) == null,
  )
  const liveSheetIsTarget =
    Boolean(targetCharacterId) &&
    rawCharacter.isFinalized === true &&
    rawCharacter.id === targetCharacterId

  const commitBlockedReason = gmGearCommitBlockedReason({
    campaignOpen,
    targetCharacterId,
    saveMissing,
  })

  const targetLabel = !campaignOpen
    ? 'No campaign open'
    : targetSlice
      ? targetSlice.name
      : 'No grant target'

  const bump = () => setRevision((n) => n + 1)

  const adapter = useMemo(
    () =>
      buildGmGearForgeAdapter({
        genreId,
        targetLabel,
        commitBlockedReason,
        listItems: () => {
          if (!targetCharacterId || commitBlockedReason) return []
          if (liveSheetIsTarget) return inventoryItems
          void revision
          return listCharacterSaveInventory(targetCharacterId)
        },
        addWeapon: (piece: GearForgeWeaponPiece) => {
          if (!targetCharacterId || commitBlockedReason) return
          if (liveSheetIsTarget) {
            addWeaponToInventory(piece)
            return
          }
          if (addWeaponToCharacterSave(targetCharacterId, piece)) bump()
        },
        updateWeapon: (id: string, patch: GearForgeWeaponPatch) => {
          if (!targetCharacterId || commitBlockedReason) return
          if (liveSheetIsTarget) {
            updateWeaponInInventory(id, patch)
            return
          }
          if (updateWeaponOnCharacterSave(targetCharacterId, id, patch)) bump()
        },
        dropItem: (id: string) => {
          if (!targetCharacterId || commitBlockedReason) return
          if (liveSheetIsTarget) {
            dropItem(id)
            return
          }
          if (dropItemFromCharacterSave(targetCharacterId, id)) bump()
        },
      }),
    [
      genreId,
      targetLabel,
      commitBlockedReason,
      targetCharacterId,
      liveSheetIsTarget,
      inventoryItems,
      revision,
      addWeaponToInventory,
      updateWeaponInInventory,
      dropItem,
    ],
  )

  if (!session) {
    return <p className="p-6 text-sm text-slate-500">Open a session first.</p>
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4">
      <div className="shrink-0 space-y-2">
        <p className="text-[11px] leading-snug text-slate-400">
          Grant catalog weapons or forge customs into a party character&apos;s
          local save. Party and Cast tabs stay observer / spawn only. Armor /
          Artifacts / Other lanes stay visible with why-disabled reasons until
          wired.
        </p>
        <label className="block max-w-md">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Grant target
          </span>
          <select
            value={targetCharacterId ?? ''}
            onChange={(e) => setTargetCharacterId(e.target.value || null)}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Select party character…</option>
            {partySlices.map((pc) => (
              <option key={pc.characterId} value={pc.characterId}>
                {pc.name}
              </option>
            ))}
          </select>
        </label>
        {partySlices.length === 0 ? (
          <p className="text-[11px] text-amber-200/80">
            Party is empty — add characters on the Party tab first.
          </p>
        ) : null}
        <p className="text-[11px] text-slate-500">{GM_CAST_GEAR_BLOCKED_REASON}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <GearForgeShell adapter={adapter} title="GM Gear" />
      </div>
    </div>
  )
}
