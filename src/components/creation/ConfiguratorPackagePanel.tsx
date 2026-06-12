import { useMemo } from 'react'
import type { PalladiumOcc, Race } from '../../types'
import { buildConfiguratorPackageSummary } from '../../lib/configuratorPackageSummary'
import { creationUsesOccSkillProgram } from '../../lib/shadowOcc'

function sectionTitleClass(sectionId: string, morphus: boolean): string {
  if (sectionId === 'race-heading' || sectionId.startsWith('race-')) {
    return morphus ? 'text-amber-300' : 'text-amber-950'
  }
  if (sectionId === 'occ-heading' || sectionId.startsWith('occ-')) {
    return morphus ? 'text-violet-400' : 'text-violet-700'
  }
  return morphus ? 'text-violet-200' : 'text-slate-800'
}

export function ConfiguratorPackagePanel({
  race,
  occ,
  specializationId,
  raceCanPickOcc,
  morphus,
  panelStyle,
}: {
  race: Race | undefined
  occ: PalladiumOcc | undefined
  specializationId: string | null | undefined
  raceCanPickOcc: boolean
  morphus: boolean
  panelStyle: string
}) {
  const summary = useMemo(
    () =>
      buildConfiguratorPackageSummary(race, occ, specializationId, {
        showOcc: creationUsesOccSkillProgram(race),
      }),
    [race, occ, specializationId],
  )

  const subStyle = morphus ? 'text-violet-200/90' : 'text-slate-700'

  return (
    <aside
      className={`flex min-h-0 w-full shrink-0 flex-col border-t pt-4 lg:max-h-full lg:w-80 lg:border-l lg:pl-4 lg:pt-0 xl:w-96 ${
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

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
          {summary.sections.length === 0 ? (
            <p className={`text-xs opacity-60 ${subStyle}`}>
              Select a race to preview its package.
            </p>
          ) : (
            summary.sections.map((section) => (
              <div key={section.id}>
                <p
                  className={`mb-1 text-sm font-bold ${sectionTitleClass(section.id, morphus)}`}
                >
                  {section.title}
                </p>
                <ul className="space-y-1">
                  {section.items.map((item, index) => (
                    <li
                      key={`${section.id}-${index}`}
                      className={`text-xs leading-snug ${subStyle}`}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  )
}
