import { useCharacter } from '../../context/CharacterContext'

/**
 * Live inventory — armor A.R. / S.D.C., equip/drop, encumbrance vs P.S. carry (attribute_and_stat.md §4).
 */
export function Inventory() {
  const {
    inventoryItems,
    equippedArmorId,
    equipArmor,
    dropItem,
    activeForm,
    equippedArmor,
    currentWeightLbs,
    carryLimitLbs,
    overEncumbered,
    encumbranceSpdNote,
  } = useCharacter()

  const morphus = activeForm === 'morphus'
  const shell = morphus
    ? 'border-2 border-violet-500 bg-slate-950/90 text-violet-50'
    : 'border-2 border-blue-600 bg-white text-slate-900'
  const th = morphus ? 'text-violet-200' : 'text-blue-900'
  const muted = morphus ? 'text-violet-300/90' : 'text-slate-600'
  const btnEquip = morphus
    ? 'rounded-md border-2 border-violet-300 bg-violet-800 px-2 py-1 text-[11px] font-black uppercase text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-35'
    : 'rounded-md border-2 border-blue-600 bg-blue-600 px-2 py-1 text-[11px] font-black uppercase text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-35'
  const btnDrop = morphus
    ? 'rounded-md border-2 border-rose-400/80 bg-rose-950/60 px-2 py-1 text-[11px] font-black uppercase text-rose-100 hover:bg-rose-900/80'
    : 'rounded-md border-2 border-rose-600 bg-rose-600 px-2 py-1 text-[11px] font-black uppercase text-white hover:bg-rose-500'

  const armorTooSmallMorphus =
    morphus &&
    equippedArmor &&
    equippedArmor.morphusCompatible === false

  return (
    <section
      className={`rounded-xl p-4 shadow-lg ${shell}`}
      aria-labelledby="inventory-heading"
    >
      <h2
        id="inventory-heading"
        className={`mb-3 text-sm font-black uppercase tracking-[0.18em] ${th}`}
      >
        Inventory
      </h2>

      {armorTooSmallMorphus ? (
        <div
          className={`mb-3 rounded-lg border-2 px-3 py-2 text-xs font-bold ${
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

      {overEncumbered ? (
        <div
          className="mb-3 rounded-lg border-2 border-red-600 bg-red-950/50 px-3 py-2 text-xs font-bold text-red-100"
          role="alert"
        >
          <p className="uppercase tracking-wide">Over carry limit</p>
          <p className="mt-1 font-mono tabular-nums">
            {currentWeightLbs} lbs carried / {carryLimitLbs} lbs limit (P.S. × tier).
          </p>
          <p className="mt-1 text-[11px] font-semibold normal-case opacity-95">
            {encumbranceSpdNote}
          </p>
        </div>
      ) : (
        <p className={`mb-3 text-[11px] font-semibold ${muted}`}>
          Load{' '}
          <span className="font-mono tabular-nums">
            {currentWeightLbs}
          </span>{' '}
          /{' '}
          <span className="font-mono tabular-nums">{carryLimitLbs}</span> lbs
          carry.
        </p>
      )}

      <ul className="space-y-2">
        {inventoryItems.map((row) => {
          const isArmor = row.itemType === 'armor'
          const equipped = equippedArmorId === row.id
          return (
            <li
              key={row.id}
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
                <p className={`truncate text-sm font-bold ${th}`}>
                  {row.name}
                  {equipped ? (
                    <span className="ml-2 text-[10px] font-black uppercase text-amber-300">
                      Equipped
                    </span>
                  ) : null}
                </p>
                <p className={`text-[11px] font-mono ${muted}`}>
                  {row.weightLbs} lbs
                  {isArmor ? (
                    <>
                      {' '}
                      · A.R. {row.ar} · Armor S.D.C. {row.currentSDC}/{row.maxSDC}
                    </>
                  ) : null}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                <button
                  type="button"
                  className={btnEquip}
                  disabled={!isArmor}
                  title={
                    isArmor
                      ? 'Equip this armor (replaces current suit)'
                      : 'Only armor can occupy the body armor slot'
                  }
                  onClick={() => equipArmor(row.id)}
                >
                  Equip
                </button>
                <button type="button" className={btnDrop} onClick={() => dropItem(row.id)}>
                  Drop
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
