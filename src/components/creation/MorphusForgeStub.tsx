import { useCharacter } from '../../context/CharacterContext'
import { MORPHUS_FORGE_IMPLEMENTED } from '../../lib/morphusForgeStub'
import { PendingDiceResolutionPanel } from './PendingDiceResolutionPanel'
import { MorphusCustomTraitSlotsPanel } from './morphus/MorphusCustomTraitSlotsPanel'

/** Single-step trait Sub-Forge placeholder (forge-character_creation.md Traits tab). */
export function MorphusForgeStub() {
  const { character, setTraitForgeStubComplete } = useCharacter()
  const done = character.creationTraitForgeStubComplete === true
  const facadeReady = character.creationFacadeDiceFinalized === true

  return (
    <section aria-labelledby="forge-tab-page-heading">
      {!facadeReady ? (
        <p
          className="mb-4 rounded-lg border border-amber-500/60 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
          role="alert"
        >
          Complete all Facade dice on the <strong>Roll Pending</strong> tab before building
          Morphus.
        </p>
      ) : null}
      <p className="max-w-2xl text-sm text-violet-200/90">
        Full Morphus / trait generation will plug in here as a nested Sub-Forge.
        Enter Morphus vitality dice below, then acknowledge this placeholder — use{' '}
        <strong>Continue</strong> at the top right.
      </p>
      {facadeReady ? (
        <div className="mt-4 space-y-6">
          <PendingDiceResolutionPanel scope="morphus" />
          <MorphusCustomTraitSlotsPanel />
        </div>
      ) : null}
      {!MORPHUS_FORGE_IMPLEMENTED ? (
        <p className="mt-3 text-xs uppercase tracking-wide text-violet-400/80">
          Engine stub — no trait selections are captured in this build.
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => setTraitForgeStubComplete(true)}
        disabled={done}
        className="mt-4 rounded-lg border-2 border-violet-500 px-4 py-2 text-xs font-bold uppercase text-violet-100 hover:bg-violet-900/50 disabled:opacity-50"
      >
        {done ? 'Sub-forge step acknowledged' : 'Acknowledge trait forge placeholder'}
      </button>
    </section>
  )
}
