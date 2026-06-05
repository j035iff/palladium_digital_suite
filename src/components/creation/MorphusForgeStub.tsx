import { useCharacter } from '../../context/CharacterContext'
import { MORPHUS_FORGE_IMPLEMENTED } from '../../lib/morphusForgeStub'

/** Single-step trait Sub-Forge placeholder (forge-character_creation.md Tab 5). */
export function MorphusForgeStub() {
  const { character, setTraitForgeStubComplete } = useCharacter()
  const done = character.creationTraitForgeStubComplete === true

  return (
    <section aria-labelledby="forge-tab-page-heading">
      <p className="max-w-2xl text-sm text-violet-200/90">
        Full Morphus / trait generation will plug in here as a nested Sub-Forge.
        For now, acknowledge this placeholder so Tab 5 can validate — then use{' '}
        <strong>Continue</strong> at the top right.
      </p>
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
