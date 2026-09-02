import { useMemo, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { ForgeNavigationBar } from '../forge/ForgeNavigationBar'
import {
  buildGearSubTabViews,
  GEAR_SUB_TAB_ORDER,
  type GearSubTabId,
} from '../../lib/gearSubTabs'
import { GearArmorSection } from './gear/GearArmorSection'
import { GearArtifactsSection } from './gear/GearArtifactsSection'
import { GearOtherSection } from './gear/GearOtherSection'
import { GearWeaponsSection } from './gear/GearWeaponsSection'

/**
 * Live sheet Gear tab — Weapons / Armor / Artifacts / Other sub-panels.
 */
export function GearPanel() {
  const { activeForm, supportsDualForm } = useCharacter()
  const morphus = supportsDualForm && activeForm === 'morphus'
  const [activeSubTab, setActiveSubTab] = useState<GearSubTabId>('weapons')

  const headingColor = morphus ? 'text-violet-200' : 'text-blue-900'
  const muted = morphus ? 'text-violet-300/90' : 'text-slate-600'

  const subTabs = useMemo(
    () => buildGearSubTabViews(activeSubTab),
    [activeSubTab],
  )

  return (
    <section aria-labelledby="gear-heading" className="space-y-4">
      <div>
        <h2
          id="gear-heading"
          className={`text-sm font-semibold uppercase tracking-wide ${headingColor}`}
        >
          Gear
        </h2>
        <p className={`mt-1 text-xs ${muted}`}>
          Weapons, armor, artifacts, and other carried load. Equipped armor and ready weapons feed the
          combat HUD.
        </p>
      </div>

      <ForgeNavigationBar
        tabs={subTabs}
        activeTabId={activeSubTab}
        onSelectTab={(id) => {
          if ((GEAR_SUB_TAB_ORDER as readonly string[]).includes(id)) {
            setActiveSubTab(id as GearSubTabId)
          }
        }}
        singleRow
        ariaLabel="Gear categories"
      />

      {activeSubTab === 'weapons' ? <GearWeaponsSection morphus={morphus} /> : null}
      {activeSubTab === 'armor' ? <GearArmorSection morphus={morphus} /> : null}
      {activeSubTab === 'artifacts' ? <GearArtifactsSection morphus={morphus} /> : null}
      {activeSubTab === 'other' ? <GearOtherSection morphus={morphus} /> : null}
    </section>
  )
}
