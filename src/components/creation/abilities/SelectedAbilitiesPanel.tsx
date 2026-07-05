import { useMemo } from 'react'
import {
  getAbilityById,
  type AbilityCategory,
} from '../../../data/abilityLibrary'
import {
  formatMagicPpeCost,
  formatPsionicIspCost,
  getPalladiumMagicSpellById,
  getPalladiumPsionicById,
} from '../../../data/library/registry'
import { magicSchoolFilterLabel } from '../../../lib/magicSchoolLabels'
import { useCharacter } from '../../../context/CharacterContext'
import { psionicCategoryTags } from '../../../lib/supernaturalAbilityDisplay'
import {
  listOccEnginePerCategoryBuckets,
  occEngineHasPerCategoryPsionicPlan,
} from '../../../lib/occSupernaturalSelection'
import {
  isOccGrantedAbility,
  occSupernaturalGrantedAbilityIds,
} from '../../../lib/occSupernaturalGrants'
import { OccPsionicBucketGroupPanel } from './OccPsionicBucketGroupPanel'

const GROUP_ORDER: readonly AbilityCategory[] = ['Spell', 'Psionic', 'Talent']

const GROUP_LABELS: Record<AbilityCategory, string> = {
  Spell: 'Magic powers',
  Psionic: 'Psionic powers',
  Talent: 'Talents',
}

type SelectedAbilitiesPanelProps = {
  morphus: boolean
  genreId: string
  isNightbane: boolean
}

