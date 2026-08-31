import { LAUNCHER_CREATE_OPTIONS, isGenreId } from '../../data/genres'
import type { CampaignForgeOptionDef } from '../../lib/gm/campaignForge'

export function CampaignForgeField({
  option,
  value,
  messages,
  onChange,
}: {
  option: CampaignForgeOptionDef
  value: string
  messages: string[]
  onChange: (value: string) => void
}) {
  const invalid = messages.length > 0 && value.trim().length > 0

  if (option.kind === 'text') {
    return (
      <label className="block">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {option.label}
        </span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid}
          className={`mt-1 w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm text-slate-100 ${
            invalid ? 'border-red-500' : 'border-slate-600'
          }`}
        />
        <span className="mt-1 block text-[11px] text-slate-500">{option.hint}</span>
        {messages.map((msg) => (
          <span key={msg} className="mt-1 block text-[11px] text-red-300">
            {msg}
          </span>
        ))}
      </label>
    )
  }

  if (option.kind === 'genreSelect') {
    return (
      <fieldset>
        <legend className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {option.label}
        </legend>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid}
          className={`mt-1 w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm text-slate-100 ${
            invalid ? 'border-red-500' : 'border-slate-600'
          }`}
        >
          <option value="">Select a setting</option>
          {LAUNCHER_CREATE_OPTIONS.map((opt) => {
            const disabled = !opt.playable || !isGenreId(opt.id)
            return (
              <option key={opt.id} value={opt.id} disabled={disabled}>
                {opt.label}
                {disabled ? ' (soon)' : ''}
              </option>
            )
          })}
        </select>
        <p className="mt-1 text-[11px] text-slate-500">{option.hint}</p>
        {messages.map((msg) => (
          <p key={msg} className="mt-1 text-[11px] text-red-300">
            {msg}
          </p>
        ))}
      </fieldset>
    )
  }

  if (option.kind === 'select') {
    const choices = option.choices ?? []
    const selected = choices.find((row) => row.value === value)
    return (
      <fieldset>
        <legend className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {option.label}
        </legend>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid}
          className={`mt-1 w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm text-slate-100 ${
            invalid ? 'border-red-500' : 'border-slate-600'
          }`}
        >
          <option value="">{option.emptyLabel ?? 'Select…'}</option>
          {choices.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-slate-500">
          {selected?.description ?? option.hint}
        </p>
        {messages.map((msg) => (
          <p key={msg} className="mt-1 text-[11px] text-red-300">
            {msg}
          </p>
        ))}
      </fieldset>
    )
  }

  const _exhaustive: never = option.kind
  return _exhaustive
}
