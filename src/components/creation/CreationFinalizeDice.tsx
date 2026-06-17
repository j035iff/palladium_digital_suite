import { useCharacter } from '../../context/CharacterContext'
import { DevAutoRollPendingDiceButton } from './dev/DevAutoRollPendingDiceButton'
import { PendingDiceResolutionPanel } from './PendingDiceResolutionPanel'

/** Roll Pending tab — facade (or single-form) physical dice only; Morphus is on Traits. */
export function CreationFinalizeDice() {
  const { supportsDualForm } = useCharacter()
  const scope = supportsDualForm ? 'primary' : 'all'

  return (
    <section aria-labelledby="forge-tab-page-heading">
      <p className="mb-4 max-w-3xl text-sm leading-snug text-slate-700 dark:text-slate-200">
        Roll your physical dice and enter every result below. Totals and the Live Ledger
        update as you type (Pillar 5 — physical dice first). Click{' '}
        <strong>Continue</strong> when every field is filled to lock these values in.
      </p>
      {supportsDualForm ? (
        <p className="mb-4 max-w-3xl text-sm leading-snug text-violet-200/90">
          Nightbane: only <strong>Facade</strong> rolls appear here. Morphus vitality,
          traits, and the Morphus creation forge are entirely on the <strong>Traits</strong>{' '}
          tab.
        </p>
      ) : null}

      <DevAutoRollPendingDiceButton />

      <PendingDiceResolutionPanel scope={scope} />
    </section>
  )
}
