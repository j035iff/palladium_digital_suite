import type { ReactNode } from 'react'
import { sanitizeIdentityHeightInchesInput } from '../../lib/characterIdentity'
import {
  CREATION_FORGE_DETAILS_ROW_CLASS,
  creationForgeDetailInputClass,
  creationForgeDetailLabelClass,
} from './creationForgeHeaderTheme'

/** Shared label column — tight to the field, wide enough for "Weight". */
const DETAIL_LABEL_COL = '2.5rem'
/** Left-column text fields (Sex / Eyes / Hair). */
const LEFT_DETAIL_INPUT_CH = 8
/** Space between left field ends and right-column labels. */
const DETAIL_COLUMN_BRIDGE = '0.75rem'

function CreationForgeDetailLabel({
  label,
  morphusActive,
}: {
  label: string
  morphusActive: boolean
}) {
  return (
    <span className={`self-center ${creationForgeDetailLabelClass(morphusActive)}`}>
      {label}
    </span>
  )
}

export function CreationForgeDetailsGrid({
  morphusActive,
  profile,
  onPatch,
  heightError,
}: {
  morphusActive: boolean
  profile: {
    sex: string
    age: string
    heightFeet: string
    heightInches: string
    weightLbs: string
    eyes: string
    hair: string
  }
  onPatch: (fields: Partial<typeof profile>) => void
  heightError?: string | null
}) {
  const inputClass = creationForgeDetailInputClass(morphusActive)
  const suffixClass = 'shrink-0 text-[0.85em] font-medium uppercase leading-none text-slate-500'

  const fieldInput = (props: {
    value: string
    onChange: (v: string) => void
    inputMode?: 'text' | 'numeric'
    minWidthCh: number
    ariaLabel?: string
  }) => {
    const widthCh = Math.max(props.minWidthCh, props.value.length)
    return (
      <input
        type="text"
        inputMode={props.inputMode}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        aria-label={props.ariaLabel}
        size={widthCh}
        style={{ width: `${widthCh}ch` }}
        className={inputClass}
      />
    )
  }

  const detailsGridTemplate = `${DETAIL_LABEL_COL} minmax(${LEFT_DETAIL_INPUT_CH}ch, max-content) ${DETAIL_COLUMN_BRIDGE} ${DETAIL_LABEL_COL} max-content`

  return (
    <div
      className={`inline-grid gap-x-1 gap-y-1 ${CREATION_FORGE_DETAILS_ROW_CLASS}`}
      style={{ gridTemplateColumns: detailsGridTemplate }}
    >
      <CreationForgeDetailLabel label="Sex" morphusActive={morphusActive} />
      {fieldInput({
        value: profile.sex,
        onChange: (sex) => onPatch({ sex }),
        minWidthCh: LEFT_DETAIL_INPUT_CH,
      })}
      <span aria-hidden />
      <CreationForgeDetailLabel label="Age" morphusActive={morphusActive} />
      {fieldInput({
        value: profile.age,
        onChange: (age) => onPatch({ age }),
        inputMode: 'numeric',
        minWidthCh: 3,
      })}

      <CreationForgeDetailLabel label="Eyes" morphusActive={morphusActive} />
      {fieldInput({
        value: profile.eyes,
        onChange: (eyes) => onPatch({ eyes }),
        minWidthCh: LEFT_DETAIL_INPUT_CH,
      })}
      <span aria-hidden />
      <CreationForgeDetailLabel label="Height" morphusActive={morphusActive} />
      <div
        className="flex items-baseline gap-1"
        title={heightError ?? undefined}
      >
        {fieldInput({
          value: profile.heightFeet,
          onChange: (heightFeet) => onPatch({ heightFeet }),
          inputMode: 'numeric',
          minWidthCh: 2,
          ariaLabel: 'Height feet',
        })}
        <span className={suffixClass}>ft</span>
        {fieldInput({
          value: profile.heightInches,
          onChange: (heightInches) =>
            onPatch({ heightInches: sanitizeIdentityHeightInchesInput(heightInches) }),
          inputMode: 'numeric',
          minWidthCh: 2,
          ariaLabel: 'Height inches',
        })}
        <span className={suffixClass}>in</span>
      </div>

      <CreationForgeDetailLabel label="Hair" morphusActive={morphusActive} />
      {fieldInput({
        value: profile.hair,
        onChange: (hair) => onPatch({ hair }),
        minWidthCh: LEFT_DETAIL_INPUT_CH,
      })}
      <span aria-hidden />
      <CreationForgeDetailLabel label="Weight" morphusActive={morphusActive} />
      <div className="flex items-baseline gap-1">
        {fieldInput({
          value: profile.weightLbs,
          onChange: (weightLbs) => onPatch({ weightLbs }),
          inputMode: 'numeric',
          minWidthCh: 4,
        })}
        <span className={suffixClass}>lbs</span>
      </div>
    </div>
  )
}
