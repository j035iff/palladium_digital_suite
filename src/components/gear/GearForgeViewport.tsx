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
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/90 px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-500/90">
            Gear Forge
          </p>
          <h1 className="text-lg font-black tracking-wide text-white">
            Custom gear library
          </h1>
          <p className="text-[11px] text-slate-500">
            Create and save reusable weapons. Grant them later from creation, sheet, or GM.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Genre
            <select
              className="rounded-md border-2 border-slate-600 bg-slate-950 px-2 py-1.5 font-mono text-xs text-slate-100"
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
            className="rounded-lg border-2 border-slate-500 px-4 py-2 text-sm font-bold uppercase text-slate-200 hover:border-slate-300"
          >
            Return to launcher
          </button>
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col overflow-hidden px-4 py-4">
        <GearForgeShell adapter={adapter} morphus={false} title="Gear Forge" />
      </main>
    </div>
  )
}
