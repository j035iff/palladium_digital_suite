import { useCallback, useMemo } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { FORGE_ATTRIBUTE_KEYS, type ForgeAttrKey } from '../../lib/attributeKeys'
import {
  buildAttributePoolDiceGroups,
  raceAttrFlatBonus,
} from '../../lib/attributePoolGroups'
import { resolveEffectivePalladiumOcc } from '../../lib/occComposition'
import {
  assessPoolSlotIssue,
  attrForPoolSlot,
  CREATION_POOL_DRAG_MIME,
  getEffectivePoolSlots,
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

function poolGroupInnerGridClass(count: number): string {
  if (count <= 1) return 'grid grid-cols-1 gap-2'
  if (count === 2) return 'grid grid-cols-2 gap-2'
  if (count === 3) return 'grid grid-cols-1 gap-2'
  if (count === 4) return 'grid grid-cols-2 gap-2'
  return 'grid grid-cols-2 gap-2 sm:grid-cols-3'
}

export function AttributeForge() {
  const {
    character,
    activeForm,
    activeRace,
    effectiveOcc,
    supportsDualForm,
    setCreationAttributePoolSlot,
  } = useCharacter()

  const poolDrag = useCreationAttributePoolDrag()

  const morphus = supportsDualForm && activeForm === 'morphus'
  const pool = useMemo(
    () => character.creationAttributePool ?? Array.from({ length: 8 }, () => null),
    [character.creationAttributePool],
  )
  const assignments = useMemo(
    () => character.creationAttributeAssignments ?? {},
    [character.creationAttributeAssignments],
  )
  const attrFormulas = activeRace?.attributes
  const poolSlots = useMemo(
    () =>
      getEffectivePoolSlots(
        pool,
        assignments,
        character.creationAttributePoolSlots,
        attrFormulas,
      ),
    [pool, assignments, character.creationAttributePoolSlots, attrFormulas],
  )

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

  const occMin = useCallback(
    (attr: ForgeAttrKey): number | undefined => {
      const reqs = occ?.attributeRequirements as Record<string, number> | undefined
      const key = attr === 'ps' ? 'ps' : attr
      const v = reqs?.[key]
      return typeof v === 'number' && v > 0 ? v : undefined
    },
    [occ],
  )

  const diceGroups = useMemo(
    () => buildAttributePoolDiceGroups(attrFormulas),
    [attrFormulas],
  )

  const hasRaceFlatModifiers = useMemo(
    () =>
      FORGE_ATTRIBUTE_KEYS.some(
        (attr) => raceAttrFlatBonus(attrFormulas, attr) !== 0,
      ),
    [attrFormulas],
  )

  const panelStyle = morphus
    ? 'border-violet-700 bg-slate-950/80 text-violet-50'
    : 'border-blue-200 bg-white text-slate-900'

  const subStyle = morphus
    ? 'border-violet-800 bg-slate-900'
    : 'border-slate-200 bg-slate-50'

  const groupShellStyle = morphus
    ? 'border-violet-600/80 bg-slate-950/50'
    : 'border-slate-800 bg-white'

  const outOfRangeStyle = morphus
    ? 'border-rose-500 bg-rose-950/40 ring-2 ring-rose-500/70'
    : 'border-rose-500 bg-rose-50 ring-2 ring-rose-400/80'

  const handlePoolInput = (
    index: number,
    raw: string,
    bounds: { min: number; max: number },
  ) => {
    const trimmed = raw.trim()
    if (trimmed === '') {
      setCreationAttributePoolSlot(index, null)
      return
    }
    if (!/^\d+$/.test(trimmed)) return
    const n = Number(trimmed)
    if (!Number.isFinite(n) || n < bounds.min || n > bounds.max) return
    setCreationAttributePoolSlot(index, n)
  }

  return (
    <section aria-labelledby="forge-tab-page-heading">
      <p
        className="mb-4 max-w-3xl text-sm leading-snug opacity-90"
        style={{ color: morphus ? '#a5b4fc' : '#475569' }}
      >
        Physical dice priority — type each attribute directly above, or optionally use
        the pool below to record rolls and drag them onto the strip. Pool slots are
        grouped by dice type for this race
        {hasRaceFlatModifiers
          ? ' — enter the dice total only; flat race modifiers apply when you assign'
          : ''}
        . Flat 3D6 (no modifier) accepts extra-dice totals up to 30; flat 2D6 up to 18.
        Formulas with a flat bonus (e.g. 2D6+4) use strict dice limits (2–12 / 3–18). The
        engine does not roll for you (docs/forge/character_creation.md Tab 2).
      </p>

      <div className={`space-y-4 rounded-lg border p-4 ${panelStyle}`}>
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide opacity-80">
            Attribute pool (optional — {pool.length} rolls)
          </h3>
          <div className="flex flex-wrap items-stretch gap-4">
            {diceGroups.map((group) => {
              const { min, max } = group.poolBounds
              const attrHint = group.attrs
                .map((attr) => ATTR_LABELS[attr])
                .join(', ')
              const groupKey = `${group.diceCore}-${group.exceptionalEligible ? 'exc' : 'strict'}`
              return (
                <div
                  key={groupKey}
                  className={`flex min-w-[9rem] flex-1 flex-col rounded-md border-2 p-3 ${groupShellStyle}`}
                >
                  <div className="mb-2 text-center">
                    <p className="font-mono text-sm font-black uppercase tracking-wide">
                      {group.diceCore}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase opacity-60">
                      {min}–{max}
                      {group.exceptionalEligible ? ' · extra dice' : ''}
                    </p>
                    <p className="mt-1 text-[10px] leading-snug opacity-70">
                      {attrHint}
                    </p>
                  </div>
                  <div className={poolGroupInnerGridClass(group.slotCount)}>
                    {Array.from({ length: group.slotCount }, (_, offset) => {
                      const slotIndex = group.slotStart + offset
                      const val = pool[slotIndex] ?? null
                      const usedBy = attrForPoolSlot(poolSlots, slotIndex)
                      const slotIssue = assessPoolSlotIssue(
                        val,
                        slotIndex,
                        poolSlots,
                        pool,
                        attrFormulas,
                        occMin,
                      )
                      return (
                        <div
                          key={slotIndex}
                          draggable={val != null}
                          onDragStart={(e) => {
                            e.dataTransfer.setData(
                              CREATION_POOL_DRAG_MIME,
                              String(slotIndex),
                            )
                            e.dataTransfer.effectAllowed = 'move'
                            poolDrag?.beginPoolDrag(slotIndex)
                          }}
                          onDragEnd={() => {
                            poolDrag?.endPoolDrag()
                          }}
                          className={`rounded-md border p-2 ${subStyle} ${
                            val != null ? 'cursor-grab active:cursor-grabbing' : ''
                          } ${usedBy ? 'ring-2 ring-emerald-500/60' : ''} ${
                            slotIssue ? outOfRangeStyle : ''
                          }`}
                          title={slotIssue ?? undefined}
                        >
                          <label className="flex flex-col gap-1 text-xs">
                            <span className="font-semibold uppercase opacity-70">
                              Roll {offset + 1}
                              {usedBy ? ` → ${ATTR_LABELS[usedBy]}` : ''}
                            </span>
                            <input
                              type="text"
                              inputMode="numeric"
                              autoComplete="off"
                              value={val ?? ''}
                              onChange={(e) =>
                                handlePoolInput(
                                  slotIndex,
                                  e.target.value,
                                  group.poolBounds,
                                )
                              }
                              className={`rounded border px-2 py-1.5 font-mono text-sm ${
                                slotIssue
                                  ? 'border-rose-500 text-rose-700 dark:text-rose-200'
                                  : morphus
                                    ? 'border-violet-700 bg-slate-900 text-violet-100'
                                    : 'border-slate-300 bg-white text-slate-900'
                              }`}
                              placeholder="—"
                              aria-invalid={slotIssue ? true : undefined}
                            />
                            {slotIssue ? (
                              <span className="text-[10px] font-semibold text-rose-500">
                                {slotIssue}
                              </span>
                            ) : null}
                          </label>
                        </div>
                      )
                    })}
                  </div>
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
