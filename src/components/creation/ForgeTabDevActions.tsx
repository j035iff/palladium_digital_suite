import { lazy, Suspense, type ReactNode } from 'react'
import type { CharacterCreationForgeTabId } from '../../lib/forgeNavigation/characterCreationForge'

const DevSkipToMorphusButton = import.meta.env.DEV
  ? lazy(() =>
      import('./dev/DevSkipToMorphusButton').then((m) => ({
        default: m.DevSkipToMorphusButton,
      })),
    )
  : null

const DevSkipToReviewFromRaceOccButton = import.meta.env.DEV
  ? lazy(() =>
      import('./dev/DevSkipToReviewFromRaceOccButton').then((m) => ({
        default: m.DevSkipToReviewFromRaceOccButton,
      })),
    )
  : null

const DevAutoAssignAttributesButton = import.meta.env.DEV
  ? lazy(() =>
      import('./dev/DevAutoAssignAttributesButton').then((m) => ({
        default: m.DevAutoAssignAttributesButton,
      })),
    )
  : null

const DevAutoFillSkillsButton = import.meta.env.DEV
  ? lazy(() =>
      import('./dev/DevAutoFillSkillsButton').then((m) => ({
        default: m.DevAutoFillSkillsButton,
      })),
    )
  : null

const DevAutoRollPendingDiceButton = import.meta.env.DEV
  ? lazy(() =>
      import('./dev/DevAutoRollPendingDiceButton').then((m) => ({
        default: m.DevAutoRollPendingDiceButton,
      })),
    )
  : null

const DevSkipToReviewFromMorphusButton = import.meta.env.DEV
  ? lazy(() =>
      import('./dev/DevSkipToReviewFromMorphusButton').then((m) => ({
        default: m.DevSkipToReviewFromMorphusButton,
      })),
    )
  : null

const DevAutoFillAbilitiesButton = import.meta.env.DEV
  ? lazy(() =>
      import('./dev/DevAutoFillAbilitiesButton').then((m) => ({
        default: m.DevAutoFillAbilitiesButton,
      })),
    )
  : null

const DevAutoFillMorphusTraitsButton = import.meta.env.DEV
  ? lazy(() =>
      import('./dev/DevAutoFillMorphusTraitsButton').then((m) => ({
        default: m.DevAutoFillMorphusTraitsButton,
      })),
    )
  : null

const DevAutoFillIdentityButton = import.meta.env.DEV
  ? lazy(() =>
      import('./dev/DevAutoFillIdentityButton').then((m) => ({
        default: m.DevAutoFillIdentityButton,
      })),
    )
  : null

function DevAction({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>
}

export function ForgeTabDevActions({
  activeTabId,
}: {
  activeTabId: CharacterCreationForgeTabId
}) {
  if (!import.meta.env.DEV) return null

  switch (activeTabId) {
    case 'tab1_configurator':
      return (
        <>
          {DevSkipToMorphusButton ? (
            <DevAction>
              <DevSkipToMorphusButton variant="header" />
            </DevAction>
          ) : null}
          {DevSkipToReviewFromRaceOccButton ? (
            <DevAction>
              <DevSkipToReviewFromRaceOccButton variant="header" />
            </DevAction>
          ) : null}
        </>
      )
    case 'tab2_attributes':
      return DevAutoAssignAttributesButton ? (
        <DevAction>
          <DevAutoAssignAttributesButton variant="header" />
        </DevAction>
      ) : null
    case 'tab4_skills':
      return DevAutoFillSkillsButton ? (
        <DevAction>
          <DevAutoFillSkillsButton variant="header" />
        </DevAction>
      ) : null
    case 'tab5_finalize':
      return DevAutoRollPendingDiceButton ? (
        <DevAction>
          <DevAutoRollPendingDiceButton variant="header" />
        </DevAction>
      ) : null
    case 'tab6_traits':
      return (
        <>
          {DevAutoFillMorphusTraitsButton ? (
            <DevAction>
              <DevAutoFillMorphusTraitsButton variant="header" />
            </DevAction>
          ) : null}
          {DevSkipToReviewFromMorphusButton ? (
            <DevAction>
              <DevSkipToReviewFromMorphusButton variant="header" />
            </DevAction>
          ) : null}
        </>
      )
    case 'tab7_abilities':
      return DevAutoFillAbilitiesButton ? (
        <DevAction>
          <DevAutoFillAbilitiesButton variant="header" />
        </DevAction>
      ) : null
    case 'tab9_review':
      return DevAutoFillIdentityButton ? (
        <DevAction>
          <DevAutoFillIdentityButton variant="header" />
        </DevAction>
      ) : null
    default:
      return null
  }
}
