import { useCharacter } from '../../context/CharacterContext'
import { Armory } from './Armory'
import { CombatHUD } from './CombatHUD'
import { Inventory } from './Inventory'
import { LiveAbilitiesPanel } from './LiveAbilitiesPanel'
import { MorphusCapabilitiesPanel } from './MorphusCapabilitiesPanel'
import { MorphusTraitsPanel } from './MorphusTraitsPanel'
import { PsStrengthPanel } from './PsStrengthPanel'
import { SavingThrowsPanel } from './SavingThrowsPanel'
import { SkillList } from '../SkillList'
import type { LiveSheetTabId } from '../../lib/liveSheetTabs'

type Props = {
  tabId: LiveSheetTabId
}

/**
 * Live sheet Active Zone — one forge-style tab at a time.
 */
export function LiveSheetTabBody({ tabId }: Props) {
  const {
    character,
    activeForm,
    activeFormState: form,
    movementDerived,
    supportsDualForm,
    strengthCapacities,
    morphusDerived,
    morphusActiveBurstKeys,
    toggleMorphusBurst,
    morphusActiveGimmickSwitchKeys,
    toggleMorphusGimmickSwitch,
  } = useCharacter()

  const morphusActive = supportsDualForm && activeForm === 'morphus'

  if (tabId === 'combat') {
    return (
      <section aria-label="Combat active zone" className="min-w-0">
        <CombatHUD layout="panel" />
      </section>
    )
  }

  if (tabId === 'saves') {
    return <SavingThrowsPanel />
  }

  if (tabId === 'skills') {
    return (
      <section aria-labelledby="skills-heading">
        <h2
          id="skills-heading"
          className="mb-2 text-sm font-semibold uppercase tracking-wide"
          style={{ color: morphusActive ? '#c4b5fd' : '#1e40af' }}
        >
          Skills
        </h2>
        <SkillList
          skills={form.skills}
          morphusActive={morphusActive}
          characterLevel={character.level}
        />
      </section>
    )
  }

  if (tabId === 'abilities') {
    return <LiveAbilitiesPanel />
  }

  if (tabId === 'gear') {
    return (
      <div className="flex flex-col gap-6">
        <Armory />
        <Inventory />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="attrs-heading">
        <h2
          id="attrs-heading"
          className="mb-2 text-sm font-semibold uppercase tracking-wide"
          style={{ color: morphusActive ? '#c4b5fd' : '#1e40af' }}
        >
          {supportsDualForm ? 'Active form — attributes' : 'Attributes'}
        </h2>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Attr label="I.Q." value={form.attributes.iq} morphus={morphusActive} />
          <Attr label="M.E." value={form.attributes.me} morphus={morphusActive} />
          <Attr label="M.A." value={form.attributes.ma} morphus={morphusActive} />
          <Attr
            label="P.S."
            value={`${form.attributes.ps.score} (${form.attributes.ps.tier})`}
            morphus={morphusActive}
          />
          <Attr label="P.P." value={form.attributes.pp} morphus={morphusActive} />
          <Attr label="P.E." value={form.attributes.pe} morphus={morphusActive} />
          <Attr label="P.B." value={form.attributes.pb} morphus={morphusActive} />
          <Attr label="Spd" value={form.attributes.spd} morphus={morphusActive} />
        </dl>
        <p
          className="mt-2 text-sm"
          style={{ color: morphusActive ? '#a5b4fc' : '#475569' }}
        >
          Alignment: <strong>{form.alignment}</strong>
        </p>
        <div className="mt-3">
          <PsStrengthPanel capacities={strengthCapacities} morphus={morphusActive} />
        </div>
      </section>

      <section
        aria-labelledby="movement-heading"
        className={`rounded-lg border px-4 py-3 ${
          morphusActive
            ? 'border-violet-800/60 bg-violet-950/30'
            : 'border-blue-200 bg-sky-50/70'
        }`}
      >
        <h2
          id="movement-heading"
          className="mb-2 text-sm font-semibold uppercase tracking-wide"
          style={{ color: morphusActive ? '#c4b5fd' : '#1e40af' }}
        >
          Movement
        </h2>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p className={morphusActive ? 'text-violet-100/95' : 'text-slate-800'}>
            <strong>Ground:</strong> Spd {movementDerived.ground.attributeValue} ·{' '}
            {movementDerived.ground.yardsPerMelee} yd/melee · {movementDerived.ground.mph} mph
          </p>
          <p className={morphusActive ? 'text-violet-100/95' : 'text-slate-800'}>
            <strong>Swim:</strong>{' '}
            {movementDerived.swim
              ? `Spd ${movementDerived.swim.attributeValue} · ${movementDerived.swim.yardsPerMelee} yd/melee · ${movementDerived.swim.mph} mph`
              : 'N/A'}
          </p>
          <p className={morphusActive ? 'text-violet-100/95' : 'text-slate-800'}>
            <strong>Fly:</strong>{' '}
            {movementDerived.fly
              ? `Spd ${movementDerived.fly.attributeValue} · ${movementDerived.fly.yardsPerMelee} yd/melee · ${movementDerived.fly.mph} mph`
              : 'N/A'}
          </p>
        </div>
        <p
          className={`mt-2 text-xs ${
            morphusActive ? 'text-violet-200/90' : 'text-slate-600'
          }`}
        >
          <strong>Leaping:</strong> Standing H {movementDerived.leap.standingHorizontal} · V{' '}
          {movementDerived.leap.standingVertical} | Running H{' '}
          {movementDerived.leap.runningHorizontal} · V {movementDerived.leap.runningVertical}
        </p>
      </section>

      {morphusActive && morphusDerived ? (
        <>
          <MorphusCapabilitiesPanel
            summary={morphusDerived.capabilitySummary}
            balanceModifierPercent={morphusDerived.balanceModifierPercent}
            reachPercentBonus={morphusDerived.reachPercentBonus}
            jumpMultiplier={morphusDerived.jumpMultiplier}
            minimumJumpFeet={morphusDerived.minimumJumpFeet}
          />
          <MorphusTraitsPanel
            derived={morphusDerived}
            activeBurstKeys={morphusActiveBurstKeys}
            onToggleBurst={toggleMorphusBurst}
            activeGimmickSwitchKeys={morphusActiveGimmickSwitchKeys}
            onToggleGimmickSwitch={toggleMorphusGimmickSwitch}
          />
        </>
      ) : null}
    </div>
  )
}

function Attr({
  label,
  value,
  morphus,
}: {
  label: string
  value: string | number
  morphus: boolean
}) {
  return (
    <div
      className={`rounded-lg border-2 px-3 py-2 ${
        morphus
          ? 'border-violet-700 bg-slate-950/80 text-violet-50'
          : 'border-blue-200 bg-white text-slate-900'
      }`}
    >
      <dt
        className={`text-[10px] font-black uppercase tracking-wide ${
          morphus ? 'text-violet-300' : 'text-blue-800'
        }`}
      >
        {label}
      </dt>
      <dd className="font-mono text-lg font-black tabular-nums">{value}</dd>
    </div>
  )
}
