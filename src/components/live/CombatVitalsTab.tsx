import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { ManualRollField } from '../combat/ManualRollField'
import {
  buildCombatDamagePools,
  isFrontCombatAbsorbPool,
  moveCombatPoolInOrder,
  type CombatDamagePoolCard,
  type CombatDamagePoolId,
} from '../../lib/combatDamagePools'
import type { ActiveForm, Character, InventoryItem } from '../../types'

type Props = {
  morphus: boolean
  character: Character
  activeForm: ActiveForm
  inventoryItems: InventoryItem[]
  equippedArmorId: string | null
  naturalAr: number | null
  absorbOrder: CombatDamagePoolId[]
  onAbsorbOrderChange: (next: CombatDamagePoolId[]) => void
  applySdcPriorityVitality: (opts: {
    mode: 'damage' | 'heal'
    amount: number
    useAttackRollVsArmor?: boolean
    attackRoll?: number
    directToHitPoints?: boolean
    bypassArmor?: boolean
    absorbOrder?: readonly string[] | null
  }) => void
}

/**
 * Combat → Vitals: damage-capacity cards (L→R absorb) + Apply Damage/Heal.
 */
export function CombatVitalsTab({
  morphus,
  character,
  activeForm,
  inventoryItems,
  equippedArmorId,
  naturalAr,
  absorbOrder,
  onAbsorbOrderChange,
  applySdcPriorityVitality,
}: Props) {
  const [amount, setAmount] = useState('4')
  const [mode, setMode] = useState<'damage' | 'heal'>('damage')
  const [directToHp, setDirectToHp] = useState(false)
  const [bypassArmor, setBypassArmor] = useState(false)
  const [resolveOpen, setResolveOpen] = useState(false)
  const [resolveDamage, setResolveDamage] = useState('4')
  const [resolveAttackRollStr, setResolveAttackRollStr] = useState('')
  const [expandedArmor, setExpandedArmor] = useState(false)
  const [dragId, setDragId] = useState<CombatDamagePoolId | null>(null)

  const snapshot = useMemo(
    () =>
      buildCombatDamagePools({
        character,
        activeForm,
        inventory: inventoryItems,
        equippedArmorId,
        naturalAr,
        absorbOrder,
      }),
    [character, activeForm, inventoryItems, equippedArmorId, naturalAr, absorbOrder],
  )

  useEffect(() => {
    const ids = snapshot.order.join('|')
    const cur = absorbOrder.join('|')
    if (ids !== cur) onAbsorbOrderChange(snapshot.order)
  }, [snapshot.order, absorbOrder, onAbsorbOrderChange])

  useEffect(() => {
    if (!resolveOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setResolveOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [resolveOpen])

  /** Nested light outlines inside the tab-body frame (mockup hierarchy). */
  const nestedOutline = morphus
    ? 'rounded-lg border-2 border-violet-500/70 bg-slate-950/50'
    : 'rounded-lg border-2 border-sky-300 bg-white'

  const hudArmor = snapshot.pools.find((p) => p.kind === 'armor') ?? null

  const trimmedResolveRoll = resolveAttackRollStr.trim()
  const resolveRollParsed = Number(trimmedResolveRoll)
  const resolveAttackRollInvalid =
    Boolean(hudArmor) &&
    trimmedResolveRoll.length > 0 &&
    !Number.isFinite(resolveRollParsed)

  const applyVitality = () => {
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0) return
    applySdcPriorityVitality({
      mode,
      amount: n,
      useAttackRollVsArmor: false,
      directToHitPoints: directToHp,
      bypassArmor: mode === 'damage' ? bypassArmor : false,
      absorbOrder: snapshot.order,
    })
  }

  const applyResolvedDamage = () => {
    const n = Number(resolveDamage)
    if (!Number.isFinite(n) || n <= 0) return
    if (resolveAttackRollInvalid) return
    const useRoll =
      Boolean(hudArmor) &&
      trimmedResolveRoll.length > 0 &&
      Number.isFinite(resolveRollParsed)
    applySdcPriorityVitality({
      mode: 'damage',
      amount: n,
      useAttackRollVsArmor: useRoll,
      attackRoll: useRoll ? resolveRollParsed : undefined,
      absorbOrder: snapshot.order,
    })
    setResolveOpen(false)
  }

  const onDropOn = (targetId: CombatDamagePoolId) => {
    if (!dragId || dragId === targetId) {
      setDragId(null)
      return
    }
    if (!isFrontCombatAbsorbPool(dragId) || !isFrontCombatAbsorbPool(targetId)) {
      setDragId(null)
      return
    }
    const toIndex = snapshot.order.indexOf(targetId)
    if (toIndex < 0) {
      setDragId(null)
      return
    }
    onAbsorbOrderChange(moveCombatPoolInOrder(snapshot.order, dragId, toIndex))
    setDragId(null)
  }

  return (
    <div className="space-y-3" aria-label="Combat vitals">
      <div className={`space-y-2 p-3 ${nestedOutline}`} aria-label="Damage pools">
        <p
          className={`text-[10px] leading-snug ${morphus ? 'text-violet-300/90' : 'text-slate-600'}`}
        >
          Damage pools absorb left → right. Drag shields/armor to reorder them; S.D.C. then H.P.
          stay fixed at the end. Shields and armor appear only when present.
        </p>

        <div
          className="flex flex-wrap gap-2"
          role="list"
          aria-label="Damage capacity absorb order"
        >
          {snapshot.pools.map((pool) => {
            const reorderable = isFrontCombatAbsorbPool(pool.id)
            return (
              <DamagePoolCard
                key={pool.id}
                pool={pool}
                morphus={morphus}
                reorderable={reorderable}
                expandedArmor={expandedArmor && pool.kind === 'armor'}
                onToggleArmorExpand={
                  pool.kind === 'armor'
                    ? () => setExpandedArmor((o) => !o)
                    : undefined
                }
                dragging={dragId === pool.id}
                onDragStart={() => {
                  if (reorderable) setDragId(pool.id)
                }}
                onDragEnd={() => setDragId(null)}
                onDragOver={(e) => {
                  if (reorderable) e.preventDefault()
                }}
                onDrop={() => onDropOn(pool.id)}
              />
            )
          })}
        </div>
      </div>

      <div className={`p-3 ${nestedOutline}`}>
        <h3
          className={`mb-2 text-[10px] font-black uppercase tracking-wider ${
            morphus ? 'text-violet-200' : 'text-blue-800'
          }`}
        >
          Apply damage / heal
        </h3>
        <div className="mb-2 flex flex-wrap gap-3 text-xs font-semibold">
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="radio"
              name="combat-vitals-mode"
              checked={mode === 'damage'}
              onChange={() => setMode('damage')}
            />
            Damage
          </label>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="radio"
              name="combat-vitals-mode"
              checked={mode === 'heal'}
              onChange={() => setMode('heal')}
            />
            Heal
          </label>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={directToHp}
              onChange={(e) => setDirectToHp(e.target.checked)}
            />
            Direct to hit points
          </label>
          {mode === 'damage' ? (
            <label
              className={`flex items-center gap-1.5 ${
                hudArmor
                  ? 'cursor-pointer'
                  : morphus
                    ? 'cursor-not-allowed text-violet-400/50'
                    : 'cursor-not-allowed text-slate-400'
              }`}
              title={
                hudArmor
                  ? 'Skip equipped armor — damage starts at the next pool to its right. Does not bypass Natural A.R.'
                  : 'No equipped armor — Bypass A.R. has no effect.'
              }
            >
              <input
                type="checkbox"
                checked={bypassArmor && Boolean(hudArmor)}
                disabled={!hudArmor}
                onChange={(e) => setBypassArmor(e.target.checked)}
              />
              Bypass A.R.
              {!hudArmor ? (
                <span className="text-[10px] font-normal normal-case tracking-normal">
                  (no equipped armor)
                </span>
              ) : null}
            </label>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setResolveDamage(amount)
              setResolveAttackRollStr('')
              setResolveOpen(true)
            }}
            className={`rounded-md px-3 py-2 text-[10px] font-black uppercase tracking-wide ${
              morphus
                ? 'border-2 border-violet-400 bg-violet-950 text-violet-100 hover:bg-violet-900'
                : 'border-2 border-slate-400 bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            Resolve combat
          </button>
        </div>
        <ManualRollField
          label={mode === 'heal' ? 'Heal amount' : 'Damage amount'}
          morphus={morphus}
          manualValue={amount}
          onManualValueChange={setAmount}
          calculatedBonus={0}
          hint="Total points to apply (physical dice first)."
        />
        <button
          type="button"
          onClick={applyVitality}
          className={`mt-3 w-full rounded-md py-2.5 text-sm font-black uppercase tracking-wide ${
            morphus
              ? 'bg-violet-600 text-white hover:bg-violet-500'
              : 'bg-blue-700 text-white hover:bg-blue-600'
          }`}
        >
          {mode === 'heal' ? 'Apply heal' : 'Apply damage'}
        </button>
      </div>

      {resolveOpen ? (
        <div
          className="fixed inset-0 z-[60] flex justify-end bg-black/45 p-2 backdrop-blur-[1px]"
          role="presentation"
          onClick={() => setResolveOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Resolve combat"
            className={`mt-auto h-[min(92vh,560px)] w-full max-w-md overflow-y-auto rounded-t-2xl border-2 shadow-2xl md:mt-0 md:h-auto md:self-center md:rounded-2xl ${
              morphus
                ? 'border-violet-400 bg-slate-950 text-violet-50'
                : 'border-blue-500 bg-white text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`flex items-center justify-between border-b-2 px-4 py-3 ${
                morphus ? 'border-violet-700' : 'border-blue-200'
              }`}
            >
              <div>
                <h3
                  className={`text-xs font-black uppercase tracking-wide ${morphus ? 'text-violet-200' : 'text-blue-900'}`}
                >
                  Resolve combat
                </h3>
                <p
                  className={`mt-0.5 text-[10px] leading-snug ${morphus ? 'text-violet-300/90' : 'text-slate-600'}`}
                >
                  Enter your physical attack roll and damage. A.R. compares to equipped armor when
                  present.
                </p>
              </div>
              <button
                type="button"
                className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold uppercase ${
                  morphus ? 'text-violet-200 hover:bg-violet-900' : 'text-slate-600 hover:bg-slate-100'
                }`}
                onClick={() => setResolveOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="space-y-4 p-4">
              {hudArmor ? (
                <p
                  className={`rounded-md border px-2 py-1.5 text-[10px] font-semibold ${morphus ? 'border-teal-700/80 bg-violet-950/60 text-teal-100' : 'border-teal-200 bg-teal-50 text-teal-950'}`}
                >
                  A.R. gate: equipped <strong>{hudArmor.armorName}</strong> A.R.{' '}
                  {hudArmor.armorAr}. Roll <strong>≥ A.R.</strong> to hit the body directly; below
                  applies to armor S.D.C. first.
                </p>
              ) : (
                <p className={`text-[10px] ${morphus ? 'text-violet-300' : 'text-slate-600'}`}>
                  No operational armor — attack roll is recorded for your notes only; damage routes
                  to body pools.
                </p>
              )}
              <ManualRollField
                label="Physical die — attack / strike total"
                morphus={morphus}
                manualValue={resolveAttackRollStr}
                onManualValueChange={setResolveAttackRollStr}
                calculatedBonus={0}
                hint={
                  hudArmor
                    ? `Compare to A.R. ${hudArmor.armorAr} (optional; leave empty to skip A.R. routing).`
                    : 'Optional scratch field for the die you rolled.'
                }
              />
              {resolveAttackRollInvalid ? (
                <p className="text-[10px] font-bold text-red-600">
                  Enter a numeric roll, or clear the field.
                </p>
              ) : null}
              <ManualRollField
                label="Damage to apply"
                morphus={morphus}
                manualValue={resolveDamage}
                onManualValueChange={setResolveDamage}
                calculatedBonus={0}
                hint="Physical damage from the hit (dice on the table, not auto-rolled)."
              />
              <button
                type="button"
                disabled={resolveAttackRollInvalid}
                onClick={applyResolvedDamage}
                className={`w-full rounded-md py-2.5 text-sm font-black uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-40 ${
                  morphus
                    ? 'bg-violet-600 text-white hover:bg-violet-500'
                    : 'bg-blue-700 text-white hover:bg-blue-600'
                }`}
              >
                Apply routed damage
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function DamagePoolCard({
  pool,
  morphus,
  reorderable,
  expandedArmor,
  onToggleArmorExpand,
  dragging,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  pool: CombatDamagePoolCard
  morphus: boolean
  reorderable: boolean
  expandedArmor?: boolean
  onToggleArmorExpand?: () => void
  dragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onDragOver: (e: DragEvent) => void
  onDrop: () => void
}) {
  const pct = pool.maximum > 0 ? Math.min(100, (pool.current / pool.maximum) * 100) : 0
  const shell = morphus
    ? 'border-violet-500/80 bg-slate-950/90'
    : 'border-slate-300 bg-white'

  return (
    <div
      role="listitem"
      draggable={reorderable}
      onDragStart={(e) => {
        if (!reorderable) {
          e.preventDefault()
          return
        }
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', pool.id)
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={(e) => {
        e.preventDefault()
        onDrop()
      }}
      className={`min-w-[9.5rem] flex-1 basis-[9.5rem] rounded-lg border-2 p-3 ${shell} ${
        reorderable ? 'cursor-grab active:cursor-grabbing' : ''
      } ${dragging ? 'opacity-60 ring-2 ring-offset-1' : ''}`}
      aria-label={
        reorderable
          ? `${pool.label} ${pool.current} of ${pool.maximum}. Drag to reorder absorb priority.`
          : `${pool.label} ${pool.current} of ${pool.maximum}. Fixed absorb order.`
      }
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={`text-[10px] font-black uppercase tracking-wide ${
            morphus ? 'text-violet-200' : 'text-blue-900'
          }`}
        >
          {pool.label}
        </p>
        {pool.kind === 'armor' && pool.armorAr != null ? (
          <p
            className={`text-[10px] font-bold tabular-nums ${morphus ? 'text-teal-200' : 'text-teal-800'}`}
          >
            A.R. {pool.armorAr}
          </p>
        ) : null}
        {(pool.kind === 'sdc' || pool.kind === 'hp' || pool.kind === 'mdc') &&
        pool.naturalAr != null ? (
          <p
            className={`text-[10px] font-bold tabular-nums ${morphus ? 'text-amber-200' : 'text-slate-700'}`}
          >
            Natural A.R. {pool.naturalAr}
          </p>
        ) : null}
      </div>
      <p
        className={`mt-1 font-mono text-xl font-black tabular-nums ${
          morphus ? 'text-violet-50' : 'text-slate-900'
        }`}
      >
        {pool.current}
        <span className="opacity-60"> / </span>
        {pool.maximum}
      </p>
      <div
        className={`mt-2 h-2 w-full overflow-hidden rounded-full ${
          morphus ? 'bg-slate-900' : 'bg-blue-100'
        }`}
        role="progressbar"
        aria-valuenow={pool.current}
        aria-valuemin={0}
        aria-valuemax={pool.maximum}
        aria-label={`${pool.label} pool`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${pct}%`,
            background: morphus
              ? 'linear-gradient(90deg,#a78bfa,#5b21b6)'
              : pool.kind === 'hp'
                ? 'linear-gradient(90deg,#f87171,#b91c1c)'
                : pool.kind === 'mdc'
                  ? 'linear-gradient(90deg,#fbbf24,#b45309)'
                  : 'linear-gradient(90deg,#60a5fa,#1d4ed8)',
          }}
        />
      </div>

      {pool.kind === 'armor' && onToggleArmorExpand ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={onToggleArmorExpand}
            className={`rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wide ${
              morphus
                ? 'border border-violet-400 text-violet-100 hover:bg-violet-900'
                : 'border border-blue-400 text-blue-900 hover:bg-blue-50'
            }`}
            aria-expanded={expandedArmor}
          >
            {expandedArmor ? 'Collapse' : 'Expand'}
          </button>
          {expandedArmor ? (
            <div
              className={`mt-2 space-y-1 rounded-md border px-2 py-2 text-[10px] leading-snug ${
                morphus
                  ? 'border-violet-700 bg-slate-950/80 text-violet-100'
                  : 'border-blue-200 bg-blue-50/90 text-slate-800'
              }`}
            >
              <p>
                <span className="opacity-70">A.R.: </span>
                <span className="font-mono font-bold">{pool.armorAr ?? '—'}</span>
              </p>
              <p>
                <span className="opacity-70">Armor S.D.C.: </span>
                <span className="font-mono font-bold">
                  {pool.current}/{pool.maximum}
                </span>
              </p>
              {pool.armorWeightLbs != null ? (
                <p>
                  <span className="opacity-70">Weight: </span>
                  <span className="font-mono font-bold">{pool.armorWeightLbs} lbs</span>
                </p>
              ) : null}
              {pool.armorMorphusCompatible != null ? (
                <p>
                  <span className="opacity-70">Morphus fit: </span>
                  {pool.armorMorphusCompatible ? 'Compatible' : 'Not Morphus-compatible'}
                </p>
              ) : null}
              {pool.armorHumanSized ? (
                <p className="opacity-80">Human / Facade silhouette — may restrict Morphus.</p>
              ) : null}
              <p className="pt-1 font-semibold opacity-80">Special features</p>
              <p className="opacity-70">No special features listed on this armor.</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
