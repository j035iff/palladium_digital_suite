import { useMemo, useState } from 'react'
import { useCharacter } from '../../../context/CharacterContext'
import {
  ancientCatalogToInventoryPiece,
  ancientWeaponCategoryLabel,
  listAncientWeaponsForGearPicker,
  resolveAncientWeaponGenreStats,
} from '../../../data/library/weaponsAncientCatalogLoader'
import { listWeaponProficienciesForGameSystem } from '../../../data/library/weaponProficienciesCatalogLoader'
import {
  ammoCategoryForWeapon,
  canReloadWeapon,
  formatAmmoHudLine,
} from '../../../lib/ammoReserves'
import type { Weapon } from '../../../types'
import { WeaponReloadControl } from '../WeaponReloadControl'
import { gearPanelTheme } from './gearPanelTheme'

type Props = {
  morphus: boolean
}

export function GearWeaponsSection({ morphus }: Props) {
  const {
    hostGenreId,
    inventoryItems,
    readyWeaponIds,
    setReadyWeapon,
    reloadWeapon,
    ammoReserves,
    addAmmoToReserve,
    addWeaponToInventory,
    dropItem,
  } = useCharacter()

  const theme = gearPanelTheme(morphus)
  const [ammoAddRounds, setAmmoAddRounds] = useState('12')
  const [ammoCategoryPick, setAmmoCategoryPick] = useState('9mm')

  const [catalogQuery, setCatalogQuery] = useState('')
  const [catalogCategory, setCatalogCategory] = useState('')
  const [selectedCatalogId, setSelectedCatalogId] = useState('')
  const [qualityVariantId, setQualityVariantId] = useState('')

  const [customName, setCustomName] = useState('')
  const [customCategory, setCustomCategory] = useState('Misc')
  const [customDamage, setCustomDamage] = useState('2D6')
  const [customStrike, setCustomStrike] = useState('0')
  const [customWeight, setCustomWeight] = useState('2')
  const [customWpId, setCustomWpId] = useState('')
  const [customRanged, setCustomRanged] = useState(false)
  const [customMagCurrent, setCustomMagCurrent] = useState('15')
  const [customMagMax, setCustomMagMax] = useState('15')
  const [customAmmoCategory, setCustomAmmoCategory] = useState('9mm')

  const wpOptions = useMemo(
    () => listWeaponProficienciesForGameSystem(hostGenreId),
    [hostGenreId],
  )

  const catalogRows = useMemo(
    () => listAncientWeaponsForGearPicker(hostGenreId),
    [hostGenreId],
  )

  const catalogCategories = useMemo(() => {
    const set = new Set(catalogRows.map((r) => r.category))
    return [...set].sort()
  }, [catalogRows])

  const filteredCatalog = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase()
    return catalogRows.filter((r) => {
      if (catalogCategory && r.category !== catalogCategory) return false
      if (!q) return true
      const blob = `${r.name} ${r.aliases?.join(' ') ?? ''} ${r.category} ${r.id}`.toLowerCase()
      return blob.includes(q)
    })
  }, [catalogRows, catalogCategory, catalogQuery])

  const selectedCatalog = useMemo(
    () => catalogRows.find((r) => r.id === selectedCatalogId),
    [catalogRows, selectedCatalogId],
  )

  const selectedGenreStats = useMemo(() => {
    if (!selectedCatalog) return undefined
    return resolveAncientWeaponGenreStats(selectedCatalog, hostGenreId)
  }, [selectedCatalog, hostGenreId])

  const qualityOptions = selectedGenreStats?.qualityVariants ?? []

  const weapons = useMemo(
    () => inventoryItems.filter((it): it is Weapon => it.itemType === 'weapon'),
    [inventoryItems],
  )

  const activeAmmoCategories = useMemo(() => {
    const keys = new Set<string>(Object.keys(ammoReserves))
    for (const w of weapons) {
      const cat = ammoCategoryForWeapon(w)
      if (cat) keys.add(cat)
    }
    return [...keys].sort()
  }, [ammoReserves, weapons])

  const ammoReserveRows = useMemo(
    () => activeAmmoCategories.map((cat) => [cat, ammoReserves[cat] ?? 0] as const),
    [activeAmmoCategories, ammoReserves],
  )

  const addFromCatalog = () => {
    if (!selectedCatalog) return
    const piece = ancientCatalogToInventoryPiece(
      selectedCatalog,
      hostGenreId,
      qualityOptions.length ? qualityVariantId || qualityOptions[0]?.id : null,
    )
    if (!piece) return
    addWeaponToInventory(piece)
  }

  const addCustomWeapon = () => {
    const strikeBonus = Number(customStrike)
    const weightLbs = Number(customWeight)
    if (!Number.isFinite(strikeBonus) || !Number.isFinite(weightLbs)) return

    const wpEntry = customWpId ? wpOptions.find((wp) => wp.id === customWpId) : undefined
    let payload: { current: number; max: number } | undefined
    let ammoCategory: string | undefined

    if (customRanged) {
      const magMax = Number(customMagMax)
      const magCurrent = Number(customMagCurrent)
      if (!Number.isFinite(magMax) || magMax < 1) return
      const max = Math.round(magMax)
      const current = Number.isFinite(magCurrent)
        ? Math.max(0, Math.min(Math.round(magCurrent), max))
        : max
      payload = { current, max }
      ammoCategory = customAmmoCategory.trim() || undefined
    }

    addWeaponToInventory({
      name: customName.trim() || 'Custom weapon',
      category: customCategory.trim() || 'Misc',
      damage: customDamage.trim() || '1D6',
      strikeBonus,
      weightLbs,
      linkedWpSkillId: wpEntry?.id,
      wpCategory: wpEntry?.name,
      payload,
      ammoCategory,
    })
  }

  return (
    <div
      className={`rounded-xl p-4 shadow-lg ${theme.shell}`}
      role="tabpanel"
      aria-label="Weapons"
    >
      <p className={`mb-4 text-[11px] font-semibold leading-snug ${theme.muted}`}>
        Equip up to two weapons for the tactical HUD. Ancient hardware comes from the book catalog;
        W.P. skills on your sheet feed the strike engine when the weapon&apos;s linked W.P. matches.
      </p>

      <div className={`mb-5 p-3 ${theme.dashedPanel}`}>
        <h3 className={`mb-2 text-[11px] font-black uppercase tracking-wider ${theme.th}`}>
          Ancient weapons catalog
        </h3>
        <p className={`mb-3 text-[11px] leading-snug ${theme.muted}`}>
          Nightbane RPG ancient / oriental tables. Pick a row (and quality tier when listed), then add
          to carried gear.
        </p>
        {catalogRows.length === 0 ? (
          <p className={`text-sm ${theme.muted}`}>
            No ancient weapons are available for this host genre yet.
          </p>
        ) : (
          <>
            <div className="mb-2 grid gap-2 sm:grid-cols-2">
              <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
                Search
                <input
                  className={`mt-0.5 ${theme.inputCls}`}
                  value={catalogQuery}
                  onChange={(e) => setCatalogQuery(e.target.value)}
                  placeholder="Katana, long sword…"
                />
              </label>
              <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
                Category
                <select
                  className={`mt-0.5 min-w-0 ${theme.inputCls}`}
                  value={catalogCategory}
                  onChange={(e) => setCatalogCategory(e.target.value)}
                >
                  <option value="">All categories</option>
                  {catalogCategories.map((c) => (
                    <option key={c} value={c}>
                      {ancientWeaponCategoryLabel(c)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className={`mb-2 block text-[10px] font-bold uppercase ${theme.muted}`}>
              Weapon
              <select
                className={`mt-0.5 min-w-0 ${theme.inputCls}`}
                value={selectedCatalogId}
                onChange={(e) => {
                  setSelectedCatalogId(e.target.value)
                  setQualityVariantId('')
                }}
                size={Math.min(10, Math.max(4, filteredCatalog.length || 4))}
              >
                <option value="">— Select —</option>
                {filteredCatalog.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · {ancientWeaponCategoryLabel(r.category)}
                    {r.weaponProficiencyEligible === false ? ' (no W.P.)' : ''}
                  </option>
                ))}
              </select>
            </label>
            {qualityOptions.length > 0 ? (
              <label className={`mb-2 block text-[10px] font-bold uppercase ${theme.muted}`}>
                Quality
                <select
                  className={`mt-0.5 min-w-0 ${theme.inputCls}`}
                  value={qualityVariantId || qualityOptions[0]?.id || ''}
                  onChange={(e) => setQualityVariantId(e.target.value)}
                >
                  {qualityOptions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label} · {v.damage}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {selectedCatalog && selectedGenreStats ? (
              <p className={`mb-2 font-mono text-[11px] ${theme.muted}`}>
                {[
                  selectedGenreStats.damage ||
                    selectedGenreStats.damageSpecial ||
                    qualityOptions.find((v) => v.id === (qualityVariantId || qualityOptions[0]?.id))
                      ?.damage,
                  selectedGenreStats.averageWeight?.display,
                  selectedCatalog.throwable ? 'throwable' : null,
                  selectedCatalog.linkedWpSkillId && selectedCatalog.weaponProficiencyEligible !== false
                    ? selectedCatalog.linkedWpSkillId
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
            <button
              type="button"
              className={theme.btn}
              disabled={!selectedCatalogId}
              onClick={addFromCatalog}
            >
              Add from catalog
            </button>
          </>
        )}
      </div>

      <div className={`mb-5 p-3 ${theme.dashedPanel}`}>
        <h3 className={`mb-2 text-[11px] font-black uppercase tracking-wider ${theme.th}`}>
          Custom / modern weapon
        </h3>
        <p className={`mb-3 text-[11px] leading-snug ${theme.muted}`}>
          Homebrew or modern firearms until a modern hardware catalog exists. Supports melee or ranged
          (magazine + ammo category).
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
            Name
            <input
              className={`mt-0.5 ${theme.inputCls}`}
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Chrome .45"
            />
          </label>
          <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
            Category
            <input
              className={`mt-0.5 ${theme.inputCls}`}
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="Handguns"
            />
          </label>
          <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
            Damage
            <input
              className={`mt-0.5 ${theme.inputCls}`}
              value={customDamage}
              onChange={(e) => setCustomDamage(e.target.value)}
              placeholder="2D6"
            />
          </label>
          <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
            Strike bonus
            <input
              className={`mt-0.5 ${theme.inputCls}`}
              value={customStrike}
              onChange={(e) => setCustomStrike(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
            Weight (lbs)
            <input
              className={`mt-0.5 ${theme.inputCls}`}
              value={customWeight}
              onChange={(e) => setCustomWeight(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
            W.P. link
            <select
              className={`mt-0.5 min-w-0 ${theme.inputCls}`}
              value={customWpId}
              onChange={(e) => setCustomWpId(e.target.value)}
            >
              <option value="">— None —</option>
              {wpOptions.map((wp) => (
                <option key={wp.id} value={wp.id}>
                  {wp.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
          <label className={`flex cursor-pointer items-center gap-2 ${theme.muted}`}>
            <input
              type="checkbox"
              checked={customRanged}
              onChange={(e) => setCustomRanged(e.target.checked)}
            />
            Ranged (magazine)
          </label>
        </div>
        {customRanged ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
              Mag current
              <input
                className={`mt-0.5 ${theme.inputCls}`}
                value={customMagCurrent}
                onChange={(e) => setCustomMagCurrent(e.target.value)}
                inputMode="numeric"
              />
            </label>
            <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
              Mag max
              <input
                className={`mt-0.5 ${theme.inputCls}`}
                value={customMagMax}
                onChange={(e) => setCustomMagMax(e.target.value)}
                inputMode="numeric"
              />
            </label>
            <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
              Ammo category
              <input
                className={`mt-0.5 ${theme.inputCls}`}
                value={customAmmoCategory}
                onChange={(e) => setCustomAmmoCategory(e.target.value)}
                placeholder="9mm"
              />
            </label>
          </div>
        ) : null}
        <button type="button" className={`mt-3 ${theme.btn}`} onClick={addCustomWeapon}>
          Add custom weapon
        </button>
      </div>

      <div className={`mb-5 p-3 ${theme.ammoPanel}`}>
        <h3 className={`mb-2 text-[11px] font-black uppercase tracking-wider ${theme.th}`}>
          Ammo reserves
        </h3>
        <p className={`mb-3 text-[11px] leading-snug ${theme.muted}`}>
          Shared pools by caliber (e.g. 9mm). Adding rounds here refills the pool every ranged weapon
          in that category uses when you reload on the tactical HUD.
        </p>
        <ul className="mb-3 space-y-2">
          {ammoReserveRows.map(([cat, rounds]) => (
            <li
              key={cat}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-2 py-1.5 ${
                morphus ? 'border-violet-700 bg-slate-900/50' : 'border-blue-200 bg-white'
              }`}
            >
              <p className={`text-xs font-bold ${theme.th}`}>{cat}</p>
              <p className={`font-mono text-sm font-black tabular-nums ${theme.th}`}>
                {rounds} rds
              </p>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-end gap-2">
          <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
            Category
            <select
              className={`mt-0.5 min-w-[8rem] ${theme.inputCls}`}
              value={ammoCategoryPick}
              onChange={(e) => setAmmoCategoryPick(e.target.value)}
            >
              {activeAmmoCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
          <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
            Rounds
            <input
              className={`mt-0.5 w-20 ${theme.inputCls}`}
              value={ammoAddRounds}
              onChange={(e) => setAmmoAddRounds(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <button
            type="button"
            className={theme.btn}
            onClick={() => addAmmoToReserve(ammoCategoryPick, Number(ammoAddRounds))}
          >
            Add rounds
          </button>
          {ammoReserveRows.map(([cat]) => (
            <button
              key={`quick-${cat}`}
              type="button"
              className={theme.btnGhost}
              onClick={() => addAmmoToReserve(cat, 12)}
            >
              +12 ({cat})
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className={`mb-2 text-[11px] font-black uppercase tracking-wider ${theme.th}`}>
          Carried weapons
        </h3>
        {weapons.length === 0 ? (
          <p className={`text-sm ${theme.muted}`}>No weapons carried yet.</p>
        ) : (
          <ul className="space-y-3">
            {weapons.map((w) => {
              const primary = readyWeaponIds[0] === w.id
              const secondary = readyWeaponIds[1] === w.id
              const ranged = Boolean(w.payload)
              return (
                <li key={w.id} className={`px-3 py-2 ${theme.card}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-sm font-bold ${theme.th}`}>
                        {w.name}
                        {primary ? (
                          <span className="ml-2 text-[10px] font-black uppercase text-amber-300">
                            Primary
                          </span>
                        ) : null}
                        {secondary ? (
                          <span className="ml-2 text-[10px] font-black uppercase text-cyan-300">
                            Secondary
                          </span>
                        ) : null}
                      </p>
                      <p className={`font-mono text-[11px] ${theme.muted}`}>
                        {w.category} · dmg {w.damage} · strike item {w.strikeBonus >= 0 ? '+' : ''}
                        {w.strikeBonus}
                        {w.linkedWpSkillId ? ` · W.P. link: ${w.linkedWpSkillId}` : ''}
                        {w.throwable ? ' · throwable' : ''}
                        {w.catalogWeaponId ? ` · catalog` : ''}
                      </p>
                      {ranged && w.payload ? (
                        <p className={`mt-1 font-mono text-[11px] font-semibold ${theme.muted}`}>
                          Mag {w.payload.current}/{w.payload.max} · {formatAmmoHudLine(w, ammoReserves)}
                          {w.ammoCategory ? ` · ${w.ammoCategory}` : ''}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                      <button type="button" className={theme.btn} onClick={() => setReadyWeapon(0, w.id)}>
                        Primary
                      </button>
                      <button type="button" className={theme.btn} onClick={() => setReadyWeapon(1, w.id)}>
                        Secondary
                      </button>
                      {(primary || secondary) && (
                        <button
                          type="button"
                          className={theme.btnGhost}
                          onClick={() => setReadyWeapon(primary ? 0 : 1, null)}
                        >
                          Unequip
                        </button>
                      )}
                      <button type="button" className={theme.btnDanger} onClick={() => dropItem(w.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                  {ranged ? (
                    <div
                      className={`mt-2 border-t pt-2 ${morphus ? 'border-violet-800' : 'border-blue-200'}`}
                    >
                      <WeaponReloadControl
                        weapon={w}
                        ammoReserves={ammoReserves}
                        morphus={morphus}
                        vibrant={canReloadWeapon(w, ammoReserves)}
                        onReload={() => reloadWeapon(w.id)}
                        onReloadFailed={() => reloadWeapon(w.id)}
                      />
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
