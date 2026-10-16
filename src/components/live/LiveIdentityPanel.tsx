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
    morphusStanceType,
    setMorphusStanceType,
    morphusDerived,
  } = useCharacter()

  const morphusActive = supportsDualForm && activeForm === 'morphus'
  const stanceOptions = morphusDerived?.availableStanceTypes ?? []

  return (
    <section aria-label="Identity details" className="min-w-0">
      {morphusActive && stanceOptions.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-3">
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
              {stanceOptions.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>
        </div>
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
