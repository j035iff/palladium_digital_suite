import { useCallback, useMemo, useState, type DragEvent } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { resolveEffectivePalladiumOcc } from '../../lib/occComposition'
import type { ForgeAttrKey } from '../../lib/attributeKeys'
import { FORGE_ATTRIBUTE_KEYS } from '../../lib/attributeKeys'
import { isDiceNotation } from '../../lib/diceNotationBounds'
import {
  assessAttributeAssignmentIssue,
  CREATION_POOL_DRAG_MIME,
  getEffectivePoolSlots,
  validatePoolRollAssignment,
} from '../../lib/creationAttributeSync'

const ATTR_LABELS: Record<ForgeAttrKey, string> = {
  iq: 'I.Q.',
  me: 'M.E.',
  ma: 'M.A.',
  ps: 'P.S.',
  pp: 'P.P.',
  pe: 'P.E.',
  pb: 'P.B.',
  spd: 'Spd',
}

function bonusDisplay(raw: number | string | undefined): string | null {
  if (raw == null) return null
  if (typeof raw === 'number') return raw >= 0 ? `+${raw}` : String(raw)
  if (isDiceNotation(raw)) return `+${raw}`
  return String(raw)
}

export function CreationAttributeHeader() {
  const {
    activeRace,
    effectiveOcc,
    character,
    supportsDualForm,
    activeForm,
    setCreationAttributeAssignment,
  } = useCharacter()

  const morphus = supportsDualForm && activeForm === 'morphus'
  const pool = character.creationAttributePool ?? Array.from({ length: 8 }, () => null)
  const assignments = character.creationAttributeAssignments ?? {}
  const poolSlots = useMemo(
    () =>
      getEffectivePoolSlots(
        pool,
        assignments,
        character.creationAttributePoolSlots,
      ),
    [pool, assignments, character.creationAttributePoolSlots],
  )

  const [dropError, setDropError] = useState<string | null>(null)
  const [dragOverAttr, setDragOverAttr] = useState<ForgeAttrKey | null>(null)

  const occ = useMemo(
    () =>
      effectiveOcc
        ? resolveEffectivePalladiumOcc(
            effectiveOcc,
            character.occSpecializationId,
          )
        : undefined,
    [effectiveOcc, character.occSpecializationId],
  )

  const raceDice = activeRace?.attributes
  const reqs = occ?.attributeRequirements as Record<string, number> | undefined
  const attrBonuses = occ?.staticBonuses?.attributes

  const occMin = useCallback(
    (attr: ForgeAttrKey): number | undefined => {
      const key = attr === 'ps' ? 'ps' : attr
      const v = reqs?.[key]
      return typeof v === 'number' && v > 0 ? v : undefined
    },
    [reqs],
  )

  const tryAssign = useCallback(
    (attr: ForgeAttrKey, poolIndex: number) => {
      const err = validatePoolRollAssignment(
        attr,
        poolIndex,
        pool,
        raceDice,
        occMin,
      )
      if (err) {
        setDropError(`${ATTR_LABELS[attr]}: ${err}`)
        return
      }
      setCreationAttributeAssignment(attr, poolIndex)
      setDropError(null)
    },
    [pool, raceDice, occMin, setCreationAttributeAssignment],
  )

  const onDropAttr = (attr: ForgeAttrKey, e: DragEvent) => {
    e.preventDefault()
    setDragOverAttr(null)
    const raw = e.dataTransfer.getData(CREATION_POOL_DRAG_MIME)
    if (raw === '') return
    const poolIndex = Number(raw)
    if (!Number.isFinite(poolIndex)) return
    tryAssign(attr, poolIndex)
  }

  const outOfRangeStyle = morphus
    ? 'border-rose-500 bg-rose-950/40 ring-2 ring-rose-500/70'
    : 'border-rose-500 bg-rose-50 ring-2 ring-rose-400/80'

  const dropTargetStyle = morphus
    ? 'border-violet-500 bg-violet-950/50 ring-2 ring-violet-400/60'
    : 'border-blue-500 bg-blue-50 ring-2 ring-blue-400/60'

  return (
    <section
      aria-label="Creation attribute header"
      className="rounded-lg border-2 border-blue-300 bg-sky-50/90 px-4 py-3 dark:border-violet-700 dark:bg-violet-950/40"
    >
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-blue-800 dark:text-violet-300">
        Assign attributes — drag pool rolls here (Live Ledger mirrors totals after you
        continue)
      </p>
      {dropError ? (
        <p className="mb-2 text-xs font-semibold text-rose-600 dark:text-rose-400" role="alert">
          {dropError}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {FORGE_ATTRIBUTE_KEYS.map((attr) => {
          const dice =
            raceDice?.[attr === 'ps' ? 'ps' : attr]?.toString() ?? '3D6'
          const min = reqs?.[attr === 'ps' ? 'ps' : attr]
          const bonus = bonusDisplay(attrBonuses?.[attr])
          const assigned = assignments[attr]
          const assignIssue = assessAttributeAssignmentIssue(
            attr,
            assigned,
            raceDice,
            occMin,
          )
          const isDropTarget = dragOverAttr === attr
          const labelTone = morphus ? 'text-violet-300' : 'text-blue-800'
          const diceTone = morphus ? 'text-violet-300/90' : 'text-blue-700/80'
          const valueTone =
            assigned != null
              ? morphus
                ? 'text-violet-50'
                : 'text-slate-900'
              : morphus
                ? 'text-violet-400/75'
                : 'text-slate-400'
          return (
            <div
              key={attr}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setDragOverAttr(attr)
              }}
              onDragLeave={() => {
                setDragOverAttr((prev) => (prev === attr ? null : prev))
              }}
              onDrop={(e) => onDropAttr(attr, e)}
              className={`relative min-h-[4.5rem] rounded border-2 border-dashed px-2 py-2 transition-colors ${
                assignIssue
                  ? outOfRangeStyle
                  : isDropTarget
                    ? dropTargetStyle
                    : assigned != null
                      ? morphus
                        ? 'border-emerald-600/50 bg-slate-950/80'
                        : 'border-emerald-500/70 bg-white'
                      : morphus
                        ? 'border-violet-800/80 bg-slate-950/70'
                        : 'border-blue-200 bg-white'
              }`}
              title={assignIssue ?? `Drop a pool roll on ${ATTR_LABELS[attr]}`}
            >
              {min != null && min > 0 ? (
                <span
                  className="absolute -top-1.5 right-1 z-10 rounded bg-rose-600 px-1.5 py-px text-[9px] font-black leading-none text-white"
                  title="O.C.C. minimum"
                >
                  {min}+
                </span>
              ) : null}

              <div className="flex items-baseline justify-between gap-1">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide ${labelTone}`}
                >
                  {ATTR_LABELS[attr]}
                </span>
                <span
                  className={`shrink-0 font-mono text-[10px] font-semibold uppercase ${diceTone}`}
                >
                  {dice}
                </span>
              </div>

              <p
                className={`my-1 text-center font-mono text-sm font-bold leading-none tabular-nums ${valueTone}`}
              >
                {assigned ?? '—'}
              </p>

              {bonus ? (
                <p className="text-center font-mono text-xs font-bold text-emerald-500 dark:text-emerald-400">
                  {bonus}
                </p>
              ) : null}

              {assignIssue ? (
                <p className="mt-0.5 text-center text-[9px] font-semibold leading-tight text-rose-500">
                  {assignIssue}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
