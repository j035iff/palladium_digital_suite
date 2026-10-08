import { useState, useEffect, useRef } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { ConfiguratorAlignmentSelect } from '../creation/ConfiguratorAlignmentSelect'
import { CREATION_PLACEHOLDER_OCC } from '../../lib/characterRoot'
import {
  configuratorAlignmentLabel,
  effectiveConfiguratorAlignment,
} from '../../lib/configuratorMatrix'
import {
  CHARACTER_NAME_PLACEHOLDER,
  creationForgeDisplayName,
  identityHeightFeetError,
  identityHeightInchesError,
  identityWeightLbsError,
  isLegacyCreationNameValue,
  normalizeIdentityProfile,
  sanitizeIdentityHeightInchesInput,
} from '../../lib/characterIdentity'
import { normalizeAliases } from '../../lib/characterAliases'
import {
  identityHeightFromMetricDisplay,
  identityHeightMetricDisplayError,
  identityHeightMetricUnitLabel,
  identityHeightToDisplay,
  identityWeightDisplayError,
  identityWeightFromDisplay,
  identityWeightToDisplay,
  identityWeightUnitLabel,
  useUnitsPreference,
} from '../../lib/units'
import {
  creationForgeDetailsButtonClass,
  creationForgeSummaryNameSizeClass,
} from '../creation/creationForgeHeaderTheme'
import {
  CreationForgeDetailsGrid,
} from '../creation/CreationForgeSettingCell'
import { getOccSpecialization } from '../../lib/occComposition'
import type { CharacterIdentityProfile, PalladiumOcc } from '../../types'

type IdentityHeaderProps = {
  morphusActive: boolean
  creationGenreId: string
  hostGenreId: string
  /** 'header' = sticky live-sheet chrome; 'creation' = forge global header above tabs. */
  variant?: 'header' | 'creation'
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  /**
   * When false, Expand/Minimize is owned by the Persistent Core utility cluster
   * (mockup fidelity — sits with Save / Portal). Default true.
   */
  showExpandToggle?: boolean
  /**
   * Creation only: short-viewport chrome — auto-collapse identity and use
   * tighter summary typography. Expand remains available.
   */
  compactChrome?: boolean
}

function identityToggleButtonClass(morphusActive: boolean): string {
  return morphusActive
    ? 'shrink-0 rounded-md border-2 border-violet-300 bg-violet-800 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-white hover:bg-violet-700'
    : 'shrink-0 rounded-md border-2 border-blue-600 bg-blue-600 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-white hover:bg-blue-500'
}

function identitySummarySeparatorClass(morphusActive: boolean): string {
  return morphusActive ? 'text-violet-400/60' : 'text-slate-400'
}

function identityFieldClass(morphusActive: boolean): string {
  return morphusActive
    ? 'border-violet-500/40 bg-transparent text-violet-50 placeholder:text-violet-300/40 focus:border-violet-400'
    : 'border-slate-300 bg-transparent text-slate-900 placeholder:text-slate-400 focus:border-blue-600'
}

function identityInvalidFieldClass(morphusActive: boolean): string {
  return morphusActive
    ? 'border-rose-400 text-rose-200'
    : 'border-rose-500 text-rose-700'
}

function IdentityFieldError({
  id,
  message,
  morphusActive,
}: {
  id: string
  message: string
  morphusActive: boolean
}) {
  return (
    <span
      id={id}
      className={`mt-0.5 block text-[10px] font-medium ${
        morphusActive ? 'text-rose-300' : 'text-rose-600'
      }`}
    >
      {message}
    </span>
  )
}

function identityLabelClass(morphusActive: boolean): string {
  return morphusActive
    ? 'text-[10px] font-semibold uppercase tracking-wider text-violet-300/80'
    : 'text-[10px] font-semibold uppercase tracking-wider text-slate-500'
}

