import type { ReactNode } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { isConfiguratorOccSelected } from '../../lib/configuratorMatrix'
import { resolveMorphusForgeState } from '../../lib/morphusForgeNavigation'
import type { CharacterCreationForgeTabId } from '../../lib/forgeNavigation/characterCreationForge'
import { ConfiguratorPackagePanel } from './ConfiguratorPackagePanel'
import { CreationForgeBuildContextPanel } from './CreationForgeBuildContextPanel'
import {
  CreationForgePanelChrome,
  creationForgePanelSurfaceClass,
} from './CreationForgePanelChrome'
import { useCreationForgeLeftSlotRegisteredContent } from './CreationForgeLeftSlotContext'
import { SelectedAbilitiesPanel } from './abilities/SelectedAbilitiesPanel'
import { SelectedMorphusTraitsPanel } from './morphus/SelectedMorphusTraitsPanel'

const CONTEXT_TABS: ReadonlySet<CharacterCreationForgeTabId> = new Set([
  'tab2_attributes',
  'tab3_psionic',
  'tab5_finalize',
  'tab8_review',
])

function SkillsLeftSlotPlaceholder({ morphus }: { morphus: boolean }) {
  return (
    <CreationForgePanelChrome
      title="Selected skills"
      description="Loading your skill selections for this step."
      morphus={morphus}
      aria-label="Selected skills panel"
    >
      <p className="text-sm opacity-60">Preparing skills panel…</p>
    </CreationForgePanelChrome>
  )
}

type CreationForgeLeftSlotProps = {
  activeTabId: CharacterCreationForgeTabId
  morphus: boolean
}

export function CreationForgeLeftSlot({
  activeTabId,
  morphus,
}: CreationForgeLeftSlotProps) {
  const { character, activeRace, effectiveOcc, supportsDualForm } = useCharacter()

  const registeredSkillsPanel = useCreationForgeLeftSlotRegisteredContent()
  const panelStyle = creationForgePanelSurfaceClass(morphus)
  const isNightbane = character.lineage === 'nightbane'
  const genreId = character.creationGenreId ?? character.hostGenreId ?? 'nightbane'

  let content: ReactNode = null

  if (activeTabId === 'tab1_configurator') {
    content = (
      <ConfiguratorPackagePanel
        race={activeRace}
        occ={
          isConfiguratorOccSelected(character.occ.id)
            ? (effectiveOcc ?? undefined)
            : undefined
        }
        specializationId={character.occSpecializationId}
        morphus={morphus}
        panelStyle={panelStyle}
        shellMode
      />
    )
  } else if (activeTabId === 'tab4_skills') {
    content = registeredSkillsPanel ?? <SkillsLeftSlotPlaceholder morphus={morphus} />
  } else if (activeTabId === 'tab6_traits') {
    if (!supportsDualForm) {
      content = <CreationForgeBuildContextPanel morphus={morphus} />
    } else {
      const morphusState = resolveMorphusForgeState(character)
      content = (
        <SelectedMorphusTraitsPanel morphusForgeState={morphusState} shellMode />
      )
    }
  } else if (activeTabId === 'tab7_abilities') {
    content = (
      <SelectedAbilitiesPanel
        morphus={morphus}
        genreId={genreId}
        isNightbane={isNightbane}
        shellMode
      />
    )
  } else if (CONTEXT_TABS.has(activeTabId)) {
    content = <CreationForgeBuildContextPanel morphus={morphus} />
  }

  return <div className="flex h-full min-h-0 w-full flex-col">{content}</div>
}
