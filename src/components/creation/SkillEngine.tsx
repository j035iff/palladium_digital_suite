import { useMemo, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import type { EngineSkillDef, SkillCategory } from '../../data/library/skills'
import { getSkillById } from '../../data/library/skills'
import { listCreationSkillLibrary } from '../../lib/creationSkillCatalog'
import { aggregateSkillModifiers } from '../../lib/skillModifiers'
import { maPbScaledBonuses, type SkillEquationSkill } from '../../lib/skillEquation'
import {
  buildSkillPercentContext,
  resolveSkillPercent,
} from '../../lib/skillPercentResolution'
import {
  missingPrerequisiteMessage,
  prerequisiteSatisfied,
} from '../../lib/skillPrerequisites'
import { computeLiveBonuses } from '../../lib/characterDerived'
import { isOccRelatedSkillAllowed } from '../../lib/occCreationDerivation'
import {
  formatOccCoreSkillEntry,
  occGrantsDefaultHandToHand,
} from '../../lib/occComposition'
import {
  applyPsychicOccSkillBonusPercent,
  rawOccSkillBonusPercent,
  resolveOccSkillBonusPercent,
} from '../../lib/creationPsychicSkills'
import { resolveCreationOccSkillIds } from '../../lib/occCoreSkillVouchers'
import { OccCoreSkillVoucherPanel } from './OccCoreSkillVoucherPanel'

const CATEGORIES: Array<SkillCategory | 'All'> = [
  'All',
  'Technical',
  'Physical',
  'Pilot',
  'Espionage',
  'Weapon',
  'Misc',
]

const EMPTY_SKILL_IDS: string[] = []

function buildEquationInput(
  def: EngineSkillDef,
  selectedIds: ReadonlySet<string>,
  occBonus: number,
): SkillEquationSkill {
  let synergy = def.synergyBonuses ?? 0
  if (def.id === 'skill_astronomy' && selectedIds.has('skill_math_advanced')) {
    synergy += 10
  }
  return {
    basePercent: def.basePercent,
    perLevel: def.perLevel,
    acquisitionLevel: def.acquisitionLevel,
    occBonus,
    synergyBonuses: synergy,
    scaledAttBonuses: def.scaledAttBonuses,
    statusModifiers: def.statusModifiers,
  }
}

function pendingPhysicalFromModifiers(ids: ReadonlySet<string>) {
  const mods = aggregateSkillModifiers([...ids])
  return {
    sdc: mods.sdc ?? 0,
    ps: mods.ps ?? 0,
    pp: mods.pp ?? 0,
    pe: mods.pe ?? 0,
    spd: mods.spd ?? 0,
  }
}

export function SkillEngine() {
  const {
    character,
    activeForm,
    activeFormState,
    effectiveOcc,
    occCreationDerived,
    supportsDualForm,
    skillSlotMultiplier,
    morphusSurfaceType,
    psychicTier,
    setCreationSkillPicks,
    hostGenreId,
  } = useCharacter()

  const morphus = supportsDualForm && activeForm === 'morphus'
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<SkillCategory | 'All'>('All')

  const occSelected = character.creationOccSkillIds ?? EMPTY_SKILL_IDS
  const relatedSelected = character.creationRelatedSkillIds ?? EMPTY_SKILL_IDS
  const voucherPicks = character.creationOccCoreVoucherPicks ?? {}

  const resolvedOccSkillIds = useMemo(
    () =>
      resolveCreationOccSkillIds(
        effectiveOcc,
        character.occSpecializationId,
        occSelected,
        voucherPicks,
      ),
    [effectiveOcc, character.occSpecializationId, occSelected, voucherPicks],
  )

  const setOccSelected = (next: string[]) => {
    setCreationSkillPicks(next, relatedSelected)
  }
  const setRelatedSelected = (next: string[]) => {
    setCreationSkillPicks(occSelected, next)
  }

  const occBudget =
    occCreationDerived?.occSkillSlotBudget ?? character.occSkillSlotBudget ?? 8
  const relatedBase =
    occCreationDerived?.occRelatedSkillSlotBudget ??
    character.occRelatedSkillSlotBudget ??
    10
  const relatedCap = Math.floor(relatedBase * skillSlotMultiplier)

  const allSelected = useMemo(
    () => new Set([...resolvedOccSkillIds, ...relatedSelected]),
    [resolvedOccSkillIds, relatedSelected],
  )

  const relatedSet = useMemo(() => new Set(relatedSelected), [relatedSelected])

  const attrs = activeFormState.attributes
  const iqBonus = useMemo(
    () => computeLiveBonuses(attrs).iqOccSkillPercent,
    [attrs],
  )
  const maPbBonus = useMemo(() => maPbScaledBonuses(attrs.ma, attrs.pb), [attrs])

  const skillPercentCtx = useMemo(
    () =>
      buildSkillPercentContext(
        character,
        activeForm,
        iqBonus,
        maPbBonus,
        morphusSurfaceType,
      ),
    [character, activeForm, iqBonus, maPbBonus, morphusSurfaceType],
  )

  const pendingPhysical = useMemo(
    () => pendingPhysicalFromModifiers(allSelected),
    [allSelected],
  )

  const skillLibrary = useMemo(
    () => listCreationSkillLibrary(hostGenreId),
    [hostGenreId],
  )

  const filteredLibrary = useMemo(() => {
    const q = search.trim().toLowerCase()
    return skillLibrary.filter((s) => {
      const catOk = category === 'All' || s.category === category
      const nameOk =
        q === '' ||
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      return catOk && nameOk
    })
  }, [search, category, skillLibrary])

  const panelStyle = morphus
    ? 'border-violet-700 bg-slate-950/80 text-violet-50'
    : 'border-blue-200 bg-white text-slate-900'
  const subStyle = morphus
    ? 'border-violet-800 bg-slate-900'
    : 'border-slate-200 bg-slate-50'

  function addOcc(id: string) {
    const def = getSkillById(id)
    if (!def || def.slotKind !== 'occ') return
    if (occSelected.includes(id)) return
    if (occSelected.length >= occBudget) return
    setOccSelected([...occSelected, id])
  }

  function addRelated(id: string) {
    const def = getSkillById(id)
    if (!def || def.slotKind !== 'occ_related') return
    if (relatedSelected.includes(id)) return
    if (relatedSelected.length >= relatedCap) return
    if (
      effectiveOcc &&
      !isOccRelatedSkillAllowed(
        effectiveOcc,
        id,
        def.category,
        character.occSpecializationId,
      )
    ) {
      return
    }
    setRelatedSelected([...relatedSelected, id])
  }

  function removeOcc(id: string) {
    setOccSelected(occSelected.filter((s) => s !== id))
  }

  function removeRelated(id: string) {
    setRelatedSelected(relatedSelected.filter((s) => s !== id))
  }

  return (
    <section className="w-full" aria-labelledby="forge-tab-page-heading">
      <p
        className="mb-4 max-w-3xl text-sm leading-snug opacity-90"
        style={{ color: morphus ? '#a5b4fc' : '#475569' }}
      >
        Master Skill Equation, slot budgets, and dependency gates (skill_selection.md). Major
        psychics apply <strong>0.5×</strong> to O.C.C. related skill slots and O.C.C. skill bonus
        % (floor; psychic_gate.md §2).
      </p>

      {effectiveOcc?.occSkillsCore.length ? (
        <div
          className={`mb-4 rounded-lg border px-3 py-2 text-xs ${
            morphus ? 'border-violet-800 bg-slate-900/60' : 'border-blue-200 bg-blue-50/80'
          }`}
        >
          <p className="font-bold uppercase tracking-wide opacity-80">
            O.C.C. core skills (granted)
          </p>
          <p className="mt-1 font-mono opacity-90">
            {effectiveOcc.occSkillsCore.map((s) => formatOccCoreSkillEntry(s)).join(' · ')}
          </p>
        </div>
      ) : null}

      {effectiveOcc && !occGrantsDefaultHandToHand(effectiveOcc) ? (
        <div
          className={`mb-4 rounded-lg border px-3 py-2 text-xs ${
            morphus ? 'border-amber-700/80 bg-amber-950/40' : 'border-amber-400 bg-amber-50'
          }`}
        >
          <p className="font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Hand-to-Hand required
          </p>
          <p className="mt-1 text-xs opacity-90">
            No starting fighting style — buy hand-to-hand with related skill slots if desired.
          </p>
        </div>
      ) : null}

      {effectiveOcc?.occRelatedSkills.categoryRules.length ? (
        <div
          className={`mb-4 rounded-lg border px-3 py-2 text-[10px] ${
            morphus ? 'border-violet-800 text-violet-200' : 'border-slate-600'
          }`}
        >
          <p className="font-bold uppercase tracking-wide opacity-80">
            Related skill category rules
          </p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 font-mono">
            {effectiveOcc.occRelatedSkills.categoryRules.map((r) => {
              const rawBonus = r.bonusPercent
              const effectiveBonus = applyPsychicOccSkillBonusPercent(
                rawBonus,
                psychicTier,
              )
              const halved =
                psychicTier === 'major' && effectiveBonus !== rawBonus
              return (
              <li key={r.categoryName}>
                {r.categoryName}: {r.accessType} (+{halved ? effectiveBonus : rawBonus}%
                {halved ? ` — book +${rawBonus}% halved for Major psychic` : ''})
                {r.skillSpecificOverrides &&
                Object.keys(r.skillSpecificOverrides).length > 0
                  ? ` · overrides: ${Object.entries(r.skillSpecificOverrides)
                      .map(([id, pct]) => {
                        const eff = applyPsychicOccSkillBonusPercent(pct, psychicTier)
                        return halved && eff !== pct
                          ? `${id} +${eff}% (book +${pct}%)`
                          : `${id} +${pct}%`
                      })
                      .join(', ')}`
                  : ''}
                {r.exceptions?.length ? ` (exceptions: ${r.exceptions.join(', ')})` : ''}
              </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      <OccCoreSkillVoucherPanel />

      <div
        className={`mb-4 grid gap-3 rounded-lg border p-4 sm:grid-cols-2 ${panelStyle}`}
        aria-label="Skill slot tracker"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">
            O.C.C. skills
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums">
            {occSelected.length} / {occBudget}
          </p>
          <p className="text-xs opacity-75">Standard progression unless O.C.C. dictates otherwise.</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">
            O.C.C. related skills
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums">
            {relatedSelected.length} / {relatedCap}
          </p>
          <p className="text-xs opacity-75">
            Base budget {relatedBase} × multiplier <strong>{skillSlotMultiplier}</strong>
            {skillSlotMultiplier < 1 ? ' (Major psychic tax)' : ''} → floor to integer slots.
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search skills…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`min-w-[200px] flex-1 rounded-md border px-3 py-2 text-sm ${
            morphus
              ? 'border-violet-700 bg-slate-900 text-violet-50'
              : 'border-slate-300 bg-white text-slate-900'
          }`}
          aria-label="Filter skills by name"
        />
        <label className="flex items-center gap-2 text-sm">
          <span className="opacity-70">Category</span>
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as SkillCategory | 'All')
            }
            className={`rounded-md border px-2 py-2 text-sm ${
              morphus
                ? 'border-violet-700 bg-slate-900 text-violet-50'
                : 'border-slate-300 bg-white'
            }`}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className={`space-y-2 rounded-lg border p-3 lg:col-span-1 ${panelStyle}`}>
          <h3 className="text-xs font-bold uppercase tracking-wide opacity-80">
            Library
          </h3>
          <ul className="max-h-[420px] space-y-2 overflow-y-auto text-sm">
            {filteredLibrary.map((s) => {
              const inOcc = occSelected.includes(s.id)
              const inRel = relatedSelected.includes(s.id)
              const inAny = inOcc || inRel
              const prereqOk = prerequisiteSatisfied(s.prerequisite, allSelected)
              const warn = inAny && !prereqOk
              const occFull = occSelected.length >= occBudget
              const relFull = relatedSelected.length >= relatedCap
              const relatedBlocked =
                s.slotKind === 'occ_related' &&
                effectiveOcc != null &&
                !isOccRelatedSkillAllowed(
                  effectiveOcc,
                  s.id,
                  s.category,
                  character.occSpecializationId,
                )

              return (
                <li
                  key={s.id}
                  className={`rounded-md border p-2 ${subStyle} ${
                    warn ? 'border-amber-500/70 ring-1 ring-amber-500/40' : ''
                  }`}
                >
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs opacity-60">{s.category}</div>
                  {warn ? (
                    <p
                      className="mt-1 text-xs font-semibold text-amber-500"
                      title={missingPrerequisiteMessage(s.prerequisite, allSelected) ?? ''}
                    >
                      Missing Prerequisite — still visible (Pillar 8).
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.slotKind === 'occ' ? (
                      <button
                        type="button"
                        disabled={inOcc || occFull}
                        className="rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
                        onClick={() => addOcc(s.id)}
                      >
                        + O.C.C.
                      </button>
                    ) : null}
                    {s.slotKind === 'occ_related' ? (
                      <>
                        <button
                          type="button"
                          disabled={inRel || relFull || relatedBlocked}
                          className="rounded bg-violet-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
                          onClick={() => addRelated(s.id)}
                        >
                          + Related
                        </button>
                        {relatedBlocked ? (
                          <span className="text-[10px] text-rose-500">
                            Blocked by O.C.C. category rules
                          </span>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <div className={`space-y-3 rounded-lg border p-3 lg:col-span-1 ${panelStyle}`}>
          <h3 className="text-xs font-bold uppercase tracking-wide opacity-80">
            Selected
          </h3>
          <div>
            <p className="mb-1 text-xs opacity-70">O.C.C.</p>
            <ul className="space-y-1">
              {occSelected.map((id) => (
                <li
                  key={id}
                  className={`flex items-center justify-between rounded border px-2 py-1 text-sm ${subStyle}`}
                >
                  {getSkillById(id)?.name ?? id}
                  <button
                    type="button"
                    className="text-xs text-rose-400 hover:underline"
                    onClick={() => removeOcc(id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-xs opacity-70">O.C.C. related</p>
            <ul className="space-y-1">
              {relatedSelected.map((id) => {
                const def = getSkillById(id)
                const bad =
                  def && !prerequisiteSatisfied(def.prerequisite, allSelected)
                return (
                  <li
                    key={id}
                    className={`flex items-center justify-between rounded border px-2 py-1 text-sm ${subStyle} ${
                      bad ? 'border-amber-500/60' : ''
                    }`}
                  >
                    <span>
                      {def?.name ?? id}
                      {bad ? (
                        <span
                          className="ml-1 text-amber-500"
                          title={
                            missingPrerequisiteMessage(
                              def?.prerequisite,
                              allSelected,
                            ) ?? ''
                          }
                        >
                          ⚠
                        </span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      className="text-xs text-rose-400 hover:underline"
                      onClick={() => removeRelated(id)}
                    >
                      Remove
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <aside className={`h-fit space-y-4 rounded-lg border p-4 ${panelStyle}`}>
          <h3 className="text-xs font-bold uppercase tracking-wide opacity-80">
            Mirror — equation & staging
          </h3>
          <p className="text-xs opacity-75">
            Physical skill <strong>modifiers</strong> (Boxing, Wrestling, etc.) apply to
            attributes and S.D.C. on <strong>Spawn</strong> (skill_selection.md §4).
          </p>

          <div className={`rounded-md border p-3 text-sm ${subStyle}`}>
            <p className="text-xs font-bold uppercase opacity-70">Pending physical</p>
            <ul className="mt-2 space-y-1 font-mono text-xs">
              <li>S.D.C. +{pendingPhysical.sdc}</li>
              <li>P.S. +{pendingPhysical.ps}</li>
              <li>P.P. +{pendingPhysical.pp}</li>
              <li>P.E. +{pendingPhysical.pe}</li>
              <li>Spd +{pendingPhysical.spd}</li>
            </ul>
            <p className="mt-2 text-xs opacity-60">Preview — committed when you Spawn.</p>
          </div>

          <div className={`rounded-md border p-3 text-sm ${subStyle}`}>
            <p className="text-xs font-bold uppercase opacity-70">
              Skill % (Master Equation)
            </p>
            <p className="mt-1 text-xs opacity-70">
              I.Q. bonus to sheet skills:{' '}
              <span className="font-mono font-semibold">
                {iqBonus >= 0 ? '+' : ''}
                {iqBonus}%
              </span>
              {' · '}
              M.A./P.B. scaled:{' '}
              <span className="font-mono font-semibold">
                {maPbBonus >= 0 ? '+' : ''}
                {maPbBonus}%
              </span>
            </p>
            <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-xs">
              {[...resolvedOccSkillIds, ...relatedSelected].map((id) => {
                const def = getSkillById(id)
                if (!def) return null
                const occBonus = resolveOccSkillBonusPercent(
                  effectiveOcc,
                  id,
                  relatedSet,
                  psychicTier,
                  character.occSpecializationId,
                )
                const rawBonus = rawOccSkillBonusPercent(
                  effectiveOcc,
                  id,
                  relatedSet,
                  character.occSpecializationId,
                )
                const input = buildEquationInput(def, allSelected, occBonus)
                const resolved = resolveSkillPercent(
                  { ...input, id: def.id },
                  skillPercentCtx,
                )
                return (
                  <li key={id} className="border-b border-white/10 pb-2 last:border-0">
                    <div className="font-semibold">{def.name}</div>
                    {rawBonus > 0 && psychicTier === 'major' && occBonus !== rawBonus ? (
                      <p className="text-[10px] opacity-70">
                        O.C.C. bonus +{occBonus}% (book +{rawBonus}%, Major halved)
                      </p>
                    ) : null}
                    <div className="font-mono tabular-nums opacity-90">
                      {resolved.impossibleInMorphus ? (
                        <>
                          Final %: <strong>Impossible</strong>
                        </>
                      ) : (
                        <>
                          Final % ≈ <strong>{resolved.total}%</strong>
                        </>
                      )}
                    </div>
                    {resolved.lines.length > 0 ? (
                      <ul className="mt-1 space-y-0.5 font-mono text-[10px] opacity-75">
                        {resolved.lines.map((line) => (
                          <li key={line.label}>
                            {line.label}: {line.value >= 0 ? '+' : ''}
                            {line.value}%
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  )
}
