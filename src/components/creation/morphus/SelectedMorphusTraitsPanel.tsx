import { useMemo } from 'react'
import { useCharacter } from '../../../context/CharacterContext'
import {
  buildMorphusSelectedTraitsPanelSections,
  morphusSelectedTraitsPanelSlotsRemaining,
  type MorphusCharacteristicPickTree,
  type MorphusTraitPanelPathSection,
  type MorphusTraitPanelSlotBox,
} from '../../../lib/morphusSelectedTraitsPanel'
import type { MorphusForgeState } from '../../../types'

type Props = {
  morphusForgeState: MorphusForgeState
  shellMode?: boolean
}

function TraitSlotBox({
  box,
  onClear,
}: {
  box: MorphusTraitPanelSlotBox
  onClear?: () => void
}) {
  const hasPicks = box.resolvedPicks.length > 0
  const borderClass = box.complete
    ? 'border-emerald-500/70 bg-emerald-950/20'
    : 'border-violet-500/70 bg-slate-950/60'

  return (
    <li
      className={`rounded-lg border px-3 py-3 text-center ${borderClass}`}
    >
      <p className="text-sm font-bold leading-snug text-violet-50">{box.title}</p>
      {box.bulletDetails && box.bulletDetails.length > 0 ? (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-left text-xs text-violet-200/90">
          {box.bulletDetails.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {hasPicks ? (
        <div className="mt-2 space-y-0.5 text-left">
          {box.resolvedPicks.map((pick) => (
            <p key={pick} className="text-xs font-semibold text-emerald-300">
              {pick}
            </p>
          ))}
        </div>
      ) : null}
      {hasPicks && onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-2 text-[11px] text-rose-400 underline"
        >
          Clear slot
        </button>
      ) : null}
    </li>
  )
}

function CharacteristicPickTree({
  tree,
  onClearSlot,
}: {
  tree: MorphusCharacteristicPickTree
  onClearSlot: (planPath: string) => void
}) {
  return (
    <div className="rounded-lg border border-violet-700/80 bg-slate-950/60 px-3 py-2 text-left">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-violet-100">{tree.heading}</p>
        {tree.entries.length > 0 ? (
          <button
            type="button"
            onClick={() => onClearSlot(tree.planPath)}
            className="shrink-0 text-[11px] text-rose-400 underline"
          >
            Clear
          </button>
        ) : null}
      </div>
      {tree.entries.length === 0 ? (
        <p className="text-xs opacity-50">No picks yet.</p>
      ) : (
        <ul className="space-y-1">
          {tree.entries.map((entry, index) => (
            <li
              key={`${entry.name}-${index}`}
              className="text-xs font-semibold leading-snug"
              style={{ paddingLeft: `${entry.depth * 0.75}rem` }}
            >
              <span className={entry.complete ? 'text-emerald-300' : 'text-violet-200'}>
                {entry.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PathSection({
  section,
  onClearSlot,
}: {
  section: MorphusTraitPanelPathSection
  onClearSlot: (planPath: string) => void
}) {
  const showCharacteristicTrees =
    section.path === 'characteristics' && section.characteristicTrees.length > 0

  return (
    <section aria-label={section.title}>
      <h4 className="mb-2 text-center text-xs font-bold text-violet-100">
        {section.subtitle ? (
          <>
            <span className="block opacity-70">{section.title}</span>
            <span className="mt-0.5 block text-violet-50">{section.subtitle}</span>
          </>
        ) : (
          section.title
        )}
      </h4>
      {showCharacteristicTrees ? (
        <div className="space-y-2">
          {section.characteristicTrees.map((tree) => (
            <CharacteristicPickTree key={tree.planPath} tree={tree} onClearSlot={onClearSlot} />
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {section.boxes.map((box) => (
            <TraitSlotBox
              key={`${section.path}-${box.planIndex}`}
              box={box}
              onClear={
                box.resolvedPicks.length > 0 ? () => onClearSlot(box.planPath) : undefined
              }
            />
          ))}
        </ul>
      )}
    </section>
  )
}

export function SelectedMorphusTraitsPanel({
  morphusForgeState,
  shellMode = false,
}: Props) {
  const { character, morphusForgeSlotActions } = useCharacter()

  const sections = useMemo(
    () =>
      buildMorphusSelectedTraitsPanelSections(
        morphusForgeState,
        character.morphusForgeSlotState,
      ),
    [morphusForgeState, character.morphusForgeSlotState],
  )

  const slotsRemaining = useMemo(
    () =>
      morphusSelectedTraitsPanelSlotsRemaining(
        morphusForgeState,
        character.morphusForgeSlotState,
      ),
    [morphusForgeState, character.morphusForgeSlotState],
  )

  const panelStyle = shellMode
    ? 'border-violet-300 bg-violet-50 text-violet-950'
    : 'border-violet-700 bg-slate-950/80 text-violet-50'

  const Wrapper = shellMode ? 'div' : 'aside'

  return (
    <Wrapper
      className={
        shellMode
          ? 'flex h-full min-h-0 w-full flex-col'
          : 'flex min-h-0 w-full shrink-0 flex-col border-t border-violet-800 pt-4 lg:w-64 lg:border-t-0 lg:border-r lg:pr-4 lg:pt-0 xl:w-72'
      }
      aria-label="Selected traits panel"
    >
      <div
        className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border ${panelStyle}`}
      >
        <div className={`shrink-0 border-b px-3 py-2 ${shellMode ? 'border-violet-200' : 'border-violet-800'}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wide ${shellMode ? 'text-violet-900' : 'opacity-80'}`}>
            Selected traits
          </h3>
          <p className={`mt-1 text-[11px] leading-snug ${shellMode ? 'text-violet-800' : 'opacity-70'}`}>
            Trait picks appear here as you resolve each slot — including nested tables
            and combinations.
          </p>
          {morphusForgeState.path ? (
            <p
              className={`mt-2 text-[11px] font-bold uppercase tracking-wide ${
                slotsRemaining === 0
                  ? shellMode
                    ? 'text-emerald-700'
                    : 'text-emerald-400'
                  : shellMode
                    ? 'text-amber-700'
                    : 'text-amber-300'
              }`}
              role="status"
            >
              {slotsRemaining === 0
                ? 'All slots resolved'
                : `${slotsRemaining} slot(s) remaining`}
            </p>
          ) : null}
        </div>

        <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto overscroll-contain break-words p-3">
          {sections.length === 0 ? (
            <p className="text-sm opacity-60">
              Choose Path 1 or Path 2 on Crossroads to see your trait slots.
            </p>
          ) : (
            sections.map((section) => (
              <PathSection
                key={section.path}
                section={section}
                onClearSlot={morphusForgeSlotActions.onClearPick}
              />
            ))
          )}
        </div>
      </div>
    </Wrapper>
  )
}
