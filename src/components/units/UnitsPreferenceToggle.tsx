import { useUnitsPreference } from '../../lib/units'

type UnitsPreferenceToggleProps = {
  /** Visual tone for launcher (dark) vs sheet chrome (light/morphus). */
  tone?: 'launcher' | 'sheet' | 'morphus'
  className?: string
}

const TONE_CLASS: Record<NonNullable<UnitsPreferenceToggleProps['tone']>, string> = {
  launcher:
    'border-slate-600 bg-slate-900/80 text-slate-300 hover:border-cyan-400/70 hover:text-cyan-100',
  sheet:
    'border-slate-300 bg-white/80 text-slate-700 hover:border-blue-500 hover:text-blue-800',
  morphus:
    'border-violet-500/50 bg-violet-950/60 text-violet-100 hover:border-violet-300 hover:text-white',
}

/**
 * App-wide Standard ↔ Metric toggle (local to this device/user).
 * Persists in localStorage — not part of character saves or host session state.
 */
export function UnitsPreferenceToggle({
  tone = 'launcher',
  className = '',
}: UnitsPreferenceToggleProps) {
  const { measurementSystem, setMeasurementSystem } = useUnitsPreference()

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-lg border px-1.5 py-1 ${TONE_CLASS[tone]} ${className}`}
      role="group"
      aria-label="Measurement units"
    >
      <span className="px-1 text-[9px] font-bold uppercase tracking-wider opacity-70">
        Units
      </span>
      <button
        type="button"
        onClick={() => setMeasurementSystem('standard')}
        aria-pressed={measurementSystem === 'standard'}
        className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide transition ${
          measurementSystem === 'standard'
            ? tone === 'launcher'
              ? 'bg-cyan-500/25 text-cyan-100'
              : tone === 'morphus'
                ? 'bg-violet-500/40 text-white'
                : 'bg-blue-600 text-white'
            : 'opacity-60 hover:opacity-100'
        }`}
      >
        Standard
      </button>
      <button
        type="button"
        onClick={() => setMeasurementSystem('metric')}
        aria-pressed={measurementSystem === 'metric'}
        className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide transition ${
          measurementSystem === 'metric'
            ? tone === 'launcher'
              ? 'bg-cyan-500/25 text-cyan-100'
              : tone === 'morphus'
                ? 'bg-violet-500/40 text-white'
                : 'bg-blue-600 text-white'
            : 'opacity-60 hover:opacity-100'
        }`}
      >
        Metric
      </button>
    </div>
  )
}
