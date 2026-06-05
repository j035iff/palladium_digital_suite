import { useCallback, useMemo } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { FORGE_ATTRIBUTE_KEYS, type ForgeAttrKey } from '../../lib/attributeKeys'
import { resolveEffectivePalladiumOcc } from '../../lib/occComposition'
import {
  assessPoolSlotIssue,
  attrForPoolSlot,
  CREATION_POOL_DRAG_MIME,
  getEffectivePoolSlots,
  raceAttrNotation,
} from '../../lib/creationAttributeSync'
import { attributePoolNotationBounds } from '../../lib/diceNotationBounds'

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

export function AttributeForge() {
  const {
    character,
    activeForm,
    activeRace,
    effectiveOcc,
    supportsDualForm,
    setCreationAttributePoolSlot,
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

  const poolInputMax = useMemo(() => {
    let max = 1
    for (const attr of FORGE_ATTRIBUTE_KEYS) {
      const { max: attrMax } = attributePoolNotationBounds(
        raceAttrNotation(attrFormulas, attr),
      )
      max = Math.max(max, attrMax)
    }
    return max
  }, [attrFormulas])

  const panelStyle = morphus
    ? 'border-violet-700 bg-slate-950/80 text-violet-50'
    : 'border-blue-200 bg-white text-slate-900'

  const subStyle = morphus
    ? 'border-violet-800 bg-slate-900'
    : 'border-slate-200 bg-slate-50'

  const outOfRangeStyle = morphus
    ? 'border-rose-500 bg-rose-950/40 ring-2 ring-rose-500/70'
    : 'border-rose-500 bg-rose-50 ring-2 ring-rose-400/80'

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

  const handlePoolInput = (index: number, raw: string) => {
    const trimmed = raw.trim()
    if (trimmed === '') {
      setCreationAttributePoolSlot(index, null)
      return
    }
    if (!/^\d+$/.test(trimmed)) return
    const n = Number(trimmed)
    if (!Number.isFinite(n) || n < 1 || n > poolInputMax) return
    setCreationAttributePoolSlot(index, n)
  }

  return (
    <section aria-labelledby="forge-tab-page-heading">
      <p
        className="mb-4 max-w-3xl text-sm leading-snug opacity-90"
        style={{ color: morphus ? '#a5b4fc' : '#475569' }}
      >
        Physical dice priority — type each rolled total below, then drag it onto the
        attribute strip above. Flat 3D6 accepts exceptional totals up to 30;
        flat 2D6 up to 18. The engine does not roll for you (forge-character_creation.md
        Tab 2).
      </p>

      <div className={`space-y-4 rounded-lg border p-4 ${panelStyle}`}>
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide opacity-80">
            Attribute pool (8 rolls)
          </h3>
          <div className="grid gap-2 sm:grid-cols-4">
            {pool.map((val, i) => {
              const usedBy = attrForPoolSlot(poolSlots, i)
              const slotIssue = assessPoolSlotIssue(
                val,
                i,
                poolSlots,
                pool,
                attrFormulas,
                occMin,
              )
              return (
                <div
                  key={i}
                  draggable={val != null}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(CREATION_POOL_DRAG_MIME, String(i))
                    e.dataTransfer.effectAllowed = 'move'
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
                      Roll {i + 1}
                      {usedBy ? ` → ${ATTR_LABELS[usedBy]}` : ''}
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={val ?? ''}
                      onChange={(e) => handlePoolInput(i, e.target.value)}
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

        {diceGroups.length > 1 ? (
          <p className="text-xs opacity-80">
            Dice groups:{' '}
            {diceGroups
              .map(([notation, attrs]) => {
                const { min, max } = attributePoolNotationBounds(notation)
                return `${notation} ${min}–${max} (${attrs.map((a) => ATTR_LABELS[a]).join(', ')})`
              })
              .join(' · ')}
          </p>
        ) : null}

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
