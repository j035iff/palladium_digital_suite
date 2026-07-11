import { useCallback, useMemo, useState, type DragEvent } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { resolveEffectivePalladiumOcc } from '../../lib/occComposition'
import type { ForgeAttrKey } from '../../lib/attributeKeys'
import { FORGE_ATTRIBUTE_KEYS } from '../../lib/attributeKeys'
import { poolSlotMatchesAttribute } from '../../lib/attributePoolGroups'
import { isDiceNotation } from '../../lib/diceNotationBounds'
import {
  assessAttributeAssignmentIssue,
  CREATION_POOL_DRAG_MIME,
  getEffectivePoolSlots,
  validatePoolRollAssignment,
} from '../../lib/creationAttributeSync'
import { useCreationAttributePoolDrag } from './CreationAttributePoolDragContext'

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
    setCreationAttributeValue,
    clearCreationAttributeAssignment,
    devMakeAttributeExceptional,
  } = useCharacter()

  const morphus = supportsDualForm && activeForm === 'morphus'
  const pool = character.creationAttributePool ?? Array.from({ length: 8 }, () => null)
  const assignments = character.creationAttributeAssignments ?? {}
  const raceDice = activeRace?.attributes
  const poolSlots = useMemo(
    () =>
      getEffectivePoolSlots(
        pool,
        assignments,
        character.creationAttributePoolSlots,
        raceDice,
      ),
    [pool, assignments, character.creationAttributePoolSlots, raceDice],
  )

  const poolDrag = useCreationAttributePoolDrag()
  const draggingPoolIndex = poolDrag?.draggingPoolIndex ?? null

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

  const handleAttrInput = useCallback(
    (attr: ForgeAttrKey, raw: string) => {
      const trimmed = raw.trim()
      if (trimmed === '') {
        clearCreationAttributeAssignment(attr)
        setDropError(null)
        return
      }
      if (!/^\d+$/.test(trimmed)) return
      const n = Number(trimmed)
      if (!Number.isFinite(n) || n < 1) return
      setCreationAttributeValue(attr, n)
      setDropError(null)
    },
    [clearCreationAttributeAssignment, setCreationAttributeValue],
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
    poolDrag?.endPoolDrag()
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

  const dropCandidateStyle = morphus
    ? 'border-emerald-500/80 bg-emerald-950/25 ring-2 ring-emerald-400/40'
    : 'border-emerald-500 bg-emerald-50/90 ring-2 ring-emerald-400/50'

  return (
    <section
      aria-label="Creation attribute header"
      className="rounded-lg border-2 border-blue-300 bg-sky-50/90 px-4 py-3 dark:border-violet-700 dark:bg-violet-950/40"
    >
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-blue-800 dark:text-violet-300">
        Assign attributes — type a value directly or drag optional pool rolls here
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
          const linkedPoolIndex = poolSlots[attr]
          const poolDiceRoll =
            typeof linkedPoolIndex === 'number' &&
            pool[linkedPoolIndex] != null &&
            Number.isFinite(pool[linkedPoolIndex])
              ? pool[linkedPoolIndex]
              : null
          const assignIssue = assessAttributeAssignmentIssue(
            attr,
            assigned,
            raceDice,
            occMin,
          )
          const isDropTarget = dragOverAttr === attr
          const isValidDropCandidate =
            draggingPoolIndex != null &&
            poolSlotMatchesAttribute(raceDice, draggingPoolIndex, attr) &&
            validatePoolRollAssignment(
              attr,
              draggingPoolIndex,
              pool,
              raceDice,
              occMin,
            ) == null
          const labelTone = morphus ? 'text-violet-300' : 'text-blue-800'
          const diceTone = morphus ? 'text-violet-300/90' : 'text-blue-700/80'
          return (
            <div
              key={attr}
              onDragOver={(e) => {
                if (draggingPoolIndex == null) return
                e.preventDefault()
                e.dataTransfer.dropEffect = isValidDropCandidate ? 'move' : 'none'
                setDragOverAttr(attr)
              }}
              onDragLeave={() => {
                setDragOverAttr((prev) => (prev === attr ? null : prev))
              }}
              onDrop={(e) => onDropAttr(attr, e)}
              className={`relative min-h-[4.5rem] rounded border-2 border-dashed px-2 py-2 transition-colors ${
                assignIssue
                  ? outOfRangeStyle
                  : isDropTarget && isValidDropCandidate
                    ? dropTargetStyle
                    : isValidDropCandidate
                      ? dropCandidateStyle
                      : assigned != null
                        ? morphus
                          ? 'border-emerald-600/50 bg-slate-950/80'
                          : 'border-emerald-500/70 bg-white'
                        : morphus
                          ? 'border-violet-800/80 bg-slate-950/70'
                          : 'border-blue-200 bg-white'
              }`}
              title={
                assignIssue ??
                `Enter a value or drop a pool roll on ${ATTR_LABELS[attr]}`
              }
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

              {poolDiceRoll != null ? (
                <p
                  className="text-center font-mono text-xs font-bold leading-none text-emerald-500 dark:text-emerald-400"
                  aria-label={`Pool roll ${poolDiceRoll}`}
                >
                  ({poolDiceRoll})
                </p>
              ) : null}

              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                aria-label={`${ATTR_LABELS[attr]} score`}
                aria-invalid={assignIssue ? true : undefined}
                value={assigned ?? ''}
                onChange={(e) => handleAttrInput(attr, e.target.value)}
                placeholder="—"
                className={`my-1 w-full border-0 border-b-2 bg-transparent text-center font-mono font-bold leading-none tabular-nums outline-none transition-colors ${
                  assigned != null ? 'text-lg' : 'text-sm'
                } ${
                  assignIssue
                    ? morphus
                      ? 'border-rose-500 text-rose-200'
                      : 'border-rose-500 text-rose-700'
                    : assigned != null
                      ? morphus
                        ? 'border-violet-600 text-violet-50 focus:border-violet-400'
                        : 'border-slate-300 text-slate-900 focus:border-blue-600'
                      : morphus
                        ? 'border-violet-800/80 text-violet-400/75 focus:border-violet-400'
                        : 'border-slate-200 text-slate-400 focus:border-blue-500'
                }`}
              />

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

              {import.meta.env.DEV && devMakeAttributeExceptional ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    devMakeAttributeExceptional(attr)
                    setDropError(null)
                  }}
                  className="mt-1 w-full rounded border border-amber-600/80 bg-amber-50 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-900 hover:bg-amber-100 dark:border-amber-500 dark:bg-amber-950/50 dark:text-amber-100 dark:hover:bg-amber-900/60"
                  title="Dev only — random 17–30 (capped by race dice)"
                >
                  Make exceptional
                </button>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
