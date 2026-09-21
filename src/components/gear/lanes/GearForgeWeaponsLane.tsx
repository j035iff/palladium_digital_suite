import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ancientCatalogToCustomArchetypeDraft,
  ancientCatalogToInventoryPiece,
  ancientWeaponCategoryLabel,
  ancientWeaponCategorySlugs,
  formatAncientWeaponPickerStatLine,
  isCustomWeaponMiscellaneousCategoryLabel,
  listAncientWeaponsForGearPicker,
  resolveAncientWeaponGenreStats,
  sortAncientWeaponCategoriesMiscLast,
} from '../../../data/library/weaponsAncientCatalogLoader'
import { getWeaponProficiencyCatalogEntryById } from '../../../data/library/weaponProficienciesCatalogLoader'
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

  /** '' = not chosen; 'All' = search-only browse (mirrors skills library). */
  const [catalogCategory, setCatalogCategory] = useState('')
  const [catalogQuery, setCatalogQuery] = useState('')
  const [categoryOpen, setCategoryOpen] = useState(false)
  const categorySelectRef = useRef<HTMLDivElement>(null)
  const [selectedCatalogId, setSelectedCatalogId] = useState('')
  const [qualityVariantId, setQualityVariantId] = useState('')
  const [customName, setCustomName] = useState('')
  /** Internal only — set by archetype; drives Misc → no W.P. (not shown in Custom Weapon UI). */
  const [customCategory, setCustomCategory] = useState('Misc')
  const [customDamage, setCustomDamage] = useState('2D6')
  const [customStrike, setCustomStrike] = useState('+0')
  const [customParry, setCustomParry] = useState('+0')
  const [customEntangle, setCustomEntangle] = useState('+0')
  const [customDisarm, setCustomDisarm] = useState('+0')
  const [customRange, setCustomRange] = useState('')
  const [customRateOfFire, setCustomRateOfFire] = useState('+0')
  const [customStrikeWhenThrown, setCustomStrikeWhenThrown] = useState('+0')
  const [customMaterial, setCustomMaterial] = useState('')
  const [customWeight, setCustomWeight] = useState('2')
  const [customLength, setCustomLength] = useState('')
  /** Locked to catalog archetype `linkedWpSkillId` — not editable in the form. */
  const [customWpId, setCustomWpId] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [customThrowable, setCustomThrowable] = useState(false)
  const [customTwoHanded, setCustomTwoHanded] = useState(false)
  const [customAddsPsDamageBonus, setCustomAddsPsDamageBonus] = useState(false)
  const [customWpEligible, setCustomWpEligible] = useState(true)
  const [customRanged, setCustomRanged] = useState(false)
  const [customMagCurrent, setCustomMagCurrent] = useState('15')
  const [customMagMax, setCustomMagMax] = useState('15')
  const [customAmmoCategory, setCustomAmmoCategory] = useState('9mm')
  const customEditorRef = useRef<HTMLDivElement>(null)

  /**
   * Interim units: no wired interface units setting yet — label as standard (lbs / ft).
   * Deferred: holistic standard/metric conversion pass.
   */
  const weightUnitLabel = 'lbs'
  const lengthUnitLabel = 'ft'

  const [indestructible, setIndestructible] = useState(false)
  const [qualityPresetId, setQualityPresetId] =
    useState<WeaponQualityPresetId>('none')
  const [multipliers, setMultipliers] = useState(() => [] as ReturnType<typeof newDamageMultiplier>[])
  const [triggers, setTriggers] = useState(() => [] as ReturnType<typeof newAbilityTrigger>[])

  const catalogRows = useMemo(
    () => listAncientWeaponsForGearPicker(adapter.genreId),
    [adapter.genreId],
  )

  const catalogCategories = useMemo(() => {
    const set = new Set<string>()
    for (const r of catalogRows) {
      for (const c of ancientWeaponCategorySlugs(r.category)) set.add(c)
    }
    return sortAncientWeaponCategoriesMiscLast(
      [...set].map((slug) => ({
        slug,
        label: ancientWeaponCategoryLabel(slug),
      })),
    )
  }, [catalogRows])

  const lockedWpEntry = useMemo(
    () =>
      customWpId ? getWeaponProficiencyCatalogEntryById(customWpId) : undefined,
    [customWpId],
  )

  const miscCategoryNoWp = isCustomWeaponMiscellaneousCategoryLabel(customCategory)

  const lockedWpLabel = miscCategoryNoWp
    ? 'None (Miscellaneous — no W.P. for now)'
    : !customWpEligible
      ? 'None (archetype not W.P.-eligible)'
      : lockedWpEntry?.name
        ? lockedWpEntry.name
        : customWpId
          ? customWpId
          : 'None — use a catalog archetype'

  const catalogPopulated =
    catalogCategory === 'All'
      ? catalogQuery.trim().length > 0
      : catalogCategory !== ''

  const filteredCatalog = useMemo(() => {
    if (!catalogPopulated) return []
    const q = catalogQuery.trim().toLowerCase()
    return catalogRows.filter((r) => {
      const slugs = ancientWeaponCategorySlugs(r.category)
      if (catalogCategory !== 'All' && !slugs.includes(catalogCategory)) {
        return false
      }
      if (!q) return true
      const blob =
        `${r.name} ${r.aliases?.join(' ') ?? ''} ${slugs.join(' ')} ${r.id}`.toLowerCase()
      return blob.includes(q)
    })
  }, [catalogRows, catalogCategory, catalogQuery, catalogPopulated])

  useEffect(() => {
    if (!categoryOpen) return
    function handlePointerDown(event: MouseEvent) {
      if (
        categorySelectRef.current &&
        !categorySelectRef.current.contains(event.target as Node)
      ) {
        setCategoryOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [categoryOpen])

  useEffect(() => {
    if (!selectedCatalogId) return
    if (!filteredCatalog.some((r) => r.id === selectedCatalogId)) {
      setSelectedCatalogId('')
      setQualityVariantId('')
    }
  }, [filteredCatalog, selectedCatalogId])

  const selectedCatalog = useMemo(
    () => catalogRows.find((r) => r.id === selectedCatalogId),
    [catalogRows, selectedCatalogId],
  )

  const catalogCategoryLabel =
    catalogCategory === ''
      ? '— select category —'
      : catalogCategory === 'All'
        ? 'All (search only)'
        : ancientWeaponCategoryLabel(catalogCategory)

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
    const notes = customDescription.trim()
    if (notes) fp.notes = notes

    const lengthFeet = Number(customLength)
    const editorDraft: NonNullable<WeaponForgeProperties['editorDraft']> = {}
    if (customMaterial.trim()) editorDraft.material = customMaterial.trim()
    if (Number.isFinite(lengthFeet) && customLength.trim() !== '') {
      editorDraft.lengthFeet = lengthFeet
    }
    if (customParry.trim()) editorDraft.parry = customParry.trim()
    if (customEntangle.trim()) editorDraft.entangle = customEntangle.trim()
    if (customDisarm.trim()) editorDraft.disarm = customDisarm.trim()
    if (customRange.trim()) editorDraft.range = customRange.trim()
    if (customRateOfFire.trim()) editorDraft.rateOfFire = customRateOfFire.trim()
    if (customStrikeWhenThrown.trim()) {
      editorDraft.strikeWhenThrown = customStrikeWhenThrown.trim()
    }
    editorDraft.addsPsDamageBonus = customAddsPsDamageBonus
    if (customCategory.trim()) editorDraft.category = customCategory.trim()
    if (Object.keys(editorDraft).length) fp.editorDraft = editorDraft

    if (multipliers.length) fp.damageMultipliers = multipliers
    if (triggers.length) fp.abilityTriggers = triggers
    if (
      !fp.indestructible &&
      !fp.qualityLabel &&
      !fp.notes &&
      !fp.editorDraft &&
      !fp.damageMultipliers?.length &&
      !fp.abilityTriggers?.length
    ) {
      return undefined
    }
    return fp
  }

  const parseBonusField = (raw: string): number | undefined => {
    const t = raw.trim()
    if (!t || /^n\/?a$/i.test(t) || t === '—') return undefined
    const n = Number(t.replace(/^\+/, ''))
    return Number.isFinite(n) ? n : undefined
  }

  const applyPresetToNumbers = (strike: number, damage: string) => {
    return applyQualityPresetToDraft({
      strikeBonus: strike,
      damage,
      presetId: qualityPresetId,
    })
  }

  const useAsBaseArchetype = () => {
    if (!selectedCatalog) return
    const draft = ancientCatalogToCustomArchetypeDraft(
      selectedCatalog,
      adapter.genreId,
      qualityOptions.length ? qualityVariantId || qualityOptions[0]?.id : null,
    )
    if (!draft) return
    setCustomName(draft.name)
    setCustomCategory(draft.category)
    setCustomDamage(draft.damage)
    setCustomStrike(draft.strikeDisplay)
    setCustomParry(draft.parryDisplay)
    setCustomEntangle(draft.entangleDisplay)
    setCustomDisarm(draft.disarmDisplay)
    setCustomRange(draft.rangeDisplay)
    setCustomRateOfFire(draft.rateOfFireDisplay)
    setCustomStrikeWhenThrown(draft.strikeWhenThrownDisplay)
    setCustomMaterial(draft.material)
    setCustomWeight(
      Number.isInteger(draft.weightLbs)
        ? String(draft.weightLbs)
        : String(draft.weightLbs),
    )
    setCustomLength(
      draft.lengthFeet == null
        ? ''
        : Number.isInteger(draft.lengthFeet)
          ? String(draft.lengthFeet)
          : String(draft.lengthFeet),
    )
    setCustomDescription(draft.description)
    // Misc archetype: force empty W.P. (Joe ruling — for now).
    if (isCustomWeaponMiscellaneousCategoryLabel(draft.category)) {
      setCustomWpId('')
      setCustomWpEligible(false)
    } else {
      setCustomWpId(draft.linkedWpSkillId ?? '')
      setCustomWpEligible(draft.weaponProficiencyEligible)
    }
    setCustomThrowable(draft.throwable)
    setCustomTwoHanded(draft.twoHanded)
    setCustomAddsPsDamageBonus(draft.addsPsDamageBonus)
    setCustomRanged(false)
    requestAnimationFrame(() => {
      customEditorRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
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
    const strikeBonus = parseBonusField(customStrike) ?? 0
    const weightLbs = Number(customWeight)
    if (!Number.isFinite(weightLbs)) return

    const wpEntry =
      !miscCategoryNoWp && customWpEligible && customWpId
        ? getWeaponProficiencyCatalogEntryById(customWpId)
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

    const modifiers: Record<string, number> = {}
    const parryN = parseBonusField(customParry)
    if (parryN !== undefined && parryN !== 0) modifiers.parry = parryN
    const throwN = parseBonusField(customStrikeWhenThrown)
    if (throwN !== undefined && throwN !== 0) modifiers.throw = throwN

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
      throwable: customThrowable || undefined,
      twoHanded: customTwoHanded || undefined,
      weaponProficiencyEligible: miscCategoryNoWp ? false : customWpEligible,
      weaponSpecificModifiers:
        Object.keys(modifiers).length > 0 ? modifiers : undefined,
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
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <span className={theme.muted}>Category</span>
                <div ref={categorySelectRef} className="relative min-w-[14rem]">
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={categoryOpen}
                    aria-label="Weapon category"
                    onClick={() => setCategoryOpen((open) => !open)}
                    className={`flex w-full items-center justify-between gap-2 rounded-md border px-2 py-2 text-left text-sm ${
                      morphus
                        ? 'border-violet-700 bg-slate-900 text-violet-50'
                        : 'border-slate-300 bg-white text-slate-900'
                    }`}
                  >
                    <span>{catalogCategoryLabel}</span>
                    <span className="text-xs opacity-60" aria-hidden>
                      ▾
                    </span>
                  </button>
                  {categoryOpen ? (
                    <ul
                      role="listbox"
                      className={`absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border py-1 shadow-lg ${
                        morphus
                          ? 'border-violet-700 bg-slate-900 text-violet-50'
                          : 'border-slate-300 bg-white text-slate-900'
                      }`}
                    >
                      {[
                        { value: '', label: '— select category —' },
                        { value: 'All', label: 'All (search only)' },
                        ...catalogCategories.map((c) => ({
                          value: c.slug,
                          label: c.label,
                        })),
                      ].map((item) => (
                        <li key={item.value || '__empty'} role="option">
                          <button
                            type="button"
                            className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-100 ${
                              morphus ? 'hover:bg-violet-950' : ''
                            } ${
                              catalogCategory === item.value
                                ? morphus
                                  ? 'bg-violet-950'
                                  : 'bg-sky-50'
                                : ''
                            }`}
                            onClick={() => {
                              setCatalogCategory(item.value)
                              setCategoryOpen(false)
                              setSelectedCatalogId('')
                              setQualityVariantId('')
                            }}
                          >
                            <span>{item.label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </label>
              <input
                type="search"
                placeholder="Search Weapons…"
                value={catalogQuery}
                onChange={(e) => setCatalogQuery(e.target.value)}
                className={`min-w-[200px] flex-1 rounded-md border px-3 py-2 text-sm ${
                  morphus
                    ? 'border-violet-700 bg-slate-900 text-violet-50'
                    : 'border-slate-300 bg-white text-slate-900'
                }`}
                aria-label="Filter weapons by name"
              />
            </div>

            <div
              className={`mb-2 space-y-2 rounded-lg border p-3 ${
                morphus
                  ? 'border-violet-700/60 bg-slate-900/40'
                  : 'border-slate-300 bg-white/80'
              }`}
            >
              {catalogPopulated && catalogCategory !== '' && catalogCategory !== 'All' ? (
                <h4 className={`text-sm font-bold uppercase tracking-wide ${theme.th}`}>
                  {ancientWeaponCategoryLabel(catalogCategory)}
                </h4>
              ) : (
                <h4 className={`text-xs font-bold uppercase tracking-wide opacity-80 ${theme.th}`}>
                  Library
                </h4>
              )}

              {!catalogPopulated ? (
                <p className={`text-sm ${theme.muted}`}>
                  Select a category to browse weapons, or choose All and enter a search
                  term.
                </p>
              ) : filteredCatalog.length === 0 ? (
                <p className={`text-sm ${theme.muted}`}>No weapons match this filter.</p>
              ) : (
                <ul className="flex max-h-[480px] min-h-0 flex-col gap-2 overflow-y-auto text-sm">
                  {filteredCatalog.map((row) => {
                    const selected = selectedCatalogId === row.id
                    const statLine = formatAncientWeaponPickerStatLine(
                      row,
                      adapter.genreId,
                    )
                    const showCategoryChip =
                      catalogCategory === 'All' ||
                      ancientWeaponCategorySlugs(row.category).length > 1
                    return (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCatalogId(row.id)
                            setQualityVariantId('')
                          }}
                          className={`w-full rounded-md border p-2 text-left ${
                            selected
                              ? morphus
                                ? 'border-violet-400 bg-violet-800/60 text-violet-50'
                                : 'border-blue-400 bg-blue-50 text-blue-950'
                              : morphus
                                ? 'border-violet-700/50 bg-slate-950/40 hover:bg-violet-950/50'
                                : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="font-medium">{row.name}</span>
                            {showCategoryChip ? (
                              <span className={`text-xs ${theme.muted}`}>
                                {ancientWeaponCategoryLabel(row.category)}
                              </span>
                            ) : null}
                          </div>
                          {statLine ? (
                            <p className={`mt-1 font-mono text-xs opacity-80 ${theme.muted}`}>
                              {statLine}
                            </p>
                          ) : null}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

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
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={theme.btn}
                disabled={Boolean(blocked) || !selectedCatalog}
                onClick={addFromCatalog}
                title={blocked ?? undefined}
              >
                {adapter.kind === 'library'
                  ? 'Save catalog copy to library'
                  : 'Add from catalog'}
              </button>
              <button
                type="button"
                className={theme.btnGhost}
                disabled={!selectedCatalog}
                onClick={useAsBaseArchetype}
                title={
                  selectedCatalog
                    ? 'Fill the Custom weapon editor from this catalog row'
                    : 'Select a catalog weapon first'
                }
              >
                Use as base archetype
              </button>
            </div>
          </>
        )}
      </div>

      <div ref={customEditorRef} className={`mb-5 p-3 ${theme.dashedPanel}`}>
        <h3 className={`mb-3 text-[11px] font-black uppercase tracking-wider ${theme.th}`}>
          Custom weapon
        </h3>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
            Name
            <input
              className={`mt-0.5 font-mono text-sm ${theme.inputCls}`}
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
          </label>
          <div className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
            Linked W.P.
            <p
              className={`mt-0.5 rounded-md border px-2 py-2 font-mono text-sm font-normal normal-case ${
                morphus
                  ? 'border-violet-800 bg-slate-950/60 text-violet-100/80'
                  : 'border-slate-200 bg-slate-100 text-slate-600'
              }`}
              aria-live="polite"
            >
              {lockedWpLabel}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <h4 className={`mb-2 text-[10px] font-black uppercase tracking-wider ${theme.th}`}>
            Combat stats
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {(
              [
                ['Damage', customDamage, setCustomDamage],
                ['Strike', customStrike, setCustomStrike],
                ['Parry', customParry, setCustomParry],
                ['Entangle', customEntangle, setCustomEntangle],
                ['Disarm', customDisarm, setCustomDisarm],
                ['Range', customRange, setCustomRange],
                ['Rate of Fire', customRateOfFire, setCustomRateOfFire],
                [
                  'Strike when Thrown',
                  customStrikeWhenThrown,
                  setCustomStrikeWhenThrown,
                ],
              ] as const
            ).map(([label, value, setValue]) => (
              <label
                key={label}
                className={`block text-[10px] font-bold uppercase ${theme.muted}`}
              >
                {label}
                <input
                  className={`mt-0.5 w-full font-mono text-sm ${theme.inputCls}`}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <h4 className={`mb-2 text-[10px] font-black uppercase tracking-wider ${theme.th}`}>
            Other stats
          </h4>
          <div className="flex flex-wrap items-end gap-3">
            <label
              className={`block min-w-[8rem] flex-1 text-[10px] font-bold uppercase ${theme.muted}`}
            >
              Material
              <input
                className={`mt-0.5 font-mono text-sm ${theme.inputCls}`}
                value={customMaterial}
                onChange={(e) => setCustomMaterial(e.target.value)}
                placeholder="—"
              />
            </label>
            <label className={`block w-[5.5rem] text-[10px] font-bold uppercase ${theme.muted}`}>
              Weight ({weightUnitLabel})
              <input
                className={`mt-0.5 font-mono text-sm ${theme.inputCls}`}
                value={customWeight}
                onChange={(e) => setCustomWeight(e.target.value)}
                inputMode="decimal"
              />
            </label>
            <label className={`block w-[5.5rem] text-[10px] font-bold uppercase ${theme.muted}`}>
              Length ({lengthUnitLabel})
              <input
                className={`mt-0.5 font-mono text-sm ${theme.inputCls}`}
                value={customLength}
                onChange={(e) => setCustomLength(e.target.value)}
                inputMode="decimal"
                placeholder="—"
              />
            </label>
            <div className={`flex flex-wrap gap-x-4 gap-y-2 pb-2 text-xs ${theme.muted}`}>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={customThrowable}
                  onChange={(e) => setCustomThrowable(e.target.checked)}
                />
                Throwable
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={customTwoHanded}
                  onChange={(e) => setCustomTwoHanded(e.target.checked)}
                />
                Two-handed
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={customAddsPsDamageBonus}
                  onChange={(e) => setCustomAddsPsDamageBonus(e.target.checked)}
                />
                Adds PS Damage Bonus
              </label>
            </div>
          </div>
        </div>

        <label className={`mt-4 block text-[10px] font-bold uppercase ${theme.muted}`}>
          Description
          <textarea
            className={`mt-0.5 min-h-[4.5rem] font-mono text-sm ${theme.inputCls}`}
            value={customDescription}
            onChange={(e) => setCustomDescription(e.target.value)}
            placeholder="Catalog notes"
          />
        </label>
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
        <label className={`mt-3 flex items-center gap-2 text-xs ${theme.muted}`}>
          <input
            type="checkbox"
            checked={customRanged}
            onChange={(e) => setCustomRanged(e.target.checked)}
          />
          Ranged (magazine) — interim; not on Custom Weapon mock
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
