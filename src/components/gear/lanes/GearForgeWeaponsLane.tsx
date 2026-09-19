import { useMemo, useState } from 'react'
import {
  ancientCatalogToInventoryPiece,
  ancientWeaponCategoryLabel,
  listAncientWeaponsForGearPicker,
  resolveAncientWeaponGenreStats,
} from '../../../data/library/weaponsAncientCatalogLoader'
import { listWeaponProficienciesForGameSystem } from '../../../data/library/weaponProficienciesCatalogLoader'
import type { GearForgeHostAdapter } from '../../../lib/gear/gearForgeHost'
import {
  buildGearForgeWeaponsSubTabViews,
  GEAR_FORGE_WEAPONS_SUB_TAB_LABELS,
  gearForgeWeaponsModernStubReason,
  isGearForgeWeaponsSubTabId,
  type GearForgeWeaponsSubTabId,
} from '../../../lib/forgeNavigation/gearForgeWeapons'
import {
  applyQualityPresetToDraft,
  newAbilityTrigger,
  newDamageMultiplier,
  summarizeForgeProperties,
  WEAPON_QUALITY_PRESETS,
  type WeaponQualityPresetId,
} from '../../../lib/weaponForgeProperties'
import type { Weapon, WeaponForgeProperties } from '../../../types'
import { ForgeNavigationBar } from '../../forge/ForgeNavigationBar'
import { gearPanelTheme } from '../../live/gear/gearPanelTheme'

type Props = {
  adapter: GearForgeHostAdapter
  morphus?: boolean
}

