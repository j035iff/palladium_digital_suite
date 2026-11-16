import { useState, type ReactNode } from 'react'

import type {
  SkillPrerequisiteDisplayPart,
  SkillSynergyHint,
} from '../../lib/skillBlockDisplay'
import type { SkillPercentSummary } from '../../lib/skillCreationDisplay'
import { ClampedOverlayTooltip } from '../live/ClampedOverlayTooltip'
import { SkillSynergyLinkIcon } from './SkillSynergyLinkIcon'
import {
  SkillLibrarySynergyLines,
  SkillPrerequisiteMeta,
} from './SkillSelectionMeta'

const PERCENT_PART_CLASS: Record<
  SkillPercentSummary['parts'][number]['kind'],
  string
> = {
  base: 'text-slate-900 dark:text-slate-100',
  iq: 'text-sky-600 dark:text-sky-300',
  occ: 'text-emerald-700 dark:text-emerald-300',
  synergy: 'text-orange-600 dark:text-orange-300',
  penalty: 'text-rose-600 dark:text-rose-300',
}

export type CreationLibrarySkillRowProps = {
  skillName: string
  warningTitle?: string
  unmetPrerequisiteParts?: readonly SkillPrerequisiteDisplayPart[] | null
  hasAvailableSynergies?: boolean
  hasActiveSynergies?: boolean
  description: string
  descriptionIsPlaceholder?: boolean
  percentSummary?: SkillPercentSummary | null
  requiresParts?: readonly SkillPrerequisiteDisplayPart[] | null
  activeSynergyHints?: readonly SkillSynergyHint[]
  availableSynergyHints?: readonly SkillSynergyHint[]
  /** `formatPhysicalSkillBonusSummary` text; omit section when empty. */
  physicalBonusSummary?: string | null
  surfaceClassName: string
  morphus?: boolean
  /** Add buttons / status / sub-grant preview — always visible under the header. */
  children?: ReactNode
}

/**
 * Library browse row: compact unmet-prereq + synergy icons;
 * click name to expand DESCRIPTION panel (Joe mockup).
 */
export function CreationLibrarySkillRow({
  skillName,
  warningTitle,
  unmetPrerequisiteParts,
  hasAvailableSynergies = false,
  hasActiveSynergies = false,
  description,
  descriptionIsPlaceholder = false,
  percentSummary,
  requiresParts,
  activeSynergyHints = [],
  availableSynergyHints = [],
  physicalBonusSummary = null,
  surfaceClassName,
  morphus = false,
  children,
}: CreationLibrarySkillRowProps) {
  const [expanded, setExpanded] = useState(false)
  const unmet = unmetPrerequisiteParts ?? []
  const hasRequires = Boolean(requiresParts && requiresParts.length > 0)
  const hasSynergies =
    activeSynergyHints.length > 0 || availableSynergyHints.length > 0
  const hasPhysicalBonuses = Boolean(physicalBonusSummary?.trim())
  const showMetaSection = hasRequires || hasSynergies || hasPhysicalBonuses

  const percentTip =
    percentSummary && percentSummary.parts.length > 0 ? (
      <p className="font-mono leading-relaxed tabular-nums">
        {percentSummary.parts.map((part, index) => (
          <span key={`${part.kind}-${part.text}-${index}`}>
            {index > 0 ? ' ' : null}
            <span className={PERCENT_PART_CLASS[part.kind]}>{part.text}</span>
          </span>
        ))}
      </p>
    ) : null

  return (
    <li className={`rounded-md border p-2 ${surfaceClassName}`}>
      <div className="flex min-w-0 items-start gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          aria-expanded={expanded}
          title={expanded ? 'Hide description' : 'Show description'}
          onClick={() => setExpanded((open) => !open)}
        >
          <span className="inline font-medium text-slate-900 dark:text-slate-100">
            {skillName}
            {warningTitle ? (
              <span
                className="ml-1 text-red-800 dark:text-red-300"
                title={warningTitle}
              >
                ⚠
              </span>
            ) : null}
          </span>
          {unmet.length > 0 ? (
            <span className="ml-2 text-xs leading-snug">
              <SkillPrerequisiteMeta parts={unmet} inline />
            </span>
          ) : null}
        </button>

        {(hasAvailableSynergies || hasActiveSynergies) && (
          <div className="flex shrink-0 items-center gap-1 pt-0.5">
            {hasAvailableSynergies ? (
              <SkillSynergyLinkIcon status="available" />
            ) : null}
            {hasActiveSynergies ? (
              <SkillSynergyLinkIcon status="active" />
            ) : null}
          </div>
        )}
      </div>

      {expanded ? (
        <div className="mt-2 rounded-md border border-sky-400/80 bg-white p-2.5 dark:border-sky-600 dark:bg-slate-950">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-900 dark:text-slate-100">
              Description
            </p>
            {percentSummary ? (
              percentTip ? (
                <ClampedOverlayTooltip tip={percentTip} morphus={morphus}>
                  <span className="cursor-help text-right font-bold tabular-nums text-blue-700 dark:text-sky-300">
                    {percentSummary.total}%
                    <span className="ml-1 font-semibold text-blue-600 dark:text-sky-400">
                      +{percentSummary.perLevel}/lvl
                    </span>
                  </span>
                </ClampedOverlayTooltip>
              ) : (
                <span className="text-right font-bold tabular-nums text-blue-700 dark:text-sky-300">
                  {percentSummary.total}%
                  <span className="ml-1 font-semibold text-blue-600 dark:text-sky-400">
                    +{percentSummary.perLevel}/lvl
                  </span>
                </span>
              )
            ) : null}
          </div>

          <p
            className={`mt-1.5 text-xs leading-relaxed ${
              descriptionIsPlaceholder
                ? 'italic text-slate-500 dark:text-slate-400'
                : 'text-slate-800 dark:text-slate-200'
            }`}
          >
            {description}
          </p>

          {showMetaSection ? (
            <div className="mt-2 space-y-2 border-t border-slate-200 pt-2 dark:border-slate-700">
              {hasRequires && requiresParts ? (
                <SkillPrerequisiteMeta
                  parts={requiresParts}
                  className="mt-0 text-xs font-medium uppercase leading-snug tracking-wide text-slate-900 dark:text-slate-100"
                />
              ) : null}
              {hasSynergies ? (
                <SkillLibrarySynergyLines
                  active={activeSynergyHints}
                  available={availableSynergyHints}
                />
              ) : null}
              {hasPhysicalBonuses ? (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-900 dark:text-slate-100">
                    Physical bonuses
                  </p>
                  <p className="mt-0.5 text-xs font-semibold leading-snug text-slate-800 dark:text-slate-200">
                    {physicalBonusSummary}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {children}
    </li>
  )
}
