import type { SkillSynergyStatus } from '../../lib/skillBlockDisplay'

const STATUS_CLASS: Record<SkillSynergyStatus, string> = {
  available:
    'border-orange-500 text-orange-600 dark:border-orange-400 dark:text-orange-300',
  active:
    'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300',
}

const STATUS_TITLE: Record<SkillSynergyStatus, string> = {
  available: 'Synergies Available',
  active: 'Synergies Active',
}

/** Circular interlocking-links glyph for Tab 4 library synergy status. */
export function SkillSynergyLinkIcon({
  status,
  className = '',
}: {
  status: SkillSynergyStatus
  className?: string
}) {
  return (
    <span
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${STATUS_CLASS[status]} ${className}`}
      title={STATUS_TITLE[status]}
      aria-label={STATUS_TITLE[status]}
      role="img"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      >
        {/* Two interlocking horizontal oval links */}
        <ellipse cx="5.5" cy="8" rx="3.2" ry="2.1" />
        <ellipse cx="10.5" cy="8" rx="3.2" ry="2.1" />
      </svg>
    </span>
  )
}