export function GearForgeWeaponsLane({ adapter, morphus = false }: Props) {
  const theme = gearPanelTheme(morphus)
  const blocked = adapter.commitBlockedReason?.trim() || null

  const [weaponsSubTab, setWeaponsSubTab] =
    useState<GearForgeWeaponsSubTabId>('ancient')
  const weaponsSubTabs = useMemo(
    () => buildGearForgeWeaponsSubTabViews(weaponsSubTab),
    [weaponsSubTab],
  )

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

  const [indestructible, setIndestructible] = useState(false)
  const [qualityPresetId, setQualityPresetId] =
    useState<WeaponQualityPresetId>('none')
  const [multipliers, setMultipliers] = useState(() => [] as ReturnType<typeof newDamageMultiplier>[])
  const [triggers, setTriggers] = useState(() => [] as ReturnType<typeof newAbilityTrigger>[])

  const wpOptions = useMemo(
    () => listWeaponProficienciesForGameSystem(adapter.genreId),
    [adapter.genreId],
  )

  const catalogRows = useMemo(
    () => listAncientWeaponsForGearPicker(adapter.genreId),
    [adapter.genreId],
  )

  const catalogCategories = useMemo(() => {
    const set = new Set<string>()
    for (const r of catalogRows) {
      const slugs = Array.isArray(r.category) ? r.category : [r.category]
      for (const c of slugs) set.add(c)
    }
    return [...set].sort()
  }, [catalogRows])

  const filteredCatalog = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase()
    return catalogRows.filter((r) => {
      const slugs = Array.isArray(r.category) ? r.category : [r.category]
      if (catalogCategory && !slugs.includes(catalogCategory)) return false
      if (!q) return true
      const blob = `${r.name} ${r.aliases?.join(' ') ?? ''} ${slugs.join(' ')} ${r.id}`.toLowerCase()
      return blob.includes(q)
    })
  }, [catalogRows, catalogCategory, catalogQuery])

  const selectedCatalog = useMemo(
    () => catalogRows.find((r) => r.id === selectedCatalogId),
    [catalogRows, selectedCatalogId],
  )

  const selectedGenreStats = useMemo(() => {
    if (!selectedCatalog) return undefined
    return resolveAncientWeaponGenreStats(selectedCatalog, adapter.genreId)
  }, [selectedCatalog, adapter.genreId])

  const qualityOptions = selectedGenreStats?.qualityVariants ?? []

  const weapons = useMemo(
    () =>
      adapter
        .listItems()
        .filter((it): it is Weapon => it.itemType === 'weapon'),
    [adapter],
  )

  const buildForgeProperties = (): WeaponForgeProperties | undefined => {
    const fp: WeaponForgeProperties = {}
    if (indestructible) fp.indestructible = true
    const preset = WEAPON_QUALITY_PRESETS.find((p) => p.id === qualityPresetId)
    if (preset && preset.id !== 'none') fp.qualityLabel = preset.label
    if (multipliers.length) fp.damageMultipliers = multipliers
    if (triggers.length) fp.abilityTriggers = triggers
    if (
      !fp.indestructible &&
      !fp.qualityLabel &&
      !fp.damageMultipliers?.length &&
      !fp.abilityTriggers?.length
    ) {
      return undefined
    }
    return fp
  }

  const applyPresetToNumbers = (strike: number, damage: string) => {
    return applyQualityPresetToDraft({
      strikeBonus: strike,
      damage,
      presetId: qualityPresetId,
    })
  }

  const addFromCatalog = () => {
    if (blocked || !selectedCatalog) return
    const piece = ancientCatalogToInventoryPiece(
      selectedCatalog,
      adapter.genreId,
      qualityOptions.length ? qualityVariantId || qualityOptions[0]?.id : null,
    )
    if (!piece) return
    const tuned = applyPresetToNumbers(piece.strikeBonus, piece.damage)
    const forgeProperties = buildForgeProperties()
    adapter.addWeapon({
      ...piece,
      strikeBonus: tuned.strikeBonus,
      damage: tuned.damage,
      forgeProperties: forgeProperties
        ? {
            ...forgeProperties,
            qualityLabel: forgeProperties.qualityLabel ?? tuned.qualityLabel,
          }
        : tuned.qualityLabel
          ? { qualityLabel: tuned.qualityLabel }
          : undefined,
      isArtifact: Boolean(forgeProperties) || qualityPresetId !== 'none',
    })
  }

  const addCustomWeapon = () => {
    if (blocked) return
    const strikeBonus = Number(customStrike)
    const weightLbs = Number(customWeight)
    if (!Number.isFinite(strikeBonus) || !Number.isFinite(weightLbs)) return

    const wpEntry = customWpId
      ? wpOptions.find((wp) => wp.id === customWpId)
      : undefined
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

    const tuned = applyPresetToNumbers(strikeBonus, customDamage.trim() || '1D6')
    const forgeProperties = buildForgeProperties()

    adapter.addWeapon({
      name: customName.trim() || 'Custom weapon',
      category: customCategory.trim() || 'Misc',
      damage: tuned.damage,
      strikeBonus: tuned.strikeBonus,
      weightLbs,
      linkedWpSkillId: wpEntry?.id,
      wpCategory: wpEntry?.name,
      payload,
      ammoCategory,
      forgeProperties: forgeProperties
        ? {
            ...forgeProperties,
            qualityLabel: forgeProperties.qualityLabel ?? tuned.qualityLabel,
          }
        : tuned.qualityLabel
          ? { qualityLabel: tuned.qualityLabel }
          : undefined,
      isArtifact: true,
    })
  }

  return (
    <div
      className={`rounded-xl p-4 shadow-lg ${theme.shell}`}
      role="tabpanel"
      aria-label="Weapons"
    >
      <div className="mb-3">
        <ForgeNavigationBar
          tabs={weaponsSubTabs}
          activeTabId={weaponsSubTab}
          onSelectTab={(id) => {
            if (isGearForgeWeaponsSubTabId(id)) setWeaponsSubTab(id)
          }}
          singleRow
          ariaLabel="Weapons era"
        />
      </div>

      {weaponsSubTab === 'modern' ? (
        <div
          className={`rounded-lg border-2 border-dashed px-4 py-8 text-center ${
            morphus
              ? 'border-violet-600/70 bg-slate-900/40'
              : 'border-blue-300 bg-blue-50/50'
          }`}
          role="tabpanel"
          aria-label={GEAR_FORGE_WEAPONS_SUB_TAB_LABELS.modern}
        >
          <p className={`text-sm font-semibold ${theme.th}`}>
            Modern weapons — not wired yet
          </p>
          <p className={`mt-2 text-xs ${theme.muted}`}>
            {gearForgeWeaponsModernStubReason()}
          </p>
        </div>
      ) : (
        <>
      <p className={`mb-4 text-[11px] font-semibold leading-snug ${theme.muted}`}>
        Grant ancient hardware from the book catalog, or forge a custom weapon with an optional
        property stack (indestructible, quality, multipliers, ability triggers).
      </p>

      {blocked ? (
        <p className={`mb-4 rounded-md border-2 border-amber-500/70 bg-amber-950/20 px-3 py-2 text-xs ${theme.muted}`}>
          {blocked}
        </p>
      ) : null}

      <div className={`mb-5 p-3 ${theme.dashedPanel}`}>
        <h3 className={`mb-2 text-[11px] font-black uppercase tracking-wider ${theme.th}`}>
          Ancient weapons catalog
        </h3>
        {catalogRows.length === 0 ? (
          <p className={`text-sm ${theme.muted}`}>
            No ancient weapons are available for this genre yet.
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
                  className={`mt-0.5 ${theme.inputCls}`}
                  value={catalogCategory}
                  onChange={(e) => setCatalogCategory(e.target.value)}
                >
                  <option value="">All</option>
                  {catalogCategories.map((c) => (
                    <option key={c} value={c}>
                      {ancientWeaponCategoryLabel(c)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <ul className="mb-2 max-h-40 overflow-y-auto rounded-md border border-slate-500/40">
              {filteredCatalog.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCatalogId(row.id)
                      setQualityVariantId('')
                    }}
                    className={`flex w-full items-center justify-between px-2 py-1.5 text-left text-xs ${
                      selectedCatalogId === row.id
                        ? morphus
                          ? 'bg-violet-800/60 text-violet-50'
                          : 'bg-blue-100 text-blue-950'
                        : 'hover:bg-slate-500/10'
                    }`}
                  >
                    <span className="font-semibold">{row.name}</span>
                    <span className={theme.muted}>
                      {ancientWeaponCategoryLabel(row.category)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {qualityOptions.length > 0 ? (
              <label className={`mb-2 block text-[10px] font-bold uppercase ${theme.muted}`}>
                Catalog quality tier
                <select
                  className={`mt-0.5 ${theme.inputCls}`}
                  value={qualityVariantId || qualityOptions[0]?.id || ''}
                  onChange={(e) => setQualityVariantId(e.target.value)}
                >
                  {qualityOptions.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <button
              type="button"
              className={theme.btn}
              disabled={Boolean(blocked) || !selectedCatalog}
              onClick={addFromCatalog}
              title={blocked ?? undefined}
            >
              {adapter.kind === 'library' ? 'Save catalog copy to library' : 'Add from catalog'}
            </button>
          </>
        )}
      </div>

      <div className={`mb-5 p-3 ${theme.dashedPanel}`}>
        <h3 className={`mb-2 text-[11px] font-black uppercase tracking-wider ${theme.th}`}>
          Custom weapon
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
            Name
            <input
              className={`mt-0.5 ${theme.inputCls}`}
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
          </label>
          <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
            Category
            <input
              className={`mt-0.5 ${theme.inputCls}`}
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
            />
          </label>
          <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
            Damage
            <input
              className={`mt-0.5 ${theme.inputCls}`}
              value={customDamage}
              onChange={(e) => setCustomDamage(e.target.value)}
            />
          </label>
          <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
            Strike bonus
            <input
              className={`mt-0.5 ${theme.inputCls}`}
              value={customStrike}
              onChange={(e) => setCustomStrike(e.target.value)}
            />
          </label>
          <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
            Weight (lbs)
            <input
              className={`mt-0.5 ${theme.inputCls}`}
              value={customWeight}
              onChange={(e) => setCustomWeight(e.target.value)}
            />
          </label>
          <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
            Linked W.P.
            <select
              className={`mt-0.5 ${theme.inputCls}`}
              value={customWpId}
              onChange={(e) => setCustomWpId(e.target.value)}
            >
              <option value="">None</option>
              {wpOptions.map((wp) => (
                <option key={wp.id} value={wp.id}>
                  {wp.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className={`mt-2 flex items-center gap-2 text-xs ${theme.muted}`}>
          <input
            type="checkbox"
            checked={customRanged}
            onChange={(e) => setCustomRanged(e.target.checked)}
          />
          Ranged (magazine)
        </label>
        {customRanged ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
              Mag current
              <input
                className={`mt-0.5 ${theme.inputCls}`}
                value={customMagCurrent}
                onChange={(e) => setCustomMagCurrent(e.target.value)}
              />
            </label>
            <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
              Mag max
              <input
                className={`mt-0.5 ${theme.inputCls}`}
                value={customMagMax}
                onChange={(e) => setCustomMagMax(e.target.value)}
              />
            </label>
            <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
              Ammo category
              <input
                className={`mt-0.5 ${theme.inputCls}`}
                value={customAmmoCategory}
                onChange={(e) => setCustomAmmoCategory(e.target.value)}
              />
            </label>
          </div>
        ) : null}
      </div>

      <div className={`mb-5 p-3 ${theme.dashedPanel}`}>
        <h3 className={`mb-2 text-[11px] font-black uppercase tracking-wider ${theme.th}`}>
          Custom property stack
        </h3>
        <label className={`flex items-center gap-2 text-xs ${theme.muted}`}>
          <input
            type="checkbox"
            checked={indestructible}
            onChange={(e) => setIndestructible(e.target.checked)}
          />
          Indestructible
        </label>
        <label className={`mt-2 block text-[10px] font-bold uppercase ${theme.muted}`}>
          Forge quality preset
          <select
            className={`mt-0.5 ${theme.inputCls}`}
            value={qualityPresetId}
            onChange={(e) =>
              setQualityPresetId(e.target.value as WeaponQualityPresetId)
            }
          >
            {WEAPON_QUALITY_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase ${theme.muted}`}>
              Damage multipliers
            </span>
            <button
              type="button"
              className={theme.btnGhost}
              onClick={() => setMultipliers((prev) => [...prev, newDamageMultiplier()])}
            >
              Add
            </button>
          </div>
          {multipliers.map((m, idx) => (
            <div key={m.id} className="mb-2 grid grid-cols-[1fr_4rem_auto] gap-2">
              <input
                className={theme.inputCls}
                value={m.label}
                onChange={(e) =>
                  setMultipliers((prev) =>
                    prev.map((row, i) =>
                      i === idx ? { ...row, label: e.target.value } : row,
                    ),
                  )
                }
                placeholder="vs Supernatural"
              />
              <input
                className={theme.inputCls}
                value={String(m.multiplier)}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  setMultipliers((prev) =>
                    prev.map((row, i) =>
                      i === idx
                        ? { ...row, multiplier: Number.isFinite(n) ? n : row.multiplier }
                        : row,
                    ),
                  )
                }}
              />
              <button
                type="button"
                className={theme.btnDanger}
                onClick={() =>
                  setMultipliers((prev) => prev.filter((_, i) => i !== idx))
                }
              >
                Drop
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase ${theme.muted}`}>
              Ability triggers
            </span>
            <button
              type="button"
              className={theme.btnGhost}
              onClick={() => setTriggers((prev) => [...prev, newAbilityTrigger()])}
            >
              Add
            </button>
          </div>
          {triggers.map((t, idx) => (
            <div key={t.id} className="mb-2 grid gap-2 sm:grid-cols-[1fr_5rem_4rem_auto]">
              <input
                className={theme.inputCls}
                value={t.name}
                onChange={(e) =>
                  setTriggers((prev) =>
                    prev.map((row, i) =>
                      i === idx ? { ...row, name: e.target.value } : row,
                    ),
                  )
                }
                placeholder="Ability name"
              />
              <select
                className={theme.inputCls}
                value={t.resourceType}
                onChange={(e) =>
                  setTriggers((prev) =>
                    prev.map((row, i) =>
                      i === idx
                        ? {
                            ...row,
                            resourceType: e.target.value === 'isp' ? 'isp' : 'ppe',
                          }
                        : row,
                    ),
                  )
                }
              >
                <option value="ppe">P.P.E.</option>
                <option value="isp">I.S.P.</option>
              </select>
              <input
                className={theme.inputCls}
                value={String(t.cost)}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  setTriggers((prev) =>
                    prev.map((row, i) =>
                      i === idx
                        ? {
                            ...row,
                            cost: Number.isFinite(n) ? Math.max(0, Math.round(n)) : row.cost,
                          }
                        : row,
                    ),
                  )
                }}
              />
              <button
                type="button"
                className={theme.btnDanger}
                onClick={() => setTriggers((prev) => prev.filter((_, i) => i !== idx))}
              >
                Drop
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          className={`mt-3 ${theme.btn}`}
          disabled={Boolean(blocked)}
          onClick={addCustomWeapon}
          title={blocked ?? undefined}
        >
          {adapter.kind === 'library' ? 'Save custom weapon to library' : 'Add custom weapon'}
        </button>
      </div>

      <div>
        <h3 className={`mb-2 text-[11px] font-black uppercase tracking-wider ${theme.th}`}>
          {adapter.kind === 'library' ? 'My custom weapons' : 'Carried weapons'}
        </h3>
        {weapons.length === 0 ? (
          <p className={`text-sm ${theme.muted}`}>
            {adapter.kind === 'library'
              ? 'No custom weapons saved yet.'
              : 'No weapons granted yet.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {weapons.map((w) => {
              const chips = summarizeForgeProperties(w.forgeProperties)
              return (
                <li key={w.id} className={`flex items-start justify-between gap-2 p-2 ${theme.card}`}>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${theme.th}`}>{w.name}</p>
                    <p className={`text-[11px] ${theme.muted}`}>
                      {w.category} · {w.damage}
                      {w.strikeBonus ? ` · +${w.strikeBonus} strike` : ''}
                    </p>
                    {chips ? (
                      <p className={`mt-1 text-[10px] font-semibold ${theme.muted}`}>{chips}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className={theme.btnDanger}
                    onClick={() => adapter.dropItem(w.id)}
                  >
                    Drop
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
        </>
      )}
    </div>
  )
}
