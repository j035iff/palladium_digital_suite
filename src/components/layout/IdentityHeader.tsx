import { useCharacter } from '../../context/CharacterContext'
import { ConfiguratorAlignmentSelect } from '../creation/ConfiguratorAlignmentSelect'
import { CREATION_PLACEHOLDER_OCC } from '../../lib/characterRoot'
import {
  CHARACTER_NAME_PLACEHOLDER,
  identityHeightFeetError,
  identityHeightInchesError,
  identityWeightLbsError,
  LEGACY_DEFAULT_CHARACTER_NAME,
  normalizeIdentityProfile,
} from '../../lib/characterIdentity'
import { getOccSpecialization } from '../../lib/occComposition'
import type { CharacterIdentityProfile, PalladiumOcc } from '../../types'

type IdentityHeaderProps = {
  morphusActive: boolean
  creationGenreId: string
  hostGenreId: string
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
}: IdentityHeaderProps) {
  const {
    character,
    activeRace,
    effectiveOcc,
    setCharacterName,
    patchIdentityProfile,
  } = useCharacter()

  const profile = normalizeIdentityProfile(character.identityProfile)
  const patch = (fields: Partial<CharacterIdentityProfile>) => patchIdentityProfile(fields)

  const raceLabel = activeRace?.name?.trim() ? activeRace.name : '—'
  const occLabel = formatIdentityOccLabel(
    effectiveOcc?.name ?? character.occ.name,
    character.occ.id,
    character.occSpecializationId,
    effectiveOcc,
  )
  const heightFeetError = identityHeightFeetError(profile.heightFeet)
  const heightInchesError = identityHeightInchesError(profile.heightInches)
  const weightLbsError = identityWeightLbsError(profile.weightLbs)

  const formatGenreStamp = (genreId: string) =>
    genreId.replace(/_/g, ' ').toUpperCase()
  const genreStamp = `${formatGenreStamp(creationGenreId)} → HOST ${formatGenreStamp(hostGenreId)}`

  return (
    <div className="flex min-w-0 flex-1 gap-4">
      <div className="min-w-0 flex-1">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: morphusActive ? '#c4b5fd' : '#1d4ed8' }}
        >
          Identity
        </p>

        <input
          type="text"
          value={character.name}
          onChange={(e) => setCharacterName(e.target.value)}
          onFocus={(e) => {
            const el = e.currentTarget
            if (
              el.value === LEGACY_DEFAULT_CHARACTER_NAME ||
              el.value === CHARACTER_NAME_PLACEHOLDER
            ) {
              setCharacterName('')
            }
          }}
          placeholder={CHARACTER_NAME_PLACEHOLDER}
          aria-label="Character name"
          className={`mt-0.5 w-full max-w-xl border-0 border-b-2 bg-transparent text-2xl font-bold tracking-tight outline-none transition-colors sm:text-3xl ${
            morphusActive
              ? 'border-transparent text-violet-50 placeholder:font-normal placeholder:text-violet-300/45 focus:border-violet-400'
              : 'border-transparent text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600'
          }`}
        />

        <div className="mt-4 flex flex-wrap gap-x-10 gap-y-4">
          <div className="flex min-w-[9rem] flex-col gap-3">
            <div>
              <p className={identityLabelClass(morphusActive)}>Race</p>
              <p className={identityValueClass(morphusActive)}>{raceLabel}</p>
            </div>
            <div>
              <p className={identityLabelClass(morphusActive)}>O.C.C.</p>
              <p className={identityValueClass(morphusActive)}>{occLabel}</p>
            </div>
            <ConfiguratorAlignmentSelect
              morphus={morphusActive}
              variant="identity"
            />
          </div>

          <div className="flex min-w-[12rem] flex-1 flex-col gap-2 sm:max-w-xs">
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
            <div className="grid grid-cols-[4.5rem_1fr] items-end gap-x-2">
              <span
                className={`pb-0.5 text-right ${identityLabelClass(morphusActive)}`}
              >
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
                    onChange={(e) => patch({ heightInches: e.target.value })}
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

        <p
          className="mt-3 font-mono text-[10px] uppercase tracking-wide opacity-70"
          style={{ color: morphusActive ? '#94a3b8' : '#64748b' }}
        >
          {genreStamp}
        </p>
      </div>

      <div
        className={`hidden shrink-0 sm:block ${
          morphusActive ? 'border-violet-800' : 'border-slate-200'
        } h-36 w-28 border-2 bg-black`}
        role="img"
        aria-label="Character portrait placeholder"
      />
    </div>
  )
}
