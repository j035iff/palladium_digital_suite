import { useCallback, useMemo, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { FORGE_ATTRIBUTE_KEYS, type ForgeAttrKey } from '../../lib/attributeKeys'
import { resolveEffectivePalladiumOcc } from '../../lib/occComposition'
import {
  raceAttrNotation,
  valueFitsRaceNotation,
} from '../../lib/creationAttributeSync'
import { diceNotationBounds } from '../../lib/diceNotationBounds'

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

function poolIndexForAttr(
  assignments: Partial<Record<ForgeAttrKey, number>>,
  pool: readonly (number | null)[],
  attr: ForgeAttrKey,
): number {
  const target = assignments[attr]
  if (target == null) return -1
  return pool.findIndex((v) => v === target)
}

export function AttributeForge() {
  const {
    character,
    activeForm,
    activeRace,
    effectiveOcc,
    supportsDualForm,
    setCreationAttributePoolSlot,
    setCreationAttributeAssignment,
    clearCreationAttributeAssignment,
  } = useCharacter()

  const morphus = supportsDualForm && activeForm === 'morphus'
  const pool = character.creationAttributePool ?? Array.from({ length: 8 }, () => null)
  const assignments = character.creationAttributeAssignments ?? {}

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

  const [dragPoolIndex, setDragPoolIndex] = useState<number | null>(null)
  const [dropError, setDropError] = useState<string | null>(null)

  const attrFormulas = activeRace?.attributes

  const occMin = useCallback(
    (attr: ForgeAttrKey): number | undefined => {
      const reqs = occ?.attributeRequirements as Record<string, number> | undefined
      const key = attr === 'ps' ? 'ps' : attr
      const v = reqs?.[key]
      return typeof v === 'number' && v > 0 ? v : undefined
    },
    [occ],
  )

  const tryAssign = useCallback(
    (attr: ForgeAttrKey, poolIndex: number) => {
      const value = pool[poolIndex]
      if (value == null || !Number.isFinite(value)) {
        setDropError('Pool slot is empty.')
        return
      }
      const min = occMin(attr)
      if (min != null && value < min) {
        setDropError(
          `${ATTR_LABELS[attr]} requires at least ${min} for this O.C.C.`,
        )
        return
      }
      const notation = raceAttrNotation(attrFormulas, attr)
      if (!valueFitsRaceNotation(value, notation)) {
        const { min: nMin, max: nMax } = diceNotationBounds(notation)
        setDropError(
          `${value} is outside ${notation} range (${nMin}–${nMax}) for ${ATTR_LABELS[attr]}.`,
        )
        return
      }
      const prevIndex = poolIndexForAttr(assignments, pool, attr)
      if (prevIndex >= 0 && prevIndex !== poolIndex) {
        // swap handled by reassignment
      }
      for (const a of FORGE_ATTRIBUTE_KEYS) {
        if (a !== attr && poolIndexForAttr(assignments, pool, a) === poolIndex) {
          clearCreationAttributeAssignment(a)
        }
      }
      setCreationAttributeAssignment(attr, value)
      setDropError(null)
    },
    [
      pool,
      assignments,
      occMin,
      attrFormulas,
      setCreationAttributeAssignment,
      clearCreationAttributeAssignment,
    ],
  )

  const onDropAttr = (attr: ForgeAttrKey) => {
    if (dragPoolIndex == null) return
    tryAssign(attr, dragPoolIndex)
    setDragPoolIndex(null)
  }

  const panelStyle = morphus
    ? 'border-violet-700 bg-slate-950/80 text-violet-50'
    : 'border-blue-200 bg-white text-slate-900'

  const subStyle = morphus
    ? 'border-violet-800 bg-slate-900'
    : 'border-slate-200 bg-slate-50'

  const diceGroups = useMemo(() => {
    const groups = new Map<string, ForgeAttrKey[]>()
    for (const attr of FORGE_ATTRIBUTE_KEYS) {
      const notation =
        attrFormulas?.[attr === 'ps' ? 'ps' : attr]?.toString() ?? '3D6'
      const list = groups.get(notation) ?? []
      list.push(attr)
      groups.set(notation, list)
    }
    return [...groups.entries()]
  }, [attrFormulas])

  return (
    <section aria-labelledby="forge-heading">
      <h2
        id="forge-heading"
        className="mb-1 text-sm font-semibold uppercase tracking-wide"
        style={{ color: morphus ? '#c4b5fd' : '#1e40af' }}
      >
        Phase I: Attribute Pool &amp; Allocation
      </h2>
      <p
        className="mb-4 max-w-3xl text-sm leading-snug opacity-90"
        style={{ color: morphus ? '#a5b4fc' : '#475569' }}
      >
        Physical dice priority — enter your rolled totals in the pool, then drag each value
        onto an attribute. The engine does not roll for you (forge-character_creation.md Tab 2).
      </p>

      <div className={`space-y-4 rounded-lg border p-4 ${panelStyle}`}>
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide opacity-80">
            Attribute pool (8 rolls)
          </h3>
          <div className="grid gap-2 sm:grid-cols-4">
            {pool.map((val, i) => {
              const usedBy = FORGE_ATTRIBUTE_KEYS.find(
                (a) => poolIndexForAttr(assignments, pool, a) === i,
              )
              return (
                <div
                  key={i}
                  draggable={val != null}
                  onDragStart={() => setDragPoolIndex(i)}
                  onDragEnd={() => setDragPoolIndex(null)}
                  className={`rounded-md border p-2 ${subStyle} ${
                    val != null ? 'cursor-grab active:cursor-grabbing' : ''
                  } ${usedBy ? 'ring-2 ring-emerald-500/60' : ''}`}
                >
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-semibold uppercase opacity-70">
                      Roll {i + 1}
                      {usedBy ? ` → ${ATTR_LABELS[usedBy]}` : ''}
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={48}
                      value={val ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value
                        setCreationAttributePoolSlot(
                          i,
                          raw === '' ? null : Number(raw),
                        )
                      }}
                      className={`rounded border px-2 py-1.5 font-mono text-sm ${
                        morphus
                          ? 'border-violet-700 bg-slate-900 text-violet-100'
                          : 'border-slate-300 bg-white text-slate-900'
                      }`}
                      placeholder="—"
                    />
                  </label>
                </div>
              )
            })}
          </div>
        </div>

        {diceGroups.length > 1 ? (
          <p className="text-xs opacity-80">
            Dice groups:{' '}
            {diceGroups
              .map(([notation, attrs]) =>
                `${notation} (${attrs.map((a) => ATTR_LABELS[a]).join(', ')})`,
              )
              .join(' · ')}
          </p>
        ) : null}

        {dropError ? (
          <p className="text-sm font-semibold text-rose-500" role="alert">
            {dropError}
          </p>
        ) : null}

        <div className={`rounded-md border p-4 ${subStyle}`}>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide opacity-80">
            Assign to attributes (drag pool roll or pick)
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {FORGE_ATTRIBUTE_KEYS.map((attr) => {
              const min = occMin(attr)
              const assigned = assignments[attr]
              return (
                <div
                  key={attr}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    onDropAttr(attr)
                  }}
                  className={`rounded border-2 border-dashed p-3 ${
                    morphus
                      ? 'border-violet-600/50 bg-slate-950/40'
                      : 'border-blue-300/80 bg-sky-50/50'
                  }`}
                >
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide">
                      {ATTR_LABELS[attr]}
                    </span>
                    {min != null ? (
                      <span className="text-[10px] font-bold text-rose-600">
                        min {min}
                      </span>
                    ) : null}
                  </div>
                  <p className="mb-2 font-mono text-lg font-bold tabular-nums">
                    {assigned ?? '—'}
                  </p>
                  <select
                    className={`w-full rounded border px-2 py-1 text-xs font-mono ${
                      morphus
                        ? 'border-violet-700 bg-slate-900 text-violet-100'
                        : 'border-slate-300 bg-white'
                    }`}
                    value={
                      poolIndexForAttr(assignments, pool, attr) >= 0
                        ? String(poolIndexForAttr(assignments, pool, attr))
                        : ''
                    }
                    onChange={(e) => {
                      const raw = e.target.value
                      if (raw === '') {
                        clearCreationAttributeAssignment(attr)
                        setDropError(null)
                        return
                      }
                      tryAssign(attr, Number(raw))
                    }}
                  >
                    <option value="">— from pool —</option>
                    {pool.map((v, i) =>
                      v != null ? (
                        <option key={i} value={i}>
                          Roll {i + 1}: {v}
                        </option>
                      ) : null,
                    )}
                  </select>
                </div>
              )
            })}
          </div>
        </div>

        {supportsDualForm ? (
          <p className="text-xs opacity-80">
            Active form: <strong className="capitalize">{activeForm}</strong> —
            assignments sync to this branch.
          </p>
        ) : null}
      </div>
    </section>
  )
}
