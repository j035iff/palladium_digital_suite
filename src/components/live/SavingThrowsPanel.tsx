import { useLayoutEffect, useRef, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { DEFENDER_WINS_TIES } from '../../lib/opposedRollRules'
import {
  buildLiveBonusesOverlay,
  formatLiveBonusesOverlayPrimary,
  type LiveBonusesOverlayCard,
} from '../../lib/liveBonusesOverlay'
import { clampOverlayTooltipPosition } from '../../lib/overlayTooltipPosition'
import {
  overlayPrimaryTone,
  type OverlayCardPrimary,
} from '../../lib/saveRollDisplay'

function primaryText(primary: OverlayCardPrimary): string {
  return formatLiveBonusesOverlayPrimary(primary)
}

function primaryClass(
  primary: OverlayCardPrimary,
  morphus: boolean,
): string {
  const tone = overlayPrimaryTone(primary)
  if (morphus) {
    if (tone === 'negative') return 'text-red-400'
    if (tone === 'neutral') return 'text-violet-100'
    return 'text-emerald-300'
  }
  if (tone === 'negative') return 'text-red-600'
  if (tone === 'neutral') return 'text-slate-900'
  return 'text-emerald-600'
}

function BonusOverlayCard({
  card,
  morphus,
}: {
  card: LiveBonusesOverlayCard
  morphus: boolean
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{
    top: number
    left: number
    maxWidth: number
  } | null>(null)

  useLayoutEffect(() => {
    if (!open) return
    const cardEl = cardRef.current
    const tipEl = tipRef.current
    if (!cardEl || !tipEl) return

    const place = () => {
      const dialog = cardEl.closest('[role="dialog"]')
      const bounds = dialog?.getBoundingClientRect() ?? null
      const tipRect = tipEl.getBoundingClientRect()
      const next = clampOverlayTooltipPosition(
        cardEl.getBoundingClientRect(),
        { width: tipRect.width || 352, height: tipRect.height || 48 },
        bounds,
      )
      setPos({ top: next.top, left: next.left, maxWidth: next.maxWidth })
    }

    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, card.tooltipEquation])

  const outline =
    card.outline === 'bonus'
      ? morphus
        ? 'border-violet-200/80 bg-violet-950/50'
        : 'border-slate-900 bg-white'
      : morphus
        ? 'border-sky-400/70 bg-violet-950/50'
        : 'border-sky-400 bg-white'

  const labelClass = morphus
    ? 'text-violet-200'
    : card.outline === 'bonus'
      ? 'text-slate-800'
      : 'text-slate-700'

  return (
    <div
      ref={cardRef}
      className={`relative flex min-h-[5.5rem] flex-col rounded-xl border-2 px-2 py-2 ${outline}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <p
        className={`text-center text-[10px] font-black uppercase leading-tight tracking-wide ${labelClass}`}
      >
        {card.label}
      </p>
      <p
        className={`mt-1 flex flex-1 items-center justify-center text-center font-mono text-2xl font-black tabular-nums sm:text-3xl ${primaryClass(card.primary, morphus)}`}
      >
        {primaryText(card.primary)}
      </p>
      {card.footnotes.length > 0 ? (
        <div
          className={`mt-auto space-y-0.5 text-center text-[10px] font-semibold leading-tight ${
            morphus ? 'text-violet-300/90' : 'text-slate-600'
          }`}
        >
          {card.footnotes.map((fn, i) => (
            <p key={`${card.id}-fn-${i}`}>
              {fn.label ? (
                <>
                  {fn.label}{' '}
                  <span className={morphus ? 'text-violet-100' : 'text-slate-800'}>
                    {fn.text}
                  </span>
                </>
              ) : (
                <span className={morphus ? 'text-violet-100' : 'text-slate-800'}>
                  {fn.text}
                </span>
              )}
            </p>
          ))}
        </div>
      ) : (
        <div className="mt-auto min-h-[0.75rem]" />
      )}
      {open ? (
        <div
          ref={tipRef}
          role="tooltip"
          className={`pointer-events-none fixed z-[60] max-h-48 overflow-y-auto rounded-md border-2 px-2 py-2 font-mono text-[10px] font-semibold leading-snug shadow-lg ${
            morphus
              ? 'border-indigo-600/90 bg-black/95 text-violet-50'
              : 'border-slate-400 bg-white text-slate-900'
          }`}
          style={{
            top: pos?.top ?? -9999,
            left: pos?.left ?? -9999,
            maxWidth: pos?.maxWidth ?? 352,
            visibility: pos ? 'visible' : 'hidden',
          }}
        >
          {card.tooltipEquation}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Bonuses overlay — attribute BONUSES (black) + SAVING THROWS (blue).
 * Math from {@link buildLiveBonusesOverlay}; UI stays presentation-only.
 */
export function SavingThrowsPanel() {
  const {
    character,
    activeForm,
    supportsDualForm,
    saveVsPsionicsTarget,
  } = useCharacter()
  const morphus = supportsDualForm && activeForm === 'morphus'

  const view = buildLiveBonusesOverlay(
    character,
    activeForm,
    saveVsPsionicsTarget,
    supportsDualForm,
  )

  return (
    <section aria-labelledby="bonuses-overlay-heading" className="space-y-6">
      <h2 id="bonuses-overlay-heading" className="sr-only">
        Bonuses and saving throws
      </h2>

      <div>
        <h3
          className="mb-2 text-sm font-black uppercase tracking-wide"
          style={{ color: morphus ? '#c4b5fd' : '#1e40af' }}
        >
          Bonuses
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {view.bonusCards.slice(0, 3).map((card) => (
            <BonusOverlayCard key={card.id} card={card} morphus={morphus} />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {view.bonusCards.slice(3).map((card) => (
            <BonusOverlayCard key={card.id} card={card} morphus={morphus} />
          ))}
        </div>
      </div>

      <div>
        <h3
          className="mb-2 text-sm font-black uppercase tracking-wide"
          style={{ color: morphus ? '#c4b5fd' : '#1e40af' }}
        >
          Saving Throws
        </h3>
        <p className={`mb-2 text-xs ${morphus ? 'text-violet-300/90' : 'text-slate-600'}`}>
          Active form only. Roll d20 and add the listed bonus. Targets marked varies are set by the
          GM at the table.
          {DEFENDER_WINS_TIES ? ' You win ties.' : ''}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {view.fixedSaveCards.map((card) => (
            <BonusOverlayCard key={card.id} card={card} morphus={morphus} />
          ))}
        </div>
        {view.extraSaveCards.length > 0 ? (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {view.extraSaveCards.map((card) => (
              <BonusOverlayCard key={card.id} card={card} morphus={morphus} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