function IdentityProfileDetailFields({
  profile,
  patch,
  morphusActive,
  heightFeetError,
  heightInchesError,
  weightLbsError,
  layout = 'grid',
}: {
  profile: CharacterIdentityProfile
  patch: (fields: Partial<CharacterIdentityProfile>) => void
  morphusActive: boolean
  heightFeetError: string | null
  heightInchesError: string | null
  weightLbsError: string | null
  /** `stack` = mock Identity Expand left column; `grid` = legacy 3-col. */
  layout?: 'grid' | 'stack'
}) {
  const { measurementSystem } = useUnitsPreference()
  const metric = measurementSystem === 'metric'
  const heightDisplay = identityHeightToDisplay(
    profile.heightFeet,
    profile.heightInches,
    measurementSystem,
  )
  const weightDisplayCanonical = identityWeightToDisplay(
    profile.weightLbs,
    measurementSystem,
  )
  const [heightCmDraft, setHeightCmDraft] = useState(
    heightDisplay.system === 'metric' ? heightDisplay.centimeters : '',
  )
  const [weightDraft, setWeightDraft] = useState(weightDisplayCanonical)
  /** Avoid overwriting in-progress metric drafts when persist converts back. */
  const measureDraftDirtyRef = useRef(false)

  const syncMeasureDraftsFromProfile = () => {
    const next = identityHeightToDisplay(
      profile.heightFeet,
      profile.heightInches,
      measurementSystem,
    )
    setHeightCmDraft(next.system === 'metric' ? next.centimeters : '')
    setWeightDraft(identityWeightToDisplay(profile.weightLbs, measurementSystem))
  }

  useEffect(() => {
    measureDraftDirtyRef.current = false
    syncMeasureDraftsFromProfile()
    // Preference toggle always re-derives display from persisted ft/in + lbs.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: system flip only
  }, [measurementSystem])

  useEffect(() => {
    if (measureDraftDirtyRef.current) return
    syncMeasureDraftsFromProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when storage profile changes
  }, [profile.heightFeet, profile.heightInches, profile.weightLbs])

  const metricHeightError = metric
    ? identityHeightMetricDisplayError(heightCmDraft)
    : null
  const weightError = metric
    ? identityWeightDisplayError(weightDraft, 'metric')
    : weightLbsError
  const weightSubLabel = identityWeightUnitLabel(measurementSystem)
  const heightMetricUnit = identityHeightMetricUnitLabel()

  const onWeightDisplayChange = (raw: string) => {
    measureDraftDirtyRef.current = true
    setWeightDraft(raw)
    if (identityWeightDisplayError(raw, measurementSystem)) return
    const persisted = identityWeightFromDisplay(raw, measurementSystem)
    if (persisted == null) return
    patch({ weightLbs: persisted })
  }

  const onHeightCmChange = (raw: string) => {
    measureDraftDirtyRef.current = true
    setHeightCmDraft(raw)
    if (identityHeightMetricDisplayError(raw)) return
    const next = identityHeightFromMetricDisplay(raw)
    if (next == null) return
    patch(next)
  }

  const heightBlock = (
    <div className="grid grid-cols-[4.5rem_1fr] items-end gap-x-2">
      <span className={`pb-0.5 text-right ${identityLabelClass(morphusActive)}`}>
        Height
      </span>
      {metric ? (
        <div>
          <input
            type="text"
            inputMode="numeric"
            value={heightCmDraft}
            onChange={(e) => onHeightCmChange(e.target.value)}
            aria-label="Height centimeters"
            aria-invalid={metricHeightError != null}
            aria-describedby={
              metricHeightError ? 'identity-height-cm-error' : undefined
            }
            className={`w-full border-0 border-b-2 px-0 py-0.5 text-sm font-medium outline-none transition-colors ${
              metricHeightError
                ? identityInvalidFieldClass(morphusActive)
                : identityFieldClass(morphusActive)
            }`}
          />
          <span
            className={`mt-0.5 block text-[9px] font-semibold uppercase tracking-wide ${
              morphusActive ? 'text-violet-400/70' : 'text-slate-400'
            }`}
          >
            {heightMetricUnit}
          </span>
          {metricHeightError ? (
            <IdentityFieldError
              id="identity-height-cm-error"
              message={metricHeightError}
              morphusActive={morphusActive}
            />
          ) : null}
        </div>
      ) : (
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <input
              type="text"
              inputMode="numeric"
              value={profile.heightFeet}
              onChange={(e) => patch({ heightFeet: e.target.value })}
              aria-label="Height feet"
              aria-invalid={heightFeetError != null}
              aria-describedby={
                heightFeetError ? 'identity-height-feet-error' : undefined
              }
              className={`w-full border-0 border-b-2 px-0 py-0.5 text-sm font-medium outline-none transition-colors ${
                heightFeetError
                  ? identityInvalidFieldClass(morphusActive)
                  : identityFieldClass(morphusActive)
              }`}
            />
            <span
              className={`mt-0.5 block text-[9px] font-semibold uppercase tracking-wide ${
                morphusActive ? 'text-violet-400/70' : 'text-slate-400'
              }`}
            >
              Ft.
            </span>
            {heightFeetError ? (
              <IdentityFieldError
                id="identity-height-feet-error"
                message={heightFeetError}
                morphusActive={morphusActive}
              />
            ) : null}
          </div>
          <div className="flex-1">
            <input
              type="text"
              inputMode="numeric"
              value={profile.heightInches}
              onChange={(e) =>
                patch({
                  heightInches: sanitizeIdentityHeightInchesInput(e.target.value),
                })
              }
              aria-label="Height inches"
              aria-invalid={heightInchesError != null}
              aria-describedby={
                heightInchesError ? 'identity-height-inches-error' : undefined
              }
              className={`w-full border-0 border-b-2 px-0 py-0.5 text-sm font-medium outline-none transition-colors ${
                heightInchesError
                  ? identityInvalidFieldClass(morphusActive)
                  : identityFieldClass(morphusActive)
              }`}
            />
            <span
              className={`mt-0.5 block text-[9px] font-semibold uppercase tracking-wide ${
                morphusActive ? 'text-violet-400/70' : 'text-slate-400'
              }`}
            >
              In.
            </span>
            {heightInchesError ? (
              <IdentityFieldError
                id="identity-height-inches-error"
                message={heightInchesError}
                morphusActive={morphusActive}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  )

  if (layout === 'stack') {
    return (
      <div className="flex flex-col gap-2.5">
        <UnderlineField
          label="Sex"
          value={profile.sex}
          onChange={(sex) => patch({ sex })}
          morphusActive={morphusActive}
        />
        <UnderlineField
          label="Age"
          value={profile.age}
          onChange={(age) => patch({ age })}
          morphusActive={morphusActive}
          inputMode="numeric"
        />
        {heightBlock}
        <UnderlineField
          label="Weight"
          value={weightDraft}
          onChange={onWeightDisplayChange}
          morphusActive={morphusActive}
          inputMode={metric ? 'decimal' : 'numeric'}
          subLabel={weightSubLabel}
          error={weightError}
          errorId="identity-weight-display-error"
          ariaLabel={metric ? 'Weight kilograms' : 'Weight pounds'}
        />
        <UnderlineField
          label="Eyes"
          value={profile.eyes}
          onChange={(eyes) => patch({ eyes })}
          morphusActive={morphusActive}
        />
        <UnderlineField
          label="Hair"
          value={profile.hair}
          onChange={(hair) => patch({ hair })}
          morphusActive={morphusActive}
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      <div className="flex flex-col gap-2">
        <UnderlineField
          label="Sex"
          value={profile.sex}
          onChange={(sex) => patch({ sex })}
          morphusActive={morphusActive}
        />
        <UnderlineField
          label="Age"
          value={profile.age}
          onChange={(age) => patch({ age })}
          morphusActive={morphusActive}
          inputMode="numeric"
        />
      </div>

      <div className="flex flex-col gap-2">
        {heightBlock}
        <UnderlineField
          label="Weight"
          value={weightDraft}
          onChange={onWeightDisplayChange}
          morphusActive={morphusActive}
          inputMode={metric ? 'decimal' : 'numeric'}
          subLabel={weightSubLabel}
          error={weightError}
          errorId="identity-weight-display-error"
          ariaLabel={metric ? 'Weight kilograms' : 'Weight pounds'}
        />
      </div>

      <div className="flex flex-col gap-2">
        <UnderlineField
          label="Eyes"
          value={profile.eyes}
          onChange={(eyes) => patch({ eyes })}
          morphusActive={morphusActive}
        />
        <UnderlineField
          label="Hair"
          value={profile.hair}
          onChange={(hair) => patch({ hair })}
          morphusActive={morphusActive}
        />
      </div>
    </div>
  )
}

function clearPlaceholderNameOnFocus(
  value: string,
  setCharacterName: (name: string) => void,
) {
  if (isLegacyCreationNameValue(value)) {
    setCharacterName('')
  }
}

function IdentityPlaceholderBox({
  label,
  morphusActive,
}: {
  label: string
  morphusActive: boolean
}) {
  return (
    <div
      className={`flex min-h-[7.5rem] flex-1 flex-col rounded-md border-2 ${
        morphusActive
          ? 'border-violet-700 bg-slate-950/40'
          : 'border-slate-800 bg-white'
      }`}
      aria-label={`${label} placeholder — no saved field yet`}
    >
      <p
        className={`border-b px-2 py-1 text-[10px] font-black uppercase tracking-wider ${
          morphusActive
            ? 'border-violet-800 text-violet-300'
            : 'border-slate-200 text-slate-600'
        }`}
      >
        {label}
      </p>
      <div
        className={`flex flex-1 items-center justify-center px-3 py-4 text-center text-xs font-semibold uppercase tracking-[0.2em] ${
          morphusActive ? 'text-violet-400/70' : 'text-slate-400'
        }`}
      >
        Text box
      </div>
    </div>
  )
}

function IdentityAliasesEditor({
  aliases,
  aliasDraft,
  onAliasDraftChange,
  onAdd,
  onRename,
  onRemove,
  morphusActive,
  compact = false,
}: {
  aliases: { id: string; name: string }[]
  aliasDraft: string
  onAliasDraftChange: (value: string) => void
  onAdd: () => void
  onRename: (aliasId: string, name: string) => void
  onRemove: (aliasId: string) => void
  morphusActive: boolean
  /** Mock Expand left column — shorter helper copy. */
  compact?: boolean
}) {
  return (
    <div className={compact ? 'mt-4' : 'mt-5 max-w-xl'}>
      <p className={identityLabelClass(morphusActive)}>Aliases</p>
      {compact ? null : (
      <p
        className={`mt-0.5 text-[11px] ${
          morphusActive ? 'text-violet-200/70' : 'text-slate-500'
        }`}
      >
        Optional other names. On Join Session you can show one of these to other
        players; the GM always sees your real character name.
      </p>
      )}
      <ul className="mt-2 space-y-1.5">
        {aliases.length === 0 ? (
          <li
            className={`text-[11px] ${
              morphusActive ? 'text-violet-300/60' : 'text-slate-400'
            }`}
          >
            No aliases yet.
          </li>
        ) : (
          aliases.map((alias) => (
            <li key={alias.id} className="flex items-center gap-2">
              <input
                type="text"
                value={alias.name}
                onChange={(e) => onRename(alias.id, e.target.value)}
                aria-label="Alias name"
                className={`min-w-0 flex-1 border-0 border-b-2 px-0 py-0.5 text-sm font-medium outline-none transition-colors ${identityFieldClass(morphusActive)}`}
              />
              <button
                type="button"
                onClick={() => onRemove(alias.id)}
                className={
                  morphusActive
                    ? 'shrink-0 text-[10px] font-bold uppercase tracking-wide text-violet-300 hover:text-white'
                    : 'shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-500 hover:text-slate-800'
                }
              >
                Remove
              </button>
            </li>
          ))
        )}
      </ul>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="text"
          value={aliasDraft}
          onChange={(e) => onAliasDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onAdd()
            }
          }}
          placeholder="Add an alias"
          aria-label="New alias"
          className={`min-w-0 flex-1 border-0 border-b-2 px-0 py-0.5 text-sm font-medium outline-none transition-colors ${identityFieldClass(morphusActive)}`}
        />
        <button
          type="button"
          onClick={onAdd}
          disabled={!aliasDraft.trim()}
          className={
            morphusActive
              ? 'shrink-0 rounded-md border border-violet-400/50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-100 disabled:opacity-40'
              : 'shrink-0 rounded-md border border-slate-300 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700 disabled:opacity-40'
          }
        >
          Add
        </button>
      </div>
    </div>
  )
}
function formatIdentityOccLabel(
  effectiveOccName: string | undefined,
  occId: string,
  specializationId: string | undefined,
  effectiveOcc: PalladiumOcc | undefined,
): string {
  if (!occId || occId === CREATION_PLACEHOLDER_OCC.id) {
    return CREATION_PLACEHOLDER_OCC.name
  }
  const base = effectiveOccName ?? '—'
  if (!effectiveOcc || !specializationId) return base
  const spec = getOccSpecialization(effectiveOcc, specializationId)
  return spec ? `${base} — ${spec.name}` : base
}

function UnderlineField({
  label,
  value,
  onChange,
  morphusActive,
  inputMode,
  className = '',
  subLabel,
  error,
  errorId,
  ariaLabel,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  morphusActive: boolean
  inputMode?: 'text' | 'numeric' | 'decimal'
  className?: string
  subLabel?: string
  error?: string | null
  errorId?: string
  ariaLabel?: string
}) {
  const invalid = error != null
  return (
    <div className={`grid grid-cols-[4.5rem_1fr] items-end gap-x-2 ${className}`}>
      <span className={`pb-0.5 text-right ${identityLabelClass(morphusActive)}`}>
        {label}
      </span>
      <div>
        <input
          type="text"
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={ariaLabel ?? label}
          aria-invalid={invalid}
          aria-describedby={invalid && errorId ? errorId : undefined}
          className={`w-full border-0 border-b-2 px-0 py-0.5 text-sm font-medium outline-none transition-colors ${
            invalid
              ? identityInvalidFieldClass(morphusActive)
              : identityFieldClass(morphusActive)
          }`}
        />
        {subLabel ? (
          <span
            className={`mt-0.5 block text-[9px] font-semibold uppercase tracking-wide ${
              morphusActive ? 'text-violet-400/70' : 'text-slate-400'
            }`}
          >
            {subLabel}
          </span>
        ) : null}
        {invalid && error && errorId ? (
          <IdentityFieldError id={errorId} message={error} morphusActive={morphusActive} />
        ) : null}
      </div>
    </div>
  )
}

export function IdentityHeader({
  morphusActive,
  creationGenreId,
  hostGenreId,
  variant = 'header',
  collapsed: collapsedProp = false,
  onCollapsedChange,
  showExpandToggle = true,
  compactChrome = false,
}: IdentityHeaderProps) {
  const {
    character,
    activeRace,
    effectiveOcc,
    setCharacterName,
    patchIdentityProfile,
    addAlias,
    removeAlias,
    renameAlias,
  } = useCharacter()
  const [aliasDraft, setAliasDraft] = useState('')

  const isCreation = variant === 'creation'
  const [creationDetailsCollapsed, setCreationDetailsCollapsed] = useState(true)
  const [uncontrolledCollapsed, setUncontrolledCollapsed] = useState(true)
  const controlled = typeof onCollapsedChange === 'function'
  const collapsed = controlled ? collapsedProp : uncontrolledCollapsed
  const toggleCollapsed = () => {
    if (controlled) onCollapsedChange!(!collapsedProp)
    else setUncontrolledCollapsed((value) => !value)
  }

  useEffect(() => {
    if (!compactChrome) return
    setCreationDetailsCollapsed(true)
  }, [compactChrome])

  const profile = normalizeIdentityProfile(character.identityProfile)
  const patch = (fields: Partial<CharacterIdentityProfile>) => patchIdentityProfile(fields)

  const raceLabel = activeRace?.name?.trim() ? activeRace.name : '—'
  const occLabel = formatIdentityOccLabel(
    effectiveOcc?.name ?? character.occ.name,
    character.occ.id ?? '',
    character.occSpecializationId ?? undefined,
    effectiveOcc,
  )
  const heightFeetError = identityHeightFeetError(profile.heightFeet)
  const heightInchesError = identityHeightInchesError(profile.heightInches)
  const weightLbsError = identityWeightLbsError(profile.weightLbs)

  const formatGenreStamp = (genreId: string) =>
    genreId.replace(/_/g, ' ').toUpperCase()
  const genreStamp = `${formatGenreStamp(creationGenreId)} → HOST ${formatGenreStamp(hostGenreId)}`
  const alignmentLabel = configuratorAlignmentLabel(
    effectiveConfiguratorAlignment(character.primary.alignment),
  )
  const toggleButtonClass = identityToggleButtonClass(morphusActive)

  if (isCreation) {
    const displayName = creationForgeDisplayName(character.name)
    const expandBtn = creationForgeDetailsButtonClass(morphusActive)
    const nameSizerText = displayName || CHARACTER_NAME_PLACEHOLDER
    const summaryNameSize = creationForgeSummaryNameSizeClass(compactChrome)
    const summaryNameClass = morphusActive
      ? `${summaryNameSize} border-0 bg-transparent font-semibold tracking-wide text-violet-800 placeholder:font-normal placeholder:text-violet-400 outline-none`
      : `${summaryNameSize} border-0 bg-transparent font-semibold tracking-wide text-blue-800 placeholder:font-normal placeholder:text-slate-400 outline-none`
    const summaryValue = morphusActive
      ? compactChrome
        ? 'whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-violet-950'
        : 'whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-violet-950'
      : compactChrome
        ? 'whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-slate-800'
        : 'whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-slate-800'
    const summarySep = morphusActive ? 'text-violet-400/60' : 'text-slate-400'
    const alignmentLabelClass = morphusActive
      ? 'text-[10px] font-bold uppercase leading-none tracking-wide text-violet-600'
      : 'text-[10px] font-bold uppercase leading-none tracking-wide text-slate-500'

    return (
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className={`relative inline-grid max-w-none shrink-0 ${summaryNameClass}`}>
            <span className="invisible col-start-1 row-start-1 whitespace-pre" aria-hidden>
              {nameSizerText}
            </span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setCharacterName(e.target.value)}
              onFocus={(e) => clearPlaceholderNameOnFocus(e.currentTarget.value, setCharacterName)}
              placeholder={CHARACTER_NAME_PLACEHOLDER}
              aria-label="Character name"
              className={`col-start-1 row-start-1 w-full min-w-0 ${summaryNameClass}`}
            />
          </span>
          <span className={`hidden shrink-0 text-xs sm:inline ${summarySep}`} aria-hidden>
            ·
          </span>
          <span className={`shrink-0 ${summaryValue}`} title={raceLabel}>
            {raceLabel}
          </span>
          <span className={`hidden shrink-0 text-xs sm:inline ${summarySep}`} aria-hidden>
            ·
          </span>
          <span className={`shrink-0 ${summaryValue}`} title={occLabel}>
            {occLabel}
          </span>
          <button
            type="button"
            className={`${expandBtn} ml-1 shrink-0 self-center`}
            aria-expanded={!creationDetailsCollapsed}
            aria-controls="creation-identity-details"
            onClick={() => setCreationDetailsCollapsed((value) => !value)}
          >
            {creationDetailsCollapsed ? 'Expand' : 'Minimize'}
          </button>
        </div>

        {!creationDetailsCollapsed ? (
          <div
            id="creation-identity-details"
            className="mt-1.5 inline-flex max-w-full flex-col gap-1.5"
          >
            <div className="flex flex-col gap-0.5 leading-none">
              <span className={alignmentLabelClass}>Alignment</span>
              <div className={summaryValue}>
                <ConfiguratorAlignmentSelect morphus={morphusActive} variant="creation" />
              </div>
            </div>
            <CreationForgeDetailsGrid
              morphusActive={morphusActive}
              profile={profile}
              onPatch={patch}
              heightError={heightFeetError ?? heightInchesError}
            />
          </div>
        ) : null}
      </div>
    )
  }

  const nameInputClass = collapsed
    ? 'max-w-[12rem] shrink-0 border-0 bg-transparent text-lg font-bold tracking-tight outline-none sm:max-w-[16rem] sm:text-xl'
    : 'mt-0.5 w-full max-w-xl border-0 border-b-2 bg-transparent text-2xl font-bold tracking-tight outline-none transition-colors sm:text-3xl'
  const nameInputToneClass = morphusActive
    ? collapsed
      ? 'text-violet-50 placeholder:font-normal placeholder:text-violet-300/45 focus:underline focus:decoration-violet-400'
      : 'border-transparent text-violet-50 placeholder:font-normal placeholder:text-violet-300/45 focus:border-violet-400'
    : collapsed
      ? 'text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:underline focus:decoration-blue-600'
      : 'border-transparent text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600'

  const summaryMetaClass = morphusActive
    ? 'shrink-0 text-[11px] font-semibold uppercase tracking-wide text-violet-200/90 sm:text-xs'
    : 'shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs'

  return (
    <div className="min-w-0 flex-1">
      {collapsed ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <p
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: morphusActive ? '#c4b5fd' : '#1d4ed8' }}
            >
              Identity
            </p>
            {showExpandToggle ? (
              <button
                type="button"
                className={toggleButtonClass}
                aria-expanded={!collapsed}
                aria-controls="identity-header-details"
                onClick={toggleCollapsed}
              >
                Expand
              </button>
            ) : null}
          </div>
          <div
            id="identity-header-details"
            className="mt-1 flex min-w-0 flex-nowrap items-baseline gap-x-2 overflow-x-auto pb-0.5"
          >
            <input
              type="text"
              value={character.name}
              onChange={(e) => setCharacterName(e.target.value)}
              onFocus={(e) =>
                clearPlaceholderNameOnFocus(e.currentTarget.value, setCharacterName)
              }
              placeholder={CHARACTER_NAME_PLACEHOLDER}
              aria-label="Character name"
              className={`${nameInputClass} ${nameInputToneClass}`}
            />
            <span
              className={`hidden text-xs sm:inline ${identitySummarySeparatorClass(morphusActive)}`}
              aria-hidden
            >
              ·
            </span>
            <span className={summaryMetaClass}>{raceLabel}</span>
            <span
              className={`hidden text-xs sm:inline ${identitySummarySeparatorClass(morphusActive)}`}
              aria-hidden
            >
              ·
            </span>
            <span className={`${summaryMetaClass} max-w-[14rem] truncate`} title={occLabel}>
              {occLabel}
            </span>
            <span
              className={`hidden text-xs sm:inline ${identitySummarySeparatorClass(morphusActive)}`}
              aria-hidden
            >
              ·
            </span>
            <span className={summaryMetaClass}>{alignmentLabel}</span>
          </div>
        </>
      ) : (
        <div id="identity-header-details">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
              <input
                type="text"
                value={character.name}
                onChange={(e) => setCharacterName(e.target.value)}
                onFocus={(e) =>
                  clearPlaceholderNameOnFocus(
                    e.currentTarget.value,
                    setCharacterName,
                  )
                }
                placeholder={CHARACTER_NAME_PLACEHOLDER}
                aria-label="Character name"
                className={`${nameInputClass} ${nameInputToneClass}`}
              />
              <span
                className={`hidden text-xs sm:inline ${identitySummarySeparatorClass(morphusActive)}`}
                aria-hidden
              >
                ·
              </span>
              <span className={summaryMetaClass} title={raceLabel}>
                {raceLabel}
              </span>
              <span
                className={`hidden text-xs sm:inline ${identitySummarySeparatorClass(morphusActive)}`}
                aria-hidden
              >
                ·
              </span>
              <span className={summaryMetaClass} title={occLabel}>
                {occLabel}
              </span>
              <span
                className={`hidden text-xs sm:inline ${identitySummarySeparatorClass(morphusActive)}`}
                aria-hidden
              >
                ·
              </span>
              <div className="min-w-[10rem] max-w-xs">
                <ConfiguratorAlignmentSelect
                  morphus={morphusActive}
                  variant="identity"
                />
              </div>
            </div>
            {showExpandToggle ? (
              <button
                type="button"
                className={toggleButtonClass}
                aria-expanded={!collapsed}
                aria-controls="identity-header-details"
                onClick={toggleCollapsed}
              >
                Minimize
              </button>
            ) : null}
          </div>

          {/*
            Mock Identity Expand: left traits + aliases, center Description /
            Personality placeholders, right Character Image. No persisted
            Description/Personality/Image fields — Radical Visibility placeholders.
          */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)_minmax(8rem,11rem)]">
            <div className="min-w-0">
              <IdentityProfileDetailFields
                profile={profile}
                patch={patch}
                morphusActive={morphusActive}
                heightFeetError={heightFeetError}
                heightInchesError={heightInchesError}
                weightLbsError={weightLbsError}
                layout="stack"
              />
              <IdentityAliasesEditor
                aliases={normalizeAliases(character.aliases)}
                aliasDraft={aliasDraft}
                onAliasDraftChange={setAliasDraft}
                onAdd={() => {
                  const next = aliasDraft.trim()
                  if (!next) return
                  addAlias(next)
                  setAliasDraft('')
                }}
                onRename={renameAlias}
                onRemove={removeAlias}
                morphusActive={morphusActive}
                compact
              />
              <p
                className="mt-4 font-mono text-[10px] uppercase tracking-wide opacity-70"
                style={{ color: morphusActive ? '#94a3b8' : '#64748b' }}
              >
                {genreStamp}
              </p>
            </div>

            <div className="flex min-h-[16rem] flex-col gap-3">
              <IdentityPlaceholderBox
                label="Description"
                morphusActive={morphusActive}
              />
              <IdentityPlaceholderBox
                label="Personality"
                morphusActive={morphusActive}
              />
            </div>

            <div className="flex min-h-[16rem] flex-col">
              <div
                className={`flex flex-1 flex-col overflow-hidden rounded-md border-2 bg-black ${
                  morphusActive ? 'border-violet-800' : 'border-slate-800'
                }`}
                role="img"
                aria-label="Character image placeholder — no saved image field yet"
              >
                <p className="border-b border-white/10 px-2 py-1 text-center text-[9px] font-semibold uppercase tracking-wide text-white/70">
                  Character Image
                </p>
                <div className="min-h-[12rem] flex-1 bg-black" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