export function SelectedAbilitiesPanel({
  morphus,
  genreId,
  isNightbane,
}: SelectedAbilitiesPanelProps) {
  const { character, activeOcc, removeSelectedAbility } = useCharacter()
  const selectedIds = useMemo(
    () => character.selectedAbilities ?? [],
    [character.selectedAbilities],
  )
  const grantedIds = useMemo(
    () =>
      occSupernaturalGrantedAbilityIds(activeOcc, character.occSpecializationId),
    [activeOcc, character.occSpecializationId],
  )
  const perCategoryBuckets = useMemo(() => {
    if (!occEngineHasPerCategoryPsionicPlan(activeOcc)) return []
    return listOccEnginePerCategoryBuckets(
      activeOcc,
      selectedIds,
      genreId,
      grantedIds,
    )
  }, [activeOcc, selectedIds, genreId, grantedIds])

  const bucketPickIds = useMemo(
    () => new Set(perCategoryBuckets.flatMap((bucket) => bucket.pickIds)),
    [perCategoryBuckets],
  )

  const groupedSelections = useMemo(() => {
    const buckets: Record<AbilityCategory, string[]> = {
      Spell: [],
      Psionic: [],
      Talent: [],
    }
    for (const id of selectedIds) {
      const ability = getAbilityById(id)
      if (!ability) continue
      if (
        ability.category === 'Psionic' &&
        perCategoryBuckets.length > 0 &&
        (isOccGrantedAbility(id, grantedIds) || bucketPickIds.has(id))
      ) {
        continue
      }
      buckets[ability.category].push(id)
    }
    return GROUP_ORDER.filter((category) => buckets[category].length > 0).map(
      (category) => ({
        category,
        label: GROUP_LABELS[category],
        ids: buckets[category],
      }),
    )
  }, [selectedIds, perCategoryBuckets, grantedIds, bucketPickIds])

  const grantedPsionicIds = useMemo(
    () =>
      selectedIds.filter(
        (id) =>
          getAbilityById(id)?.category === 'Psionic' &&
          isOccGrantedAbility(id, grantedIds),
      ),
    [selectedIds, grantedIds],
  )

  const panelStyle = morphus
    ? 'border-violet-700 bg-slate-950/80 text-violet-50'
    : 'border-blue-200 bg-white text-slate-900'

  const renderPsionicRow = (id: string) => {
    const a = getAbilityById(id)
    const catalog = getPalladiumPsionicById(id)
    if (!a) {
      return (
        <div className="rounded border border-rose-800/50 p-2 text-xs text-rose-300">
          Unknown id: {id}{' '}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => removeSelectedAbility(id)}
          >
            Remove
          </button>
        </div>
      )
    }

    const metaParts: string[] = []
    if (catalog) {
      metaParts.push(psionicCategoryTags(catalog, genreId, '', true))
      metaParts.push(formatPsionicIspCost(catalog, genreId))
    }

    const granted = isOccGrantedAbility(id, grantedIds)

    return (
      <div
        className={`rounded-lg border p-2 text-sm ${
          morphus
            ? 'border-violet-700 bg-slate-900/80'
            : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-bold leading-snug">{a.name}</p>
            {metaParts.length > 0 ? (
              <p className="mt-0.5 text-[11px] leading-snug opacity-60">
                {metaParts.join(' · ')}
              </p>
            ) : null}
            {granted ? (
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide opacity-60">
                Granted at 1st level
              </p>
            ) : null}
          </div>
          {!granted ? (
            <button
              type="button"
              onClick={() => removeSelectedAbility(id)}
              className="shrink-0 text-[11px] text-rose-500 underline"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <aside
      className={`flex min-h-0 w-full shrink-0 flex-col border-t pt-4 lg:w-64 lg:border-l lg:pl-4 lg:pt-0 xl:w-72 ${
        morphus
          ? 'border-violet-800'
          : 'border-slate-200 dark:border-slate-700'
      }`}
      aria-label="Selected powers panel"
    >
      <div
        className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border ${panelStyle}`}
      >
        <div
          className={`shrink-0 border-b px-3 py-2 ${
            morphus ? 'border-violet-800' : 'border-slate-200'
          }`}
        >
          <h3 className="text-xs font-bold uppercase tracking-wide opacity-80">
            Selected powers
          </h3>
          <p className="mt-1 text-[11px] leading-snug opacity-70">
            Selections persist across Magic, Psionics, and Talents — switch forge
            tabs freely until budgets are filled.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
          {selectedIds.length === 0 ? (
            <p className="text-sm opacity-60">Nothing selected yet.</p>
          ) : (
            <div className="space-y-4">
              {groupedSelections.map((group) => (
                <section key={group.category} aria-label={group.label}>
                  <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide opacity-70">
                    {group.label}
                  </h4>
                  <ul className="space-y-2">
                    {group.ids.map((id) => {
                      const a = getAbilityById(id)
                      const catalog = getPalladiumPsionicById(id)
                      if (!a) {
                        return (
                          <li
                            key={id}
                            className="rounded border border-rose-800/50 p-2 text-xs text-rose-300"
                          >
                            Unknown id: {id}{' '}
                            <button
                              type="button"
                              className="ml-2 underline"
                              onClick={() => removeSelectedAbility(id)}
                            >
                              Remove
                            </button>
                          </li>
                        )
                      }

                      const spellCatalog = getPalladiumMagicSpellById(id)
                      const metaParts: string[] = []
                      if (a.category === 'Spell') {
                        if (spellCatalog) {
                          metaParts.push(
                            magicSchoolFilterLabel(genreId, spellCatalog.school),
                          )
                        } else {
                          metaParts.push('Magic')
                        }
                        if (a.spellLevel != null) {
                          metaParts.push(`Level ${a.spellLevel}`)
                        }
                        if (spellCatalog) {
                          metaParts.push(formatMagicPpeCost(spellCatalog))
                        }
                      } else if (a.category === 'Psionic' && catalog) {
                        metaParts.push(
                          psionicCategoryTags(catalog, genreId, '', true),
                        )
                        metaParts.push(formatPsionicIspCost(catalog, genreId))
                      } else if (a.category === 'Talent') {
                        metaParts.push('Talent')
                      }

                      return (
                        <li
                          key={id}
                          className={`rounded-lg border p-2 text-sm ${
                            morphus
                              ? 'border-violet-700 bg-slate-900/80'
                              : 'border-slate-200 bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-bold leading-snug">{a.name}</p>
                              {metaParts.length > 0 ? (
                                <p className="mt-0.5 text-[11px] leading-snug opacity-60">
                                  {metaParts.join(' · ')}
                                </p>
                              ) : null}
                              {a.category === 'Talent' && isNightbane ? (
                                <p
                                  className={`mt-1 text-[11px] ${
                                    morphus ? 'text-amber-200/90' : 'text-amber-900'
                                  }`}
                                >
                                  P.P.E. {a.ppeCost ?? '—'} ·{' '}
                                  {a.activationCost ?? '—'}
                                </p>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSelectedAbility(id)}
                              className="shrink-0 text-[11px] text-rose-500 underline"
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}

              {perCategoryBuckets.length > 0 ? (
                <section aria-label="Psionic category picks">
                  <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide opacity-70">
                    Psionic picks
                  </h4>
                  <ul className="space-y-2">
                    {perCategoryBuckets.map((bucket) => (
                      <OccPsionicBucketGroupPanel
                        key={`${bucket.planIndex}-${bucket.pool}`}
                        bucket={bucket}
                        morphus={morphus}
                        renderPsionicRow={renderPsionicRow}
                      />
                    ))}
                  </ul>
                </section>
              ) : null}

              {grantedPsionicIds.length > 0 ? (
                <section aria-label="Granted psionic powers">
                  <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide opacity-70">
                    Granted psionics
                  </h4>
                  <ul className="space-y-2">
                    {grantedPsionicIds.map((id) => (
                      <li key={id}>{renderPsionicRow(id)}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
