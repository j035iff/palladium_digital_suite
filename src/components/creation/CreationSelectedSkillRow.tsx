import { useState, type ReactNode } from 'react'

export type CreationSelectedSkillRowProps = {
  label: ReactNode
  /** Amber warning when prerequisites are unmet. */
  warningTitle?: string
  grantSource?: string | null
  expandedDetail?: ReactNode
  /** Professional quality toggle (omit when unsupported). */
  professionalQuality?: {
    isProfessional: boolean
    disabled?: boolean
    disabledTitle?: string
    onToggle: () => void
  }
  /** Edit specialization / parameters (omit when not editable). */
  onEdit?: () => void
  /** Remove / Clear (omit when locked grant). */
  onRemove?: () => void
  removeLabel?: string
  surfaceClassName: string
  warningClassName?: string
}

function ActionSquare({
  label,
  title,
  className,
  disabled,
  onClick,
  children,
}: {
  label: string
  title: string
  className: string
  disabled?: boolean
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        onClick?.()
      }}
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-[11px] font-bold leading-none disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}

function PencilIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="currentColor"
    >
      <path d="M11.013 1.427a1.75 1.75 0 0 1 2.475 2.475L5.69 11.7a1.75 1.75 0 0 1-.79.437l-2.72.68a.5.5 0 0 1-.605-.605l.68-2.72c.07-.282.22-.54.437-.79l7.798-7.798Zm1.414 1.06a.25.25 0 0 0-.354 0L4.28 10.28a.25.25 0 0 0-.062.113l-.43 1.72 1.72-.43a.25.25 0 0 0 .113-.062l7.793-7.793a.25.25 0 0 0 0-.354l-.967-.967Z" />
    </svg>
  )
}

/**
 * Compact Selected skills row: name + L→R action squares on one line;
 * click the name to expand requirements / synergies.
 */
export function CreationSelectedSkillRow({
  label,
  warningTitle,
  grantSource,
  expandedDetail,
  professionalQuality,
  onEdit,
  onRemove,
  removeLabel = 'Remove',
  surfaceClassName,
  warningClassName = 'ml-1 text-red-800 dark:text-red-300',
}: CreationSelectedSkillRowProps) {
  const [expanded, setExpanded] = useState(false)
  const canExpand = Boolean(expandedDetail || grantSource)

  return (
    <li className={`rounded border px-2 py-1.5 text-sm ${surfaceClassName}`}>
      <div className="flex min-w-0 items-center gap-1.5">
        <button
          type="button"
          className="min-w-0 flex-1 truncate text-left font-bold text-slate-900 hover:underline dark:text-slate-100"
          aria-expanded={canExpand ? expanded : undefined}
          onClick={() => {
            if (!canExpand) return
            setExpanded((open) => !open)
          }}
          title={canExpand ? (expanded ? 'Hide details' : 'Show details') : undefined}
        >
          {label}
          {warningTitle ? (
            <span className={warningClassName} title={warningTitle}>
              {' '}
              ⚠
            </span>
          ) : null}
        </button>

        <div className="flex shrink-0 items-center gap-1">
          {professionalQuality ? (
            <ActionSquare
              label={
                professionalQuality.isProfessional
                  ? 'Professional quality'
                  : 'Standard quality'
              }
              title={
                professionalQuality.disabled
                  ? (professionalQuality.disabledTitle ??
                    'Not enough skill slots')
                  : professionalQuality.isProfessional
                    ? 'Professional'
                    : 'Standard quality'
              }
              disabled={professionalQuality.disabled}
              onClick={professionalQuality.onToggle}
              className={
                professionalQuality.isProfessional
                  ? 'border border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'border border-emerald-700 bg-emerald-500 text-white hover:bg-emerald-400'
              }
            >
              {professionalQuality.isProfessional ? 'P' : 'S'}
            </ActionSquare>
          ) : null}

          {onEdit ? (
            <ActionSquare
              label="Edit"
              title="Edit"
              onClick={onEdit}
              className="border border-sky-700 bg-sky-600 text-white hover:bg-sky-500"
            >
              <PencilIcon />
            </ActionSquare>
          ) : null}

          {onRemove ? (
            <ActionSquare
              label={removeLabel}
              title={removeLabel}
              onClick={onRemove}
              className="border border-rose-700 bg-rose-600 text-white hover:bg-rose-500"
            >
              ×
            </ActionSquare>
          ) : null}
        </div>
      </div>

      {expanded && canExpand ? (
        <div className="mt-1.5 min-w-0 break-words">
          {grantSource ? (
            <p className="text-xs italic text-slate-500">
              Provided by {grantSource}
            </p>
          ) : null}
          {expandedDetail}
        </div>
      ) : null}
    </li>
  )
}
