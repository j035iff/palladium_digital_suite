import type { ForgeTabRequirement } from '../../lib/forgeNavigation/types'

const REQUIREMENTS_PER_COLUMN = 3
const MAX_REQUIREMENT_COLUMNS = 3

function chunkRequirements(
  requirements: readonly ForgeTabRequirement[],
): ForgeTabRequirement[][] {
  const columns: ForgeTabRequirement[][] = []
  for (
    let index = 0;
    index < requirements.length && columns.length < MAX_REQUIREMENT_COLUMNS;
    index += REQUIREMENTS_PER_COLUMN
  ) {
    columns.push(requirements.slice(index, index + REQUIREMENTS_PER_COLUMN))
  }
  return columns
}

function RequirementRow({
  req,
  morphus,
  tone,
}: {
  req: ForgeTabRequirement
  morphus: boolean
  tone: 'continue' | 'spawn'
}) {
  const unsatisfiedClass =
    tone === 'spawn'
      ? morphus
        ? 'font-medium text-amber-950'
        : 'font-medium text-amber-900'
      : morphus
        ? 'font-medium text-violet-950'
        : 'font-medium text-slate-900'

  const emptyBoxClass =
    tone === 'spawn'
      ? morphus
        ? 'border-amber-500 bg-white'
        : 'border-amber-500 bg-white'
      : morphus
        ? 'border-violet-400 bg-white'
        : 'border-slate-500 bg-white'

  return (
    <li className="flex items-start gap-2 text-xs leading-snug">
      <span
        className={`mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
          req.satisfied
            ? 'border-emerald-600 bg-emerald-600 text-[10px] font-bold text-white'
            : emptyBoxClass
        }`}
        aria-hidden
      >
        {req.satisfied ? '✓' : ''}
      </span>
      <span
        className={
          req.satisfied
            ? morphus
              ? 'font-medium text-emerald-800'
              : 'font-medium text-emerald-900'
            : unsatisfiedClass
        }
      >
        {req.label}
      </span>
    </li>
  )
}

export function ForgeTabRequirementsChecklist({
  requirements,
  morphus = false,
  tone = 'continue',
  heading,
}: {
  requirements: readonly ForgeTabRequirement[]
  morphus?: boolean
  tone?: 'continue' | 'spawn'
  heading?: string
}) {
  if (requirements.length === 0) return null

  const columns = chunkRequirements(requirements)
  const headingClass =
    tone === 'spawn'
      ? morphus
        ? 'text-amber-900'
        : 'text-amber-800'
      : morphus
        ? 'text-violet-900'
        : 'text-slate-600'

  return (
    <div className={heading ? 'mt-2' : ''}>
      {heading ? (
        <p
          className={`text-[10px] font-bold uppercase tracking-wide ${headingClass}`}
        >
          {heading}
        </p>
      ) : null}
      <div
        className={`flex flex-wrap items-start gap-x-6 gap-y-2 ${heading ? 'mt-1.5' : ''}`}
        role="group"
        aria-label={heading ?? 'Requirements'}
      >
        {columns.map((column, columnIndex) => (
          <ul
            key={`req-col-${columnIndex}`}
            className="min-w-[10.5rem] max-w-[16rem] flex-1 space-y-1"
            role="list"
          >
            {column.map((req) => (
              <RequirementRow
                key={req.id}
                req={req}
                morphus={morphus}
                tone={tone}
              />
            ))}
          </ul>
        ))}
      </div>
    </div>
  )
}
