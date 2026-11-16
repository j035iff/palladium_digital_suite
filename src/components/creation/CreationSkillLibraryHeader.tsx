import {
  CREATION_CATEGORY_AVAILABILITY_KINDS,
  CREATION_CATEGORY_AVAILABILITY_LABELS,
  type CreationCategoryAvailabilityFilter,
  type CreationCategoryAvailabilityKind,
} from '../../lib/creationSkillCategoryAvailabilityFilter'

export type CreationSkillLibraryProgressChip = {
  key: string
  label: string
  used: number
  cap: number
  /** Optional tone class for the label (mirrors Selected skills section colors). */
  labelClassName?: string
}

export type CreationSkillLibraryVoucherFilterLane = {
  key: string
  label: string
  filter: CreationCategoryAvailabilityFilter
}

export type CreationSkillLibraryHeaderProps = {
  morphus: boolean
  progressChips: readonly CreationSkillLibraryProgressChip[]
  globalFilter: CreationCategoryAvailabilityFilter
  onGlobalFilterChange: (
    kind: CreationCategoryAvailabilityKind,
    enabled: boolean,
  ) => void
  voucherFilterLanes: readonly CreationSkillLibraryVoucherFilterLane[]
  onVoucherFilterChange: (
    laneKey: string,
    kind: CreationCategoryAvailabilityKind,
    enabled: boolean,
  ) => void
}

function AvailabilityCheckboxRow({
  idPrefix,
  morphus,
  filter,
  onChange,
  ariaLabelPrefix,
}: {
  idPrefix: string
  morphus: boolean
  filter: CreationCategoryAvailabilityFilter
  onChange: (kind: CreationCategoryAvailabilityKind, enabled: boolean) => void
  ariaLabelPrefix: string
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1"
      role="group"
      aria-label={`${ariaLabelPrefix} category availability`}
    >
      {CREATION_CATEGORY_AVAILABILITY_KINDS.map((kind) => {
        const id = `${idPrefix}-${kind}`
        return (
          <label
            key={kind}
            htmlFor={id}
            className={`inline-flex items-center gap-1.5 text-xs ${
              morphus ? 'text-violet-100' : 'text-slate-800'
            }`}
          >
            <input
              id={id}
              type="checkbox"
              checked={filter[kind]}
              onChange={(e) => onChange(kind, e.target.checked)}
              className="rounded border-slate-400"
            />
            <span>{CREATION_CATEGORY_AVAILABILITY_LABELS[kind]}</span>
          </label>
        )
      })}
    </div>
  )
}

export function CreationSkillLibraryHeader({
  morphus,
  progressChips,
  globalFilter,
  onGlobalFilterChange,
  voucherFilterLanes,
  onVoucherFilterChange,
}: CreationSkillLibraryHeaderProps) {
  return (
    <div className="mb-4 space-y-3">
      {progressChips.length > 0 ? (
        <div
          className="flex flex-wrap items-baseline gap-x-4 gap-y-1"
          aria-label="Skill selection progress"
        >
          {progressChips.map((chip) => (
            <p
              key={chip.key}
              className={`text-sm font-bold ${chip.labelClassName ?? ''}`}
            >
              {chip.label}{' '}
              <span className="tabular-nums font-bold">
                {chip.used}/{chip.cap}
              </span>
            </p>
          ))}
        </div>
      ) : null}

      <div className="space-y-1">
        <p
          className={`text-xs font-semibold uppercase tracking-wide opacity-70 ${
            morphus ? 'text-violet-200' : 'text-slate-600'
          }`}
        >
          Category availability
        </p>
        <AvailabilityCheckboxRow
          idPrefix="library-global-availability"
          morphus={morphus}
          filter={globalFilter}
          onChange={onGlobalFilterChange}
          ariaLabelPrefix="Library"
        />
      </div>

      {voucherFilterLanes.length > 0 ? (
        <div className="space-y-2">
          <p
            className={`text-xs font-semibold uppercase tracking-wide opacity-70 ${
              morphus ? 'text-violet-200' : 'text-slate-600'
            }`}
          >
            Voucher category filters
          </p>
          <ul className="space-y-2">
            {voucherFilterLanes.map((lane) => (
              <li key={lane.key} className="space-y-1">
                <p
                  className={`text-xs font-semibold ${
                    morphus ? 'text-amber-300' : 'text-amber-950'
                  }`}
                >
                  {lane.label}
                </p>
                <AvailabilityCheckboxRow
                  idPrefix={`voucher-availability-${lane.key}`}
                  morphus={morphus}
                  filter={lane.filter}
                  onChange={(kind, enabled) =>
                    onVoucherFilterChange(lane.key, kind, enabled)
                  }
                  ariaLabelPrefix={lane.label}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
