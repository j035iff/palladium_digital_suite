import { useMemo, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { canReloadWeapon, spareAmmoForWeapon } from '../../lib/ammoPools'
import { WeaponReloadControl } from './WeaponReloadControl'
import type { Armor, InventoryItem, Weapon } from '../../types'

function isArmor(it: InventoryItem): it is Armor {
  return it.itemType === 'armor'
}

function isWeapon(it: InventoryItem): it is Weapon {
  return it.itemType === 'weapon'
}

const ARMOR_TEMPLATES: Array<{
  label: string
  name: string
  ar: number
  maxSdc: number
  weightLbs: number
  morphusCompatible: boolean
  humanSized: boolean
}> = [
  {
    label: 'Concealed vest',
    name: 'Concealed ballistic vest',
    ar: 6,
    maxSdc: 18,
    weightLbs: 4,
    morphusCompatible: true,
    humanSized: true,
  },
  {
    label: 'Tactical suit',
    name: 'Tactical body armor',
    ar: 10,
    maxSdc: 40,
    weightLbs: 12,
    morphusCompatible: true,
    humanSized: false,
  },
  {
    label: 'Heavy plates',
    name: 'Assault plates + carrier',
    ar: 14,
    maxSdc: 70,
    weightLbs: 22,
    morphusCompatible: false,
    humanSized: true,
  },
]

/**
 * Armory — add/remove body armor, equip/unequip (A.R. + armor S.D.C. feed Combat HUD).
 */
export function Armory() {
  const {
    inventoryItems,
    equippedArmorId,
    equipArmor,
    addArmorToInventory,
    dropItem,
    activeForm,
    readyWeaponIds,
    setReadyWeapon,
    reloadWeapon,
    ammoPools,
    addAmmoToPool,
  } = useCharacter()

  const morphus = activeForm === 'morphus'
  const [customName, setCustomName] = useState('')
  const [customAr, setCustomAr] = useState('10')
  const [customMaxSdc, setCustomMaxSdc] = useState('35')
  const [customWeight, setCustomWeight] = useState('10')
  const [customHumanSized, setCustomHumanSized] = useState(false)
  const [customMorphOk, setCustomMorphOk] = useState(true)
  const [ammoAddRounds, setAmmoAddRounds] = useState('12')
  const [ammoPoolPick, setAmmoPoolPick] = useState('Handguns')

  const ammoPoolRows = useMemo(() => Object.entries(ammoPools), [ammoPools])

  const armors = useMemo(
    () => inventoryItems.filter(isArmor),
    [inventoryItems],
  )
  const weapons = useMemo(
    () => inventoryItems.filter(isWeapon),
    [inventoryItems],
  )

  const shell = morphus
    ? 'border-2 border-violet-500 bg-slate-950/90 text-violet-50'
    : 'border-2 border-blue-600 bg-white text-slate-900'
  const th = morphus ? 'text-violet-200' : 'text-blue-900'
  const muted = morphus ? 'text-violet-300/90' : 'text-slate-600'
  const btn = morphus
    ? 'rounded-md border-2 border-violet-300 bg-violet-800 px-2 py-1 text-[11px] font-black uppercase text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-35'
    : 'rounded-md border-2 border-blue-600 bg-blue-600 px-2 py-1 text-[11px] font-black uppercase text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-35'
  const btnGhost = morphus
    ? 'rounded-md border-2 border-violet-500/80 bg-transparent px-2 py-1 text-[11px] font-bold uppercase text-violet-200 hover:bg-violet-950/80'
    : 'rounded-md border-2 border-slate-400 bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase text-slate-800 hover:bg-slate-200'
  const btnDanger = morphus
    ? 'rounded-md border-2 border-rose-500/80 bg-rose-950/50 px-2 py-1 text-[11px] font-black uppercase text-rose-100 hover:bg-rose-900/70'
    : 'rounded-md border-2 border-rose-600 bg-rose-600 px-2 py-1 text-[11px] font-black uppercase text-white hover:bg-rose-500'

  const inputCls = morphus
    ? 'w-full rounded-md border-2 border-violet-600 bg-slate-950 px-2 py-1.5 font-mono text-xs text-violet-50'
    : 'w-full rounded-md border-2 border-slate-300 bg-white px-2 py-1.5 font-mono text-xs text-slate-900'

  const addCustomArmor = () => {
    const ar = Number(customAr)
    const maxSdc = Number(customMaxSdc)
    const weightLbs = Number(customWeight)
    if (!Number.isFinite(ar) || !Number.isFinite(maxSdc) || !Number.isFinite(weightLbs)) return
    addArmorToInventory({
      name: customName.trim() || 'Custom armor',
      ar,
      maxSdc,
      weightLbs,
      morphusCompatible: customMorphOk,
      humanSized: customHumanSized,
    })
  }

  return (
    <section
      className={`rounded-xl p-4 shadow-lg ${shell}`}
      aria-labelledby="armory-heading"
    >
      <h2
        id="armory-heading"
        className={`mb-1 text-sm font-black uppercase tracking-[0.18em] ${th}`}
      >
        Armory
      </h2>
      <p className={`mb-4 text-[11px] font-semibold leading-snug ${muted}`}>
        Body armor drives the A.R. gate on the tactical HUD: attack totals below A.R. chew armor
        S.D.C. first; at or above A.R., damage goes to your body S.D.C. (combat_logic.md).
      </p>

      <div
        className={`mb-5 rounded-lg border-2 p-3 ${
          morphus ? 'border-amber-500/70 bg-amber-950/30' : 'border-orange-400/90 bg-orange-50/70'
        }`}
      >
        <h3 className={`mb-2 text-[11px] font-black uppercase tracking-wider ${th}`}>
          Ammo &amp; consumables
        </h3>
        <p className={`mb-3 text-[11px] leading-snug ${muted}`}>
          Spare rounds are pooled by weapon category. Adding ammo here immediately enables reload on
          the tactical HUD.
        </p>
        <ul className="mb-3 space-y-2">
          {ammoPoolRows.map(([key, pool]) => (
            <li
              key={key}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-2 py-1.5 ${
                morphus ? 'border-violet-700 bg-slate-900/50' : 'border-blue-200 bg-white'
              }`}
            >
              <div>
                <p className={`text-xs font-bold ${th}`}>{key}</p>
                <p className={`text-[10px] ${muted}`}>{pool.label}</p>
              </div>
              <p className={`font-mono text-sm font-black tabular-nums ${th}`}>
                {pool.spareRounds} rds
              </p>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-end gap-2">
          <label className={`block text-[10px] font-bold uppercase ${muted}`}>
            Pool
            <select
              className={`mt-0.5 min-w-[8rem] ${inputCls}`}
              value={ammoPoolPick}
              onChange={(e) => setAmmoPoolPick(e.target.value)}
            >
              {ammoPoolRows.map(([key]) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </label>
          <label className={`block text-[10px] font-bold uppercase ${muted}`}>
            Rounds
            <input
              className={`mt-0.5 w-20 ${inputCls}`}
              value={ammoAddRounds}
              onChange={(e) => setAmmoAddRounds(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <button
            type="button"
            className={btn}
            onClick={() => addAmmoToPool(ammoPoolPick, Number(ammoAddRounds))}
          >
            Add rounds
          </button>
          {ammoPoolRows.map(([key]) => (
            <button
              key={`mag-${key}`}
              type="button"
              className={btnGhost}
              onClick={() => addAmmoToPool(key, 12)}
            >
              +1 mag ({key})
            </button>
          ))}
        </div>
      </div>

      <div
        className={`mb-5 rounded-lg border-2 border-dashed p-3 ${morphus ? 'border-violet-600/80 bg-slate-900/50' : 'border-blue-300/90 bg-blue-50/40'}`}
      >
        <h3 className={`mb-2 text-[11px] font-black uppercase tracking-wider ${th}`}>
          Add armor
        </h3>
        <div className="mb-3 flex flex-wrap gap-2">
          {ARMOR_TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              className={btnGhost}
              onClick={() => {
                const { label: _l, ...rest } = t
                addArmorToInventory(rest)
              }}
            >
              + {t.label}
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className={`block text-[10px] font-bold uppercase ${muted}`}>
            Name
            <input
              className={`mt-0.5 ${inputCls}`}
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Ceramic inserts"
            />
          </label>
          <label className={`block text-[10px] font-bold uppercase ${muted}`}>
            A.R.
            <input
              className={`mt-0.5 ${inputCls}`}
              value={customAr}
              onChange={(e) => setCustomAr(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <label className={`block text-[10px] font-bold uppercase ${muted}`}>
            Max S.D.C.
            <input
              className={`mt-0.5 ${inputCls}`}
              value={customMaxSdc}
              onChange={(e) => setCustomMaxSdc(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <label className={`block text-[10px] font-bold uppercase ${muted}`}>
            Weight (lbs)
            <input
              className={`mt-0.5 ${inputCls}`}
              value={customWeight}
              onChange={(e) => setCustomWeight(e.target.value)}
              inputMode="numeric"
            />
          </label>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
          <label className={`flex cursor-pointer items-center gap-2 ${muted}`}>
            <input
              type="checkbox"
              checked={customHumanSized}
              onChange={(e) => setCustomHumanSized(e.target.checked)}
            />
            Human-sized (Morphus fit warning)
          </label>
          <label className={`flex cursor-pointer items-center gap-2 ${muted}`}>
            <input
              type="checkbox"
              checked={customMorphOk}
              onChange={(e) => setCustomMorphOk(e.target.checked)}
            />
            Morphus-compatible sizing
          </label>
        </div>
        <button type="button" className={`mt-3 ${btn}`} onClick={addCustomArmor}>
          Add custom armor
        </button>
      </div>

      <div className="mb-5">
        <h3
          className={`mb-2 text-[11px] font-black uppercase tracking-wider ${th}`}
        >
          Body armor
        </h3>
        <ul className="space-y-2">
          {armors.map((a) => {
            const equipped = equippedArmorId === a.id || a.isEquipped
            const ruined = a.currentSdc <= 0
            const humanWarn = morphus && a.humanSized === true
            return (
              <li
                key={a.id}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 px-3 py-2 ${
                  morphus
                    ? equipped
                      ? 'border-amber-400/90 bg-slate-900/80'
                      : 'border-violet-700/60 bg-slate-900/40'
                    : equipped
                      ? 'border-amber-500 bg-amber-50/90'
                      : 'border-blue-200 bg-blue-50/50'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className={`flex flex-wrap items-center gap-1.5 truncate text-sm font-bold ${th}`}>
                    <span className="truncate">{a.name}</span>
                    {humanWarn ? (
                      <span
                        className="inline-flex shrink-0 items-center justify-center rounded border border-amber-400 bg-amber-950 px-1 text-[12px] font-bold text-amber-200"
                        title="Human-sized shell — may be tight or restricted in Morphus (Pillar 7)."
                        aria-label="Human-sized armor warning in Morphus"
                        role="img"
                      >
                        ⚠
                      </span>
                    ) : null}
                    {equipped ? (
                      <span className="shrink-0 text-[10px] font-black uppercase text-amber-300">
                        Equipped
                      </span>
                    ) : null}
                    {ruined ? (
                      <span className="shrink-0 text-[10px] font-black uppercase text-red-400">
                        Ruined
                      </span>
                    ) : null}
                  </p>
                  <p className={`text-[11px] font-mono ${muted}`}>
                    A.R. {a.ar} · armor S.D.C. {a.currentSdc}/{a.maxSdc} · {a.weightLbs}{' '}
                    lbs
                    {!a.morphusCompatible ? ' · Not Morphus-rated' : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  {equipped ? (
                    <button
                      type="button"
                      className={btnGhost}
                      onClick={() => equipArmor(null)}
                    >
                      Unequip
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={btn}
                      disabled={ruined}
                      title={
                        ruined
                          ? 'Suit ruined — no S.D.C. integrity; replace before wearing'
                          : 'Wear this armor'
                      }
                      onClick={() => equipArmor(a.id)}
                    >
                      Equip
                    </button>
                  )}
                  <button
                    type="button"
                    className={btnDanger}
                    title="Remove this armor from inventory"
                    onClick={() => dropItem(a.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <div>
        <h3
          className={`mb-2 text-[11px] font-black uppercase tracking-wider ${th}`}
        >
          Weapons — primary / secondary
        </h3>
        <p className={`mb-3 text-[11px] leading-snug ${muted}`}>
          Equip up to two for the tactical HUD. W.P. skills on your sheet feed the strike engine when the
          weapon&apos;s linked W.P. skill id matches.
        </p>
        <ul className="space-y-3">
          {weapons.map((w) => {
            const primary = readyWeaponIds[0] === w.id
            const secondary = readyWeaponIds[1] === w.id
            const ranged = Boolean(w.payload)
            return (
              <li
                key={w.id}
                className={`rounded-lg border-2 px-3 py-2 ${
                  morphus ? 'border-violet-700/60 bg-slate-900/40' : 'border-blue-200 bg-blue-50/50'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`text-sm font-bold ${th}`}>
                      {w.name}
                      {primary ? (
                        <span className="ml-2 text-[10px] font-black uppercase text-amber-300">
                          Primary
                        </span>
                      ) : null}
                      {secondary ? (
                        <span className="ml-2 text-[10px] font-black uppercase text-cyan-300">
                          Secondary
                        </span>
                      ) : null}
                    </p>
                    <p className={`font-mono text-[11px] ${muted}`}>
                      {w.category} · dmg {w.damage} · strike item {w.strikeBonus >= 0 ? '+' : ''}
                      {w.strikeBonus}
                      {w.linkedWpSkillId ? ` · W.P. link: ${w.linkedWpSkillId}` : ''}
                    </p>
                    {ranged && w.payload ? (
                      <p className={`mt-1 font-mono text-[11px] font-semibold ${muted}`}>
                        Payload {w.payload.current} / {w.payload.max} · Reserve{' '}
                        {spareAmmoForWeapon(w, ammoPools)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                    <button type="button" className={btn} onClick={() => setReadyWeapon(0, w.id)}>
                      Primary
                    </button>
                    <button type="button" className={btn} onClick={() => setReadyWeapon(1, w.id)}>
                      Secondary
                    </button>
                    {(primary || secondary) && (
                      <button
                        type="button"
                        className={btnGhost}
                        onClick={() => setReadyWeapon(primary ? 0 : 1, null)}
                      >
                        Unequip
                      </button>
                    )}
                    <button type="button" className={btnDanger} onClick={() => dropItem(w.id)}>
                      Remove
                    </button>
                  </div>
                </div>
                {ranged ? (
                  <div
                    className={`mt-2 border-t pt-2 ${morphus ? 'border-violet-800' : 'border-blue-200'}`}
                  >
                    <WeaponReloadControl
                      weapon={w}
                      ammoPools={ammoPools}
                      morphus={morphus}
                      vibrant={canReloadWeapon(w, ammoPools)}
                      onReload={() => reloadWeapon(w.id)}
                      onReloadFailed={() => reloadWeapon(w.id)}
                    />
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
