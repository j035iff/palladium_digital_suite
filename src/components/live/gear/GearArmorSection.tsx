import { useMemo, useState } from 'react'
import { useCharacter } from '../../../context/CharacterContext'
import type { Armor } from '../../../types'
import { gearPanelTheme } from './gearPanelTheme'

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

type Props = {
  morphus: boolean
}

export function GearArmorSection({ morphus }: Props) {
  const {
    inventoryItems,
    equippedArmorId,
    equippedArmor,
    equipArmor,
    addArmorToInventory,
    dropItem,
  } = useCharacter()

  const theme = gearPanelTheme(morphus)
  const [customName, setCustomName] = useState('')
  const [customAr, setCustomAr] = useState('10')
  const [customMaxSdc, setCustomMaxSdc] = useState('35')
  const [customWeight, setCustomWeight] = useState('10')
  const [customHumanSized, setCustomHumanSized] = useState(false)
  const [customMorphOk, setCustomMorphOk] = useState(true)

  const armors = useMemo(
    () => inventoryItems.filter((it): it is Armor => it.itemType === 'armor'),
    [inventoryItems],
  )

  const armorTooSmallMorphus =
    morphus && equippedArmor && equippedArmor.morphusCompatible === false

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
    <div
      className={`rounded-xl p-4 shadow-lg ${theme.shell}`}
      role="tabpanel"
      aria-label="Armor"
    >
      <p className={`mb-4 text-[11px] font-semibold leading-snug ${theme.muted}`}>
        Body armor drives the A.R. gate on the tactical HUD: attack totals below A.R. chew armor
        S.D.C. first; at or above A.R., damage goes to your body S.D.C. (combat_logic.md).
      </p>

      {armorTooSmallMorphus ? (
        <div
          className={`mb-4 rounded-lg border-2 px-3 py-2 text-xs font-bold ${
            morphus
              ? 'border-amber-400 bg-violet-950 text-amber-100'
              : 'border-amber-600 bg-amber-50 text-amber-950'
          }`}
          role="status"
        >
          Total Reconfiguration: equipped armor is sized for Facade — Morphus bulk does not fit this
          shell. Replace with Morphus-rated gear.
        </div>
      ) : null}

      <div className={`mb-5 p-3 ${theme.dashedPanel}`}>
        <h3 className={`mb-2 text-[11px] font-black uppercase tracking-wider ${theme.th}`}>
          Add armor
        </h3>
        <div className="mb-3 flex flex-wrap gap-2">
          {ARMOR_TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              className={theme.btnGhost}
              onClick={() =>
                addArmorToInventory({
                  name: t.name,
                  ar: t.ar,
                  maxSdc: t.maxSdc,
                  weightLbs: t.weightLbs,
                  morphusCompatible: t.morphusCompatible,
                  humanSized: t.humanSized,
                })
              }
            >
              + {t.label}
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
            Name
            <input
              className={`mt-0.5 ${theme.inputCls}`}
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Ceramic inserts"
            />
          </label>
          <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
            A.R.
            <input
              className={`mt-0.5 ${theme.inputCls}`}
              value={customAr}
              onChange={(e) => setCustomAr(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
            Max S.D.C.
            <input
              className={`mt-0.5 ${theme.inputCls}`}
              value={customMaxSdc}
              onChange={(e) => setCustomMaxSdc(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <label className={`block text-[10px] font-bold uppercase ${theme.muted}`}>
            Weight (lbs)
            <input
              className={`mt-0.5 ${theme.inputCls}`}
              value={customWeight}
              onChange={(e) => setCustomWeight(e.target.value)}
              inputMode="numeric"
            />
          </label>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
          <label className={`flex cursor-pointer items-center gap-2 ${theme.muted}`}>
            <input
              type="checkbox"
              checked={customHumanSized}
              onChange={(e) => setCustomHumanSized(e.target.checked)}
            />
            Human-sized (Morphus fit warning)
          </label>
          <label className={`flex cursor-pointer items-center gap-2 ${theme.muted}`}>
            <input
              type="checkbox"
              checked={customMorphOk}
              onChange={(e) => setCustomMorphOk(e.target.checked)}
            />
            Morphus-compatible sizing
          </label>
        </div>
        <button type="button" className={`mt-3 ${theme.btn}`} onClick={addCustomArmor}>
          Add custom armor
        </button>
      </div>

      <div>
        <h3 className={`mb-2 text-[11px] font-black uppercase tracking-wider ${theme.th}`}>
          Body armor
        </h3>
        {armors.length === 0 ? (
          <p className={`text-sm ${theme.muted}`}>No armor carried yet.</p>
        ) : (
          <ul className="space-y-2">
            {armors.map((a) => {
              const equipped = equippedArmorId === a.id || a.isEquipped
              const ruined = a.currentSdc <= 0
              const humanWarn = morphus && a.humanSized === true
              return (
                <li
                  key={a.id}
                  className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 ${
                    equipped ? theme.cardEquipped : theme.card
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={`flex flex-wrap items-center gap-1.5 truncate text-sm font-bold ${theme.th}`}
                    >
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
                    <p className={`text-[11px] font-mono ${theme.muted}`}>
                      A.R. {a.ar} · armor S.D.C. {a.currentSdc}/{a.maxSdc} · {a.weightLbs} lbs
                      {!a.morphusCompatible ? ' · Not Morphus-rated' : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    {equipped ? (
                      <button type="button" className={theme.btnGhost} onClick={() => equipArmor(null)}>
                        Unequip
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={theme.btn}
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
                      className={theme.btnDanger}
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
        )}
      </div>
    </div>
  )
}
