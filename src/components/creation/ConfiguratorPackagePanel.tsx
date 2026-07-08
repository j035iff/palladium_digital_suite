import { useMemo } from 'react'
import type { PalladiumOcc, Race } from '../../types'
import {
  buildConfiguratorPackageSummary,
  type ConfiguratorPackageItem,
  type ConfiguratorPackageSection,
} from '../../lib/configuratorPackageSummary'
import { creationUsesOccSkillProgram } from '../../lib/shadowOcc'

type PackageGroup = {
  packageLabel: string
  selectionName: string
  tone: 'race' | 'occ'
  sections: ConfiguratorPackageSection[]
}

function stripOccPackageSuffix(name: string): string {
  return name.replace(/\s+(P\.C\.C\.|O\.C\.C\.|R\.C\.C\.)\s*$/i, '').trim() || name
}

function occPackageSelectionLabel(
  occ: PalladiumOcc,
  specializationId: string | null | undefined,
): string {
  const spec = occ.specializations?.find((entry) => entry.id === specializationId)
  if (spec?.name) return stripOccPackageSuffix(spec.name)
  return stripOccPackageSuffix(occ.name)
}

function splitPackageGroups(
  sections: readonly ConfiguratorPackageSection[],
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
): PackageGroup[] {
  const groups: PackageGroup[] = []

  const raceBlock = sections.filter(
    (section) => section.id === 'race-heading' || section.id.startsWith('race-'),
  )
  if (raceBlock.length > 0) {
    const heading = raceBlock.find((section) => section.id === 'race-heading')
    groups.push({
      packageLabel: 'Racial package',
      selectionName: heading?.title ?? '',
      tone: 'race',
      sections: raceBlock.filter((section) => section.id !== 'race-heading'),
    })
  }

  const occBlock = sections.filter(
    (section) => section.id === 'occ-heading' || section.id.startsWith('occ-'),
  )
  if (occBlock.length > 0 && occ) {
    groups.push({
      packageLabel: 'O.C.C. package',
      selectionName: occPackageSelectionLabel(occ, specializationId),
      tone: 'occ',
      sections: occBlock.filter((section) => section.id !== 'occ-heading'),
    })
  }

  return groups
}

function categoryTitleClass(tone: 'race' | 'occ', morphus: boolean): string {
  if (tone === 'race') {
    return morphus ? 'text-amber-300' : 'text-amber-950'
  }
  return morphus ? 'text-violet-300' : 'text-violet-800'
}

function selectionTitleClass(tone: 'race' | 'occ', morphus: boolean): string {
  if (tone === 'race') {
    return morphus ? 'text-amber-200' : 'text-amber-900'
  }
  return morphus ? 'text-violet-200' : 'text-violet-700'
}

function PackageDetailLine({
  item,
  morphus,
  itemStyle,
}: {
  item: ConfiguratorPackageItem
  morphus: boolean
  itemStyle: string
}) {
  const emphasis = morphus ? 'text-slate-100' : 'text-slate-900'

  if (typeof item === 'string') {
    return <li className={`text-xs leading-snug ${itemStyle}`}>{item}</li>
  }

  switch (item.kind) {
    case 'lane':
      return <li className={`text-xs leading-snug ${itemStyle}`}>{item.label}</li>
    case 'subheading':
      return (
        <li className={`mt-1 text-xs font-bold leading-snug ${emphasis}`}>{item.text}</li>
      )
    case 'choice':
      return (
        <li className={`pl-3 text-xs leading-snug ${itemStyle}`}>
          <span className={`font-bold ${emphasis}`}>Choice of: </span>
          {item.detail}
        </li>
      )
    case 'text':
      return <li className={`text-xs leading-snug ${itemStyle}`}>{item.text}</li>
    default:
      return null
  }
}

function PackageGroupBlock({
  group,
  morphus,
  itemStyle,
}: {
  group: PackageGroup
  morphus: boolean
  itemStyle: string
}) {
  return (
    <section aria-label={group.packageLabel}>
      <h4
        className={`text-center text-sm font-bold uppercase tracking-wide ${
          morphus ? 'text-slate-100' : 'text-slate-900'
        }`}
      >
        {group.packageLabel}
      </h4>
      <p
        className={`mt-1 text-center text-sm font-bold uppercase tracking-wide ${selectionTitleClass(group.tone, morphus)}`}
      >
        {group.selectionName.toUpperCase()}
      </p>

      <div className="mt-4 space-y-4">
        {group.sections.map((section) => (
          <div key={section.id}>
            <p
              className={`mb-1 text-sm font-bold ${categoryTitleClass(group.tone, morphus)}`}
            >
              {section.title}
            </p>
            <ul className="space-y-1">
              {section.items.map((item, index) => (
                <PackageDetailLine
                  key={`${section.id}-${index}`}
                  item={item}
                  morphus={morphus}
                  itemStyle={itemStyle}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

export function ConfiguratorPackagePanel({
  race,
  occ,
  specializationId,
  morphus,
  panelStyle,
  placement = 'left',
}: {
  race: Race | undefined
  occ: PalladiumOcc | undefined
  specializationId: string | null | undefined
  morphus: boolean
  panelStyle: string
  placement?: 'left' | 'right'
}) {
  const summary = useMemo(
    () =>
      buildConfiguratorPackageSummary(race, occ, specializationId, {
        showOcc: creationUsesOccSkillProgram(race),
      }),
    [race, occ, specializationId],
  )

  const packageGroups = useMemo(
    () => splitPackageGroups(summary.sections, occ, specializationId),
    [summary.sections, occ, specializationId],
  )

  const subStyle = morphus ? 'text-violet-200/90' : 'text-slate-600'
  const dividerClass = morphus ? 'border-violet-500' : 'border-slate-900'

  const edgeBorder =
    placement === 'left'
      ? 'lg:border-r lg:pr-4'
      : 'lg:border-l lg:pl-4'

  return (
    <aside
      className={`flex min-h-0 w-full shrink-0 flex-col border-t pt-4 lg:max-h-full lg:w-80 lg:border-t-0 lg:pt-0 xl:w-96 ${edgeBorder} ${
        morphus ? 'border-violet-800' : 'border-slate-200 dark:border-slate-700'
      }`}
      aria-label="Race and O.C.C. package details"
    >
      <div
        className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border ${panelStyle}`}
      >
        <div
          className={`shrink-0 border-b px-3 py-2 ${
            morphus ? 'border-violet-800' : 'border-slate-200 dark:border-slate-700'
          }`}
        >
          <h3 className="text-xs font-bold uppercase tracking-wide opacity-80">
            Package details
          </h3>
          <p className={`mt-1 text-[11px] leading-snug opacity-75 ${subStyle}`}>
            Racial and O.C.C. abilities, skills, and supernatural picks for your
            current selections.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
          {packageGroups.length === 0 ? (
            <p className={`text-xs opacity-60 ${subStyle}`}>
              Select a race to preview its package.
            </p>
          ) : (
            <div className="space-y-4">
              {packageGroups.map((group, index) => (
                <div key={group.packageLabel}>
                  <PackageGroupBlock
                    group={group}
                    morphus={morphus}
                    itemStyle={subStyle}
                  />
                  {index < packageGroups.length - 1 ? (
                    <hr
                      className={`mt-4 border-0 border-t-4 ${dividerClass}`}
                      aria-hidden
                    />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
