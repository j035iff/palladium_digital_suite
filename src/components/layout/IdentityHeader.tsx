import {
  useState,
  useEffect,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { getSharedGmClientRuntime } from '../../lib/gm/sessionClientHandle'
import type { GmClientRuntimeState } from '../../lib/gm/sessionClientRuntime'
import { isSeatFullyJoined } from '../../lib/gm/sessionPresence'
import { isPortraitSharedWithPeer } from '../../lib/characterPortraits'
import { peerFacingCharacterName } from '../../lib/gm/tableProjectedName'
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
  listMorphusIdentityFillInCallouts,
  normalizeIdentityProfile,
  resolveIdentityDisplayProfile,
  sanitizeIdentityHeightInchesInput,
  type IdentityTraitModifierSource,
} from '../../lib/characterIdentity'
import {
  applyPortraitCornerDrag,
  identityProfileWithPortrait,
  ingestPortraitFile,
  PORTRAIT_ACCEPT_ATTR,
  portraitSlotLabel,
  resolvePortraitWindowSize,
  withPortraitWindowForForm,
  type CharacterPortraitFormKey,
  type PortraitCorner,
} from '../../lib/characterPortraits'
import type { CharacterPortraitWindowSize } from '../../types'
import { aliasesForForm } from '../../lib/characterAliases'
import { buildLiveMorphusIdentityTraitBreakdown } from '../../lib/liveMorphusIdentityTraits'
import { resolveActiveMorphusTraits } from '../../lib/morphusPassiveBridge'
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
import type { CharacterIdentityFormFields, PalladiumOcc } from '../../types'

type IdentityHeaderProps = {
  morphusActive: boolean
  creationGenreId: string
  hostGenreId: string
  /** 'header' = sticky live-sheet chrome; 'creation' = forge global header above tabs. */
  variant?: 'header' | 'creation'
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  /**
   * When false, hide Expand/Minimize (live sheet: summary strip only;
   * full details live on the Identity overlay tab). Default true.
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

function IdentityTraitSourceNote({
  sources,
  altered,
  needsFillIn,
  fillInLabels,
  morphusActive,
}: {
  sources: IdentityTraitModifierSource[]
  altered: boolean
  needsFillIn: boolean
  fillInLabels: string[]
  morphusActive: boolean
}) {
  if (!sources.length && !needsFillIn) return null
  const tone = morphusActive ? 'text-amber-200/90' : 'text-amber-800'
  const fillTone = morphusActive
    ? 'border-amber-400/50 bg-amber-950/40 text-amber-100'
    : 'border-amber-500 bg-amber-50 text-amber-900'
  return (
    <div className="col-span-2 mt-0.5 space-y-1">
      {needsFillIn ? (
        <p
          className={`rounded border px-1.5 py-1 text-[10px] font-semibold leading-snug ${fillTone}`}
          role="status"
        >
          Fill in from trait roll: {fillInLabels.join('; ')}
        </p>
      ) : null}
      {altered && sources.length > 0 ? (
        <p className={`text-[9px] font-medium leading-snug ${tone}`}>
          Altered by:{' '}
          {sources.map((s) => `${s.traitName} (${s.label})`).join('; ')}
        </p>
      ) : null}
    </div>
  )
}

function IdentityProfileDetailFields({
  profile,
  patch,
  morphusActive,
  heightFeetError,
  heightInchesError,
  weightLbsError,
  layout = 'grid',
  heightTraitSources = [],
  weightTraitSources = [],
  heightNeedsFillIn = false,
  weightNeedsFillIn = false,
  heightFillInLabels = [],
  weightFillInLabels = [],
  heightTraitAltered = false,
  weightTraitAltered = false,
}: {
  profile: CharacterIdentityFormFields
  patch: (fields: Partial<CharacterIdentityFormFields>) => void
  morphusActive: boolean
  heightFeetError: string | null
  heightInchesError: string | null
  weightLbsError: string | null
  /** `stack` = mock Identity Expand left column; `grid` = legacy 3-col. */
  layout?: 'grid' | 'stack'
  heightTraitSources?: IdentityTraitModifierSource[]
  weightTraitSources?: IdentityTraitModifierSource[]
  heightNeedsFillIn?: boolean
  weightNeedsFillIn?: boolean
  heightFillInLabels?: string[]
  weightFillInLabels?: string[]
  heightTraitAltered?: boolean
  weightTraitAltered?: boolean
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
      {morphusActive ? (
        <IdentityTraitSourceNote
          sources={heightTraitSources}
          altered={heightTraitAltered}
          needsFillIn={heightNeedsFillIn}
          fillInLabels={heightFillInLabels}
          morphusActive={morphusActive}
        />
      ) : null}
    </div>
  )

  const weightNotes =
    morphusActive ? (
      <IdentityTraitSourceNote
        sources={weightTraitSources}
        altered={weightTraitAltered}
        needsFillIn={weightNeedsFillIn}
        fillInLabels={weightFillInLabels}
        morphusActive={morphusActive}
      />
    ) : null

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
          label="Apparent age"
          value={profile.age}
          onChange={(age) => patch({ age })}
          morphusActive={morphusActive}
          inputMode="numeric"
        />
        {heightBlock}
        <div>
          <UnderlineField
            label="Weight"
            value={weightDraft}
            onChange={onWeightDisplayChange}
            morphusActive={morphusActive}
            inputMode={metric ? 'decimal' : 'numeric'}
            subLabel={weightSubLabel}
            error={
              weightError ??
              (weightNeedsFillIn ? 'Trait roll needs a Morphus weight' : null)
            }
            errorId="identity-weight-display-error"
            ariaLabel={metric ? 'Weight kilograms' : 'Weight pounds'}
          />
          {weightNotes}
        </div>
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
          label="Apparent age"
          value={profile.age}
          onChange={(age) => patch({ age })}
          morphusActive={morphusActive}
          inputMode="numeric"
        />
      </div>

      <div className="flex flex-col gap-2">
        {heightBlock}
        <div>
          <UnderlineField
            label="Weight"
            value={weightDraft}
            onChange={onWeightDisplayChange}
            morphusActive={morphusActive}
            inputMode={metric ? 'decimal' : 'numeric'}
            subLabel={weightSubLabel}
            error={
              weightError ??
              (weightNeedsFillIn ? 'Trait roll needs a Morphus weight' : null)
            }
            errorId="identity-weight-display-error"
            ariaLabel={metric ? 'Weight kilograms' : 'Weight pounds'}
          />
          {weightNotes}
        </div>
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

