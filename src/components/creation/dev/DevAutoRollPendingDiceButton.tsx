import { useCharacter } from '../../../context/CharacterContext'

export function DevAutoRollPendingDiceButton() {
  const { devAutoRollAllPendingDice } = useCharacter()

  if (!import.meta.env.DEV || !devAutoRollAllPendingDice) {
    return null
  }

  return (
    <div className="mb-4 rounded-lg border border-dashed border-amber-500/80 bg-amber-50/80 p-3 dark:bg-amber-950/30">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
        Dev only — not in production builds
      </p>
      <button
        type="button"
        onClick={() => devAutoRollAllPendingDice()}
        className="rounded-md border border-amber-600 bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-950 hover:bg-amber-200 dark:border-amber-500 dark:bg-amber-900/60 dark:text-amber-50 dark:hover:bg-amber-900"
      >
        Roll all pending dice fields
      </button>
    </div>
  )
}
