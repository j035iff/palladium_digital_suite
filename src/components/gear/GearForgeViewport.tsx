import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatGenreSlug, isGenreId, LAUNCHER_CREATE_OPTIONS } from '../../data/genres'
import {
  deleteCustomGearRecord,
  getCustomGearRecord,
  inventoryWeaponToLibraryPiece,
  listLibraryWeaponsAsInventory,
  saveCustomGearWeapon,
} from '../../lib/gear/customGearLibrary'
import type {
  GearForgeHostAdapter,
  GearForgeWeaponPatch,
  GearForgeWeaponPiece,
} from '../../lib/gear/gearForgeHost'
import { useCharacter } from '../../context/CharacterContext'
import { GearForgeShell } from './GearForgeShell'
import { UnitsPreferenceToggle } from '../units/UnitsPreferenceToggle'

/**
 * Standalone portal host for Gear Forge (`viewport: 'gear_forge'`).
 * Commits to the custom gear library (My Custom Gear), not a character inventory.
 */
export function GearForgeViewport() {
  const { returnToLauncher, gearForgeLibraryId } = useCharacter()
  const [genreId, setGenreId] = useState('nightbane')
  const [revision, setRevision] = useState(0)
  const bump = useCallback(() => setRevision((n) => n + 1), [])

  useEffect(() => {
    if (!gearForgeLibraryId) return
    const record = getCustomGearRecord(gearForgeLibraryId)
    if (record && isGenreId(record.genreId)) {
      setGenreId(record.genreId)
    }
  }, [gearForgeLibraryId])

  const adapter = useMemo<GearForgeHostAdapter>(() => {
    void revision
    return {
      kind: 'library',
      genreId,
      targetLabel: 'My Custom Gear library',
      listItems: () => listLibraryWeaponsAsInventory(),
      addWeapon: (piece: GearForgeWeaponPiece) => {
        saveCustomGearWeapon({ genreId, weapon: piece })
        bump()
      },
      updateWeapon: (id: string, patch: GearForgeWeaponPatch) => {
        const rows = listLibraryWeaponsAsInventory()
        const row = rows.find((w) => w.id === id)
        if (!row || row.itemType !== 'weapon') return
        const merged = { ...row, ...patch, id: row.id, itemType: 'weapon' as const }
        saveCustomGearWeapon({
          id,
          genreId,
          weapon: inventoryWeaponToLibraryPiece(merged),
        })
        bump()
      },
      dropItem: (id: string) => {
        deleteCustomGearRecord(id)
        bump()
      },
    }
  }, [genreId, revision, bump])

  const playableGenres = LAUNCHER_CREATE_OPTIONS.filter((o) => o.playable)

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden bg-[#0a0c12] text-slate-100">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-950/90 px-4 py-2">
        {/* Avoid global `h1` rules in index.css (56px / 32px margin / dark text). */}
        <p className="m-0 text-sm font-black uppercase tracking-[0.18em] text-white">
          Gear Forge
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <UnitsPreferenceToggle tone="launcher" />
          <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Genre
            <select
              className="rounded-md border border-slate-600 bg-slate-950 px-2 py-1 font-mono text-xs text-slate-100"
              value={genreId}
              onChange={(e) => {
                if (isGenreId(e.target.value)) setGenreId(e.target.value)
              }}
            >
              {playableGenres.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label ?? formatGenreSlug(String(g.id))}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={returnToLauncher}
            className="rounded-full border border-slate-300 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-100 hover:border-white hover:text-white"
          >
            Return to launcher
          </button>
        </div>
      </header>

      {/* Title lives in the viewport bar; shell shows lanes + forge body only. */}
      <main className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col overflow-hidden px-4 pb-3 pt-1.5">
        <GearForgeShell adapter={adapter} morphus={false} />
      </main>
    </div>
  )
}
