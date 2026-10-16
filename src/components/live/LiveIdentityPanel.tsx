import { useCharacter } from '../../context/CharacterContext'
import { IdentityHeader } from '../layout/IdentityHeader'

/**
 * Identity overlay body — same expand content that used to open under the
 * Persistent Core strip (Unified Path: reuse IdentityHeader details, no fork).
 * Nightbane dual identity stays form-aware via active form on the shared pipeline.
 */
export function LiveIdentityPanel() {
  const {
    creationGenreId,
    hostGenreId,
    supportsDualForm,
    activeForm,
    morphusSurfaceType,
    setMorphusSurfaceType,
    morphusStanceType,
    setMorphusStanceType,
    morphusDerived,
    morphusRelativeArShift,
    morphusNaturalAr,
  } = useCharacter()

  const morphusActive = supportsDualForm && activeForm === 'morphus'

  return (
    <section aria-label="Identity details" className="min-w-0">
      {morphusActive ? (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-violet-300/90">
            Surface
            <select
              value={morphusSurfaceType}
              onChange={(e) =>
                setMorphusSurfaceType(
                  e.target.value as 'hard_flat' | 'rough_uneven' | 'soft_fluid',
                )
              }
              className="rounded border border-violet-700 bg-slate-950 px-2 py-0.5 font-mono normal-case text-violet-100"
            >
              <option value="hard_flat">Hard / flat</option>
              <option value="rough_uneven">Rough / uneven</option>
              <option value="soft_fluid">Soft / fluid</option>
            </select>
          </label>
          {(morphusDerived?.availableStanceTypes.length ?? 0) > 0 ? (
            <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-violet-300/90">
              Stance
              <select
                value={morphusStanceType}
                onChange={(e) =>
                  setMorphusStanceType(
                    e.target.value as typeof morphusStanceType,
                  )
                }
                className="rounded border border-violet-700 bg-slate-950 px-2 py-0.5 font-mono normal-case text-violet-100"
              >
                {(morphusDerived?.availableStanceTypes ?? []).map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}
      {morphusActive &&
      (morphusRelativeArShift !== 0 || morphusNaturalAr != null) ? (
        <p
          className="mb-3 font-mono text-[10px] uppercase tracking-wide opacity-70"
          style={{ color: '#94a3b8' }}
        >
          {morphusRelativeArShift !== 0
            ? `Morphus A.R. ${morphusRelativeArShift >= 0 ? '+' : ''}${morphusRelativeArShift}`
            : ''}
          {morphusRelativeArShift !== 0 && morphusNaturalAr != null ? ' · ' : ''}
          {morphusNaturalAr != null ? `natural A.R. ${morphusNaturalAr}` : ''}
        </p>
      ) : null}
      <IdentityHeader
        morphusActive={morphusActive}
        creationGenreId={creationGenreId}
        hostGenreId={hostGenreId}
        collapsed={false}
        onCollapsedChange={() => {
          /* Identity tab always shows full details — collapse lives on the strip. */
        }}
        showExpandToggle={false}
      />
    </section>
  )
}