const PORTRAIT_CORNERS: {
  corner: PortraitCorner
  className: string
  cursor: string
  label: string
}[] = [
  {
    corner: 'nw',
    className: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2',
    cursor: 'nwse-resize',
    label: 'Resize from top-left',
  },
  {
    corner: 'ne',
    className: 'right-0 top-0 translate-x-1/2 -translate-y-1/2',
    cursor: 'nesw-resize',
    label: 'Resize from top-right',
  },
  {
    corner: 'sw',
    className: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2',
    cursor: 'nesw-resize',
    label: 'Resize from bottom-left',
  },
  {
    corner: 'se',
    className: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2',
    cursor: 'nwse-resize',
    label: 'Resize from bottom-right',
  },
]

function IdentityPortraitSlot({
  formKey,
  dualForm,
  dataUrl,
  windowSize,
  morphusActive,
  onSetPortrait,
  onWindowSizeChange,
}: {
  formKey: CharacterPortraitFormKey
  dualForm: boolean
  dataUrl: string | undefined
  windowSize: CharacterPortraitWindowSize
  morphusActive: boolean
  onSetPortrait: (
    dataUrl: string | undefined,
    windowSize?: CharacterPortraitWindowSize,
  ) => void
  onWindowSizeChange: (size: CharacterPortraitWindowSize) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [liveSize, setLiveSize] = useState(windowSize)
  const dragRef = useRef<{
    corner: PortraitCorner
    startX: number
    startY: number
    startSize: CharacterPortraitWindowSize
  } | null>(null)
  const label = portraitSlotLabel(formKey, dualForm)
  const inputId = `identity-portrait-${formKey}`

  useEffect(() => {
    setLiveSize(windowSize)
  }, [windowSize.widthPx, windowSize.heightPx])

  const borderClass = morphusActive ? 'border-violet-800' : 'border-slate-800'
  const buttonClass = morphusActive
    ? 'rounded border border-violet-600 bg-violet-950/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-100 hover:bg-violet-900 disabled:opacity-50'
    : 'rounded border border-slate-600 bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-800 hover:bg-slate-200 disabled:opacity-50'
  const handleClass = morphusActive
    ? 'border-violet-300 bg-violet-700'
    : 'border-slate-200 bg-slate-600'

  const pickFile = () => {
    setError(null)
    inputRef.current?.click()
  }

  const onFileChange = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(null)
    const result = await ingestPortraitFile(file)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onSetPortrait(result.dataUrl, result.windowSize)
    setLiveSize(result.windowSize)
    if (inputRef.current) inputRef.current.value = ''
  }

  const onCornerPointerDown = (
    corner: PortraitCorner,
    e: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const startSize = { ...liveSize }
    dragRef.current = {
      corner,
      startX: e.clientX,
      startY: e.clientY,
      startSize,
    }
    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)
    document.body.style.userSelect = 'none'

    const onMove = (ev: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const next = applyPortraitCornerDrag(
        drag.startSize,
        drag.corner,
        ev.clientX - drag.startX,
        ev.clientY - drag.startY,
      )
      setLiveSize(next)
    }

    const onUp = (ev: PointerEvent) => {
      const drag = dragRef.current
      dragRef.current = null
      document.body.style.userSelect = ''
      target.releasePointerCapture(ev.pointerId)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (!drag) return
      const next = applyPortraitCornerDrag(
        drag.startSize,
        drag.corner,
        ev.clientX - drag.startX,
        ev.clientY - drag.startY,
      )
      setLiveSize(next)
      onWindowSizeChange(next)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div
      className={`relative flex flex-col overflow-visible rounded-md border-2 bg-black ${borderClass}`}
      style={{ width: liveSize.widthPx }}
    >
      <p className="border-b border-white/10 px-2 py-1 text-center text-[9px] font-semibold uppercase tracking-wide text-white/70">
        {label}
      </p>
      <div
        className="relative flex items-center justify-center bg-black"
        style={{ width: liveSize.widthPx, height: liveSize.heightPx }}
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={label}
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <p className="px-3 text-center text-[11px] text-white/40">No image yet</p>
        )}
        {PORTRAIT_CORNERS.map((handle) => (
          <button
            key={handle.corner}
            type="button"
            aria-label={handle.label}
            title={handle.label}
            onPointerDown={(e) => onCornerPointerDown(handle.corner, e)}
            className={`absolute z-10 h-3.5 w-3.5 rounded-sm border-2 shadow ${handle.className} ${handleClass}`}
            style={{ cursor: handle.cursor, touchAction: 'none' }}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 bg-black/80 px-2 py-2">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={PORTRAIT_ACCEPT_ATTR}
          className="sr-only"
          aria-label={`Choose ${label} from device`}
          onChange={(e) => void onFileChange(e.target.files?.[0])}
        />
        <button
          type="button"
          className={buttonClass}
          disabled={busy}
          onClick={pickFile}
        >
          {busy ? 'Working…' : dataUrl ? 'Change image' : 'Choose image'}
        </button>
        {dataUrl ? (
          <button
            type="button"
            className={buttonClass}
            disabled={busy}
            onClick={() => {
              setError(null)
              onSetPortrait(undefined)
            }}
          >
            Clear
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="border-t border-rose-900/60 bg-rose-950/80 px-2 py-1 text-center text-[10px] text-rose-200">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function IdentityPortraitColumn({
  dualForm,
  portraits,
  portraitWindows,
  morphusActive,
  onSetPortrait,
  onWindowSizeChange,
}: {
  dualForm: boolean
  portraits: { primary?: string; morphus?: string }
  portraitWindows: { primary?: CharacterPortraitWindowSize; morphus?: CharacterPortraitWindowSize }
  morphusActive: boolean
  onSetPortrait: (
    formKey: CharacterPortraitFormKey,
    dataUrl: string | undefined,
    windowSize?: CharacterPortraitWindowSize,
  ) => void
  onWindowSizeChange: (
    formKey: CharacterPortraitFormKey,
    size: CharacterPortraitWindowSize,
  ) => void
}) {
  // Dual-form: one Character Image slot that swaps with active form (Facade ↔ Morphus),
  // matching description/personality — not a stacked pair of both images.
  const formKey: CharacterPortraitFormKey =
    dualForm && morphusActive ? 'morphus' : 'primary'
  const windowSize = resolvePortraitWindowSize(portraitWindows, formKey)
  return (
    <div className="flex flex-col gap-3">
      <IdentityPortraitSlot
        key={formKey}
        formKey={formKey}
        dualForm={dualForm}
        dataUrl={portraits[formKey]}
        windowSize={windowSize}
        morphusActive={morphusActive}
        onSetPortrait={(dataUrl, nextWindow) =>
          onSetPortrait(formKey, dataUrl, nextWindow)
        }
        onWindowSizeChange={(size) => onWindowSizeChange(formKey, size)}
      />
    </div>
  )
}

function IdentityFreeformTextBox({
  label,
  value,
  onChange,
  placeholder,
  morphusActive,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  morphusActive: boolean
}) {
  const fieldId = `identity-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <div
      className={`flex min-h-[7.5rem] flex-1 flex-col rounded-md border-2 ${
        morphusActive
          ? 'border-violet-500 bg-slate-950/50'
          : 'border-slate-700 bg-white'
      }`}
    >
      <label
        htmlFor={fieldId}
        className={`border-b px-2 py-1 text-[10px] font-black uppercase tracking-wider ${
          morphusActive
            ? 'border-violet-800 text-violet-200'
            : 'border-slate-200 text-slate-700'
        }`}
      >
        {label}
      </label>
      <textarea
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={5}
        className={`min-h-[6rem] flex-1 resize-y bg-transparent px-3 py-2 text-sm leading-relaxed outline-none placeholder:italic ${
          morphusActive
            ? 'text-violet-50 placeholder:text-violet-400/70'
            : 'text-slate-900 placeholder:text-slate-400'
        }`}
      />
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
      <p className={identityLabelClass(morphusActive)}>
        {morphusActive ? 'Morphus aliases' : 'Aliases'}
      </p>
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
    supportsDualForm,
    setCharacterName,
    patchIdentityProfile,
    setPortraitShareForPeer,
    addAlias,
    removeAlias,
    renameAlias,
  } = useCharacter()
  const [aliasDraft, setAliasDraft] = useState('')
  const joinRuntime = useMemo(() => getSharedGmClientRuntime(), [])
  const [joinState, setJoinState] = useState<GmClientRuntimeState>(() =>
    joinRuntime.getState(),
  )
  useEffect(() => joinRuntime.subscribe(setJoinState), [joinRuntime])
  const peerShareSeats =
    joinState.status === 'joined'
      ? joinState.seats.filter(
          (s) =>
            isSeatFullyJoined(s) &&
            s.characterId &&
            s.characterId !== character.id,
        )
      : []

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

  const formKey = supportsDualForm && morphusActive ? 'morphus' : 'primary'
  const morphusTraits = useMemo(
    () => resolveActiveMorphusTraits(character),
    [character],
  )
  const displayProfile = useMemo(
    () =>
      resolveIdentityDisplayProfile(
        character.identityProfile,
        formKey,
        morphusTraits,
      ),
    [character.identityProfile, formKey, morphusTraits],
  )
  const storedProfile = normalizeIdentityProfile(character.identityProfile)
  const patch = (fields: Partial<CharacterIdentityFormFields>) =>
    patchIdentityProfile(fields)
  const formAliases = aliasesForForm(character, formKey)
  const morphusTraitBreakdown = useMemo(
    () =>
      supportsDualForm ? buildLiveMorphusIdentityTraitBreakdown(character) : null,
    [supportsDualForm, character],
  )
  const fillInCallouts = useMemo(
    () =>
      supportsDualForm
        ? listMorphusIdentityFillInCallouts(
            character.identityProfile,
            morphusTraits,
          )
        : [],
    [supportsDualForm, character.identityProfile, morphusTraits],
  )

  const raceLabel = activeRace?.name?.trim() ? activeRace.name : '—'
  const occLabel = formatIdentityOccLabel(
    effectiveOcc?.name ?? character.occ.name,
    character.occ.id ?? '',
    character.occSpecializationId ?? undefined,
    effectiveOcc,
  )
  const heightFeetError = identityHeightFeetError(displayProfile.heightFeet)
  const heightInchesError = identityHeightInchesError(displayProfile.heightInches)
  const weightLbsError = identityWeightLbsError(displayProfile.weightLbs)

  const formatGenreStamp = (genreId: string) =>
    genreId.replace(/_/g, ' ').toUpperCase()
  const genreStamp = `${formatGenreStamp(creationGenreId)} → HOST ${formatGenreStamp(hostGenreId)}`
  const alignmentBranch =
    supportsDualForm && morphusActive ? character.morphus : character.primary
  const alignmentLabel = configuratorAlignmentLabel(
    effectiveConfiguratorAlignment(alignmentBranch.alignment),
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
              profile={displayProfile}
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
          {showExpandToggle ? (
            <div className="mb-1 flex items-center justify-end gap-2">
              <button
                type="button"
                className={toggleButtonClass}
                aria-expanded={!collapsed}
                aria-controls="identity-header-details"
                onClick={toggleCollapsed}
              >
                Expand
              </button>
            </div>
          ) : null}
          <div
            id="identity-header-details"
            className="flex min-w-0 flex-nowrap items-baseline gap-x-2 overflow-x-auto pb-0.5"
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
            Identity details (overlay tab / expand): left traits + aliases, center
            freeform Description / Personality (per-form on identityProfile; Morphus
            overlay), right Character Image (+ Morphus traits when Morphus active).
          */}
          {fillInCallouts.length > 0 ? (
            <div
              className="mt-3 rounded-md border border-amber-400/60 bg-amber-950/30 px-3 py-2"
              role="status"
            >
              <p className="text-[10px] font-black uppercase tracking-wide text-amber-200">
                Morphus trait fill-ins needed
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-amber-100/90">
                {fillInCallouts.map((row) => (
                  <li key={row.axis}>{row.message}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div
            className={`mt-4 grid grid-cols-1 gap-4 ${
              morphusActive && supportsDualForm
                ? 'lg:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)_minmax(14rem,max-content)_minmax(10rem,14rem)]'
                : 'lg:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)_minmax(14rem,max-content)]'
            }`}
          >
            <div className="min-w-0">
              <IdentityProfileDetailFields
                profile={displayProfile}
                patch={patch}
                morphusActive={morphusActive}
                heightFeetError={heightFeetError}
                heightInchesError={heightInchesError}
                weightLbsError={weightLbsError}
                layout="stack"
                heightTraitSources={displayProfile.heightTraitSources}
                weightTraitSources={displayProfile.weightTraitSources}
                heightNeedsFillIn={displayProfile.heightNeedsFillIn}
                weightNeedsFillIn={displayProfile.weightNeedsFillIn}
                heightFillInLabels={displayProfile.heightFillInLabels}
                weightFillInLabels={displayProfile.weightFillInLabels}
                heightTraitAltered={displayProfile.heightTraitAltered}
                weightTraitAltered={displayProfile.weightTraitAltered}
              />
              <IdentityAliasesEditor
                aliases={formAliases}
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
              <IdentityFreeformTextBox
                label={
                  supportsDualForm
                    ? morphusActive
                      ? 'Morphus description'
                      : 'Facade description'
                    : 'Description'
                }
                value={displayProfile.description ?? ''}
                onChange={(description) => patch({ description })}
                placeholder={
                  morphusActive
                    ? 'Morphus appearance — build, features, clothing, distinguishing marks…'
                    : 'Physical appearance — build, features, clothing, distinguishing marks…'
                }
                morphusActive={morphusActive}
              />
              <IdentityFreeformTextBox
                label={
                  supportsDualForm
                    ? morphusActive
                      ? 'Morphus personality'
                      : 'Facade personality'
                    : 'Personality'
                }
                value={displayProfile.personality ?? ''}
                onChange={(personality) => patch({ personality })}
                placeholder={
                  morphusActive
                    ? 'How the Morphus acts at the table…'
                    : 'Temperament, habits, quirks, how they act at the table…'
                }
                morphusActive={morphusActive}
              />
            </div>

            <div className="flex min-h-[16rem] flex-col gap-3">
              <IdentityPortraitColumn
                dualForm={supportsDualForm}
                portraits={storedProfile.portraits ?? {}}
                portraitWindows={storedProfile.portraitWindows ?? {}}
                morphusActive={morphusActive}
                onSetPortrait={(portraitFormKey, dataUrl, windowSize) =>
                  patchIdentityProfile(
                    identityProfileWithPortrait(
                      storedProfile,
                      portraitFormKey,
                      dataUrl,
                      windowSize,
                    ),
                  )
                }
                onWindowSizeChange={(portraitFormKey, size) =>
                  patchIdentityProfile({
                    portraitWindows: withPortraitWindowForForm(
                      storedProfile.portraitWindows,
                      portraitFormKey,
                      size,
                    ),
                  })
                }
              />
              {peerShareSeats.length > 0 ? (
                <div
                  className={`rounded-md border-2 px-2 py-2 ${
                    morphusActive
                      ? 'border-violet-800 bg-slate-950/60'
                      : 'border-slate-300 bg-slate-50'
                  }`}
                >
                  <p
                    className={`text-[9px] font-bold uppercase tracking-wide ${
                      morphusActive ? 'text-violet-300' : 'text-slate-600'
                    }`}
                  >
                    Show my image to…
                  </p>
                  <p
                    className={`mt-0.5 text-[10px] ${
                      morphusActive ? 'text-violet-200/80' : 'text-slate-500'
                    }`}
                  >
                    Off until you allow each player. Save to share at the table.
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {peerShareSeats.map((seat) => {
                      const peerId = seat.characterId!
                      const label =
                        peerFacingCharacterName(seat) ?? seat.displayName
                      const allowed = isPortraitSharedWithPeer(
                        character.portraitShareAllowCharacterIds,
                        peerId,
                      )
                      return (
                        <li
                          key={peerId}
                          className="flex items-center justify-between gap-2"
                        >
                          <span
                            className={`truncate text-[11px] font-semibold ${
                              morphusActive ? 'text-violet-50' : 'text-slate-800'
                            }`}
                          >
                            {label}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={allowed}
                            aria-label={`Show my image to ${label}`}
                            onClick={() =>
                              setPortraitShareForPeer(peerId, !allowed)
                            }
                            className={`shrink-0 rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                              allowed
                                ? morphusActive
                                  ? 'bg-violet-600 text-white'
                                  : 'bg-emerald-600 text-white'
                                : morphusActive
                                  ? 'bg-slate-800 text-violet-300'
                                  : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {allowed ? 'On' : 'Off'}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}
            </div>

            {morphusActive && supportsDualForm ? (
              <MorphusIdentityTraitsColumn
                breakdown={morphusTraitBreakdown}
                morphusActive={morphusActive}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

function MorphusIdentityTraitsColumn({
  breakdown,
  morphusActive,
}: {
  breakdown: ReturnType<typeof buildLiveMorphusIdentityTraitBreakdown> | null
  morphusActive: boolean
}) {
  const rows = breakdown?.rows ?? []
  return (
    <div
      className={`flex min-h-[16rem] flex-col rounded-md border-2 px-2 py-2 ${
        morphusActive
          ? 'border-violet-800 bg-slate-950/60'
          : 'border-slate-300 bg-slate-50'
      }`}
      aria-label="Morphus traits from creation"
    >
      <p
        className={`text-[9px] font-bold uppercase tracking-wide ${
          morphusActive ? 'text-violet-300' : 'text-slate-600'
        }`}
      >
        Morphus traits
      </p>
      {breakdown?.sectionTitle || breakdown?.subtitle ? (
        <p
          className={`mt-0.5 text-[10px] ${
            morphusActive ? 'text-violet-200/80' : 'text-slate-500'
          }`}
        >
          {[breakdown.sectionTitle, breakdown.subtitle]
            .filter(Boolean)
            .join(' — ')}
        </p>
      ) : (
        <p
          className={`mt-0.5 text-[10px] ${
            morphusActive ? 'text-violet-200/80' : 'text-slate-500'
          }`}
        >
          From character creation
        </p>
      )}
      {rows.length === 0 ? (
        <p
          className={`mt-3 text-[11px] ${
            morphusActive ? 'text-violet-300/60' : 'text-slate-400'
          }`}
        >
          No Morphus traits on this character yet.
        </p>
      ) : (
        <ul className="mt-2 space-y-2 overflow-y-auto">
          {rows.map((row, index) => (
            <li
              key={`${row.name}-${index}`}
              className={`rounded border px-2 py-1.5 ${
                morphusActive
                  ? 'border-violet-800/80 bg-slate-950/40'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <p
                className={`text-xs font-semibold leading-snug ${
                  morphusActive ? 'text-violet-50' : 'text-slate-900'
                }`}
              >
                {row.name}
              </p>
              {row.tableLabel ? (
                <p
                  className={`mt-0.5 text-[9px] uppercase tracking-wide ${
                    morphusActive ? 'text-violet-300/80' : 'text-slate-500'
                  }`}
                >
                  {row.tableLabel}
                </p>
              ) : null}
              {row.identityHints?.length ? (
                <ul className="mt-1 space-y-0.5">
                  {row.identityHints.map((hint) => (
                    <li
                      key={hint}
                      className={`text-[10px] ${
                        morphusActive ? 'text-amber-200/90' : 'text-amber-800'
                      }`}
                    >
                      {hint}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
