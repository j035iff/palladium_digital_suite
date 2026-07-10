import { useState, useEffect } from 'react'
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
import {
  creationForgeDetailsButtonClass,
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

function identityValueClass(morphusActive: boolean): string {
  return morphusActive
    ? 'text-sm font-semibold uppercase tracking-wide text-violet-100'
    : 'text-sm font-semibold uppercase tracking-wide text-slate-800'
}

function IdentityProfileDetailFields({
  profile,
  patch,
  morphusActive,
  heightFeetError,
  heightInchesError,
  weightLbsError,
}: {
  profile: CharacterIdentityProfile
  patch: (fields: Partial<CharacterIdentityProfile>) => void
  morphusActive: boolean
  heightFeetError: string | null
  heightInchesError: string | null
  weightLbsError: string | null
}) {
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
        <div className="grid grid-cols-[4.5rem_1fr] items-end gap-x-2">
          <span className={`pb-0.5 text-right ${identityLabelClass(morphusActive)}`}>
            Height
          </span>
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
                  patch({ heightInches: sanitizeIdentityHeightInchesInput(e.target.value) })
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
        </div>
        <UnderlineField
          label="Weight"
          value={profile.weightLbs}
          onChange={(weightLbs) => patch({ weightLbs })}
          morphusActive={morphusActive}
          inputMode="numeric"
          subLabel="Lbs."
          error={weightLbsError}
          errorId="identity-weight-lbs-error"
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
  compactChrome = false,
}: IdentityHeaderProps) {
  const {
    character,
    activeRace,
    effectiveOcc,
    setCharacterName,
    patchIdentityProfile,
  } = useCharacter()

  const isCreation = variant === 'creation'
  const [identityCollapsed, setIdentityCollapsed] = useState(true)
  const collapsed = collapsedProp
  const toggleCollapsed = () => onCollapsedChange?.(!collapsedProp)

  useEffect(() => {
    if (!compactChrome) return
    setIdentityCollapsed(true)
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
    const summaryNameClass = morphusActive
      ? compactChrome
        ? 'border-0 bg-transparent text-sm font-semibold tracking-wide text-violet-800 placeholder:font-normal placeholder:text-violet-400 outline-none'
        : 'border-0 bg-transparent text-base font-semibold tracking-wide text-violet-800 placeholder:font-normal placeholder:text-violet-400 outline-none sm:text-lg'
      : compactChrome
        ? 'border-0 bg-transparent text-sm font-semibold tracking-wide text-blue-800 placeholder:font-normal placeholder:text-slate-400 outline-none'
        : 'border-0 bg-transparent text-base font-semibold tracking-wide text-blue-800 placeholder:font-normal placeholder:text-slate-400 outline-none sm:text-lg'
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
            aria-expanded={!identityCollapsed}
            aria-controls="creation-identity-details"
            onClick={() => setIdentityCollapsed((value) => !value)}
          >
            {identityCollapsed ? 'Expand' : 'Minimize'}
          </button>
        </div>

        {!identityCollapsed ? (
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
    ? 'max-w-[14rem] border-0 bg-transparent text-lg font-bold tracking-tight outline-none sm:max-w-xs sm:text-xl'
    : 'mt-0.5 w-full max-w-xl border-0 border-b-2 bg-transparent text-2xl font-bold tracking-tight outline-none transition-colors sm:text-3xl'
  const nameInputToneClass = morphusActive
    ? collapsed
      ? 'text-violet-50 placeholder:font-normal placeholder:text-violet-300/45 focus:underline focus:decoration-violet-400'
      : 'border-transparent text-violet-50 placeholder:font-normal placeholder:text-violet-300/45 focus:border-violet-400'
    : collapsed
      ? 'text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:underline focus:decoration-blue-600'
      : 'border-transparent text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600'

  return (
    <div className="flex min-w-0 flex-1 gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: morphusActive ? '#c4b5fd' : '#1d4ed8' }}
          >
            Identity
          </p>
          <button
            type="button"
            className={toggleButtonClass}
            aria-expanded={!collapsed}
            aria-controls="identity-header-details"
            onClick={toggleCollapsed}
          >
            {collapsed ? 'Expand' : 'Minimize'}
          </button>
        </div>

        {collapsed ? (
          <div
            id="identity-header-details"
            className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1"
          >
            <input
              type="text"
              value={character.name}
              onChange={(e) => setCharacterName(e.target.value)}
              onFocus={(e) => clearPlaceholderNameOnFocus(e.currentTarget.value, setCharacterName)}
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
            <span
              className={`text-sm font-semibold uppercase tracking-wide ${identityValueClass(morphusActive)}`}
            >
              {raceLabel}
            </span>
            <span
              className={`hidden text-xs sm:inline ${identitySummarySeparatorClass(morphusActive)}`}
              aria-hidden
            >
              ·
            </span>
            <span
              className={`text-sm font-semibold uppercase tracking-wide ${identityValueClass(morphusActive)}`}
            >
              {occLabel}
            </span>
            <span
              className={`hidden text-xs sm:inline ${identitySummarySeparatorClass(morphusActive)}`}
              aria-hidden
            >
              ·
            </span>
            <span
              className={`text-sm font-semibold uppercase tracking-wide ${identityValueClass(morphusActive)}`}
            >
              {alignmentLabel}
            </span>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={character.name}
              onChange={(e) => setCharacterName(e.target.value)}
              onFocus={(e) => clearPlaceholderNameOnFocus(e.currentTarget.value, setCharacterName)}
              placeholder={CHARACTER_NAME_PLACEHOLDER}
              aria-label="Character name"
              className={`${nameInputClass} ${nameInputToneClass}`}
            />

            <div id="identity-header-details" className="mt-4 flex flex-wrap gap-x-10 gap-y-4">
              <div className="flex min-w-[9rem] flex-col gap-3">
                <div>
                  <p className={identityLabelClass(morphusActive)}>Race</p>
                  <p className={identityValueClass(morphusActive)}>{raceLabel}</p>
                </div>
                <div>
                  <p className={identityLabelClass(morphusActive)}>O.C.C.</p>
                  <p className={identityValueClass(morphusActive)}>{occLabel}</p>
                </div>
                <ConfiguratorAlignmentSelect morphus={morphusActive} variant="identity" />
              </div>

              <div className="min-w-[12rem] flex-1 sm:max-w-md">
                <IdentityProfileDetailFields
                  profile={profile}
                  patch={patch}
                  morphusActive={morphusActive}
                  heightFeetError={heightFeetError}
                  heightInchesError={heightInchesError}
                  weightLbsError={weightLbsError}
                />
              </div>
            </div>

            <p
              className="mt-3 font-mono text-[10px] uppercase tracking-wide opacity-70"
              style={{ color: morphusActive ? '#94a3b8' : '#64748b' }}
            >
              {genreStamp}
            </p>
          </>
        )}
      </div>

      {!collapsed ? (
        <div
          className={`hidden shrink-0 sm:block ${
            morphusActive ? 'border-violet-800' : 'border-slate-200'
          } h-36 w-28 border-2 bg-black`}
          role="img"
          aria-label="Character portrait placeholder"
        />
      ) : null}
    </div>
  )
}
