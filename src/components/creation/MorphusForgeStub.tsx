import { MORPHUS_FORGE_IMPLEMENTED } from '../../lib/morphusForgeStub'

/** Skip-through placeholder until the Morphus Forge subsystem ships. */
export function MorphusForgeStub() {
  return (
    <section aria-labelledby="morphus-phase-heading">
      <h2
        id="morphus-phase-heading"
        className="mb-2 text-sm font-semibold uppercase tracking-wide text-violet-300"
      >
        Phase II.5: Morphus Forge
      </h2>
      <p className="max-w-2xl text-sm text-violet-200/90">
        Morphus generation is not built yet — resolve your table&apos;s Morphus picks offline
        for now, then tap <strong>Continue</strong> to proceed. The dedicated forge UI and table
        engine will plug in here later.
      </p>
      {!MORPHUS_FORGE_IMPLEMENTED ? (
        <p className="mt-3 text-xs uppercase tracking-wide text-violet-400/80">
          Engine stub — no Morphus selections are captured in this build.
        </p>
      ) : null}
    </section>
  )
}
