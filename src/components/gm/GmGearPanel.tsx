import { useMemo, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { useGmSession } from '../../context/GmSessionContext'
import { loadCharacterSave } from '../../lib/characterIndex'
import {
  deleteCustomGearRecord,
  inventoryWeaponToLibraryPiece,
  listLibraryWeaponsAsInventory,
  saveCustomGearWeapon,
} from '../../lib/gear/customGearLibrary'
import { buildGmGearForgeAdapter } from '../../lib/gear/gmGearForgeHost'
import {
  addWeaponToCharacterSave,
  GM_CAST_GEAR_BLOCKED_REASON,
  gmGearGrantBlockedReason,
  gmGearLibraryBlockedReason,
} from '../../lib/gear/gmCharacterInventoryGrant'
import type {
  GearForgeWeaponPatch,
  GearForgeWeaponPiece,
} from '../../lib/gear/gearForgeHost'
import { GearForgeShell } from '../gear/GearForgeShell'

/**
 * Narrative → Things → Gear — mounts the shared {@link GearForgeShell} with a
 * `kind: 'gm'` host that commits to **My Custom Gear** lists (same library as
 * portal Gear Forge). Optional character push never gates library saves
 * (Pillar 9 / Unified Path — no second forge).
 */
export function GmGearPanel() {
  const { session, partySlices } = useGmSession()
  const { rawCharacter, addWeaponToInventory } = useCharacter()

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

  const libraryBlockedReason = gmGearLibraryBlockedReason({ campaignOpen })
  const grantBlockedReason = gmGearGrantBlockedReason({
    campaignOpen,
    targetCharacterId,
    saveMissing,
  })
  const canPushToCharacter = grantBlockedReason == null

  const bump = () => setRevision((n) => n + 1)

  const pushCopyToCharacter = (piece: GearForgeWeaponPiece) => {
    if (!canPushToCharacter || !targetCharacterId) return
    if (liveSheetIsTarget) {
      addWeaponToInventory(piece)
      return
    }
    addWeaponToCharacterSave(targetCharacterId, piece)
  }

  const adapter = useMemo(
    () =>
      buildGmGearForgeAdapter({
        genreId,
        targetLabel: 'My Custom Gear library',
        commitBlockedReason: libraryBlockedReason,
        listItems: () => {
          void revision
          return listLibraryWeaponsAsInventory()
        },
        addWeapon: (piece: GearForgeWeaponPiece) => {
          if (libraryBlockedReason) return
          saveCustomGearWeapon({ genreId, weapon: piece })
          bump()
          // Optional dual-write: push a copy when a grant target is selected.
          pushCopyToCharacter(piece)
        },
        updateWeapon: (id: string, patch: GearForgeWeaponPatch) => {
          if (libraryBlockedReason) return
          const rows = listLibraryWeaponsAsInventory()
          const row = rows.find((w) => w.id === id)
          if (!row || row.itemType !== 'weapon') return
          const merged = {
            ...row,
            ...patch,
            id: row.id,
            itemType: 'weapon' as const,
          }
          saveCustomGearWeapon({
            id,
            genreId,
            weapon: inventoryWeaponToLibraryPiece(merged),
          })
          bump()
        },
        dropItem: (id: string) => {
          if (libraryBlockedReason) return
          deleteCustomGearRecord(id)
          bump()
        },
      }),
    // pushCopyToCharacter closes over live grant state; revision bumps list.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional revision gate
    [
      genreId,
      libraryBlockedReason,
      revision,
      canPushToCharacter,
      targetCharacterId,
      liveSheetIsTarget,
      addWeaponToInventory,
    ],
  )

  if (!session) {
    return <p className="p-6 text-sm text-slate-500">Open a session first.</p>
  }

  return (
    <div className="flex flex-col gap-3 p-4 pb-6">
      <div className="space-y-2">
        <p className="text-[11px] leading-snug text-slate-400">
          Gear Forge core — forge customs and catalog copies into{' '}
          <span className="font-semibold text-slate-200">My Custom Gear</span>{' '}
          lists (same library as the portal). Saving never requires a character.
          Optionally push a copy onto a People character save when you pick a
          grant target below.
        </p>
        <label className="block max-w-md">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Push to character (optional)
          </span>
          <select
            value={targetCharacterId ?? ''}
            onChange={(e) => setTargetCharacterId(e.target.value || null)}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Don’t push — library only</option>
            {partySlices.map((pc) => (
              <option key={pc.characterId} value={pc.characterId}>
                {pc.name}
              </option>
            ))}
          </select>
        </label>
        {targetCharacterId && grantBlockedReason ? (
          <p className="text-[11px] text-amber-200/80">{grantBlockedReason}</p>
        ) : targetCharacterId && targetSlice ? (
          <p className="text-[11px] text-slate-500">
            New forge saves also push a copy to {targetSlice.name}. Library
            save completes either way.
          </p>
        ) : partySlices.length === 0 ? (
          <p className="text-[11px] text-slate-500">
            No push targets yet — add a joined PC or local NPC under People when
            you want character copies. Custom gear lists still save.
          </p>
        ) : (
          <p className="text-[11px] text-slate-500">
            Library-only mode. Pick a character above to also push new saves.
          </p>
        )}
        <p className="text-[11px] text-slate-500">{GM_CAST_GEAR_BLOCKED_REASON}</p>
      </div>
      <div>
        <GearForgeShell adapter={adapter} title="GM Gear" />
      </div>
    </div>
  )
}
