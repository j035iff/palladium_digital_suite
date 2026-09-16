import { useMemo, useState } from 'react'
import { ForgeNavigationBar } from '../forge/ForgeNavigationBar'
import {
  buildGearForgeLaneViews,
  type GearForgeLaneId,
} from '../../lib/forgeNavigation/gearForge'
import type { GearForgeHostAdapter } from '../../lib/gear/gearForgeHost'
import { GearForgeStubLane } from './lanes/GearForgeStubLane'
import { GearForgeWeaponsLane } from './lanes/GearForgeWeaponsLane'

type Props = {
  adapter: GearForgeHostAdapter
  morphus?: boolean
  /** Optional chrome title override. */
  title?: string
}

export function GearForgeShell({ adapter, morphus = false, title }: Props) {
  const [laneId, setLaneId] = useState<GearForgeLaneId>('weapons')
  const tabs = useMemo(() => buildGearForgeLaneViews(laneId), [laneId])

  const heading =
    title ??
    (adapter.kind === 'library'
      ? 'Gear Forge'
      : adapter.kind === 'gm'
        ? 'GM Gear'
        : 'Gear')

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-200">
            {heading}
          </h2>
          {adapter.targetLabel ? (
            <p className="mt-0.5 text-[11px] text-slate-400">
              Target: {adapter.targetLabel}
            </p>
          ) : null}
        </div>
      </div>

      <ForgeNavigationBar
        tabs={tabs}
        activeTabId={laneId}
        onSelectTab={(id) => {
          if (
            id === 'weapons' ||
            id === 'armor' ||
            id === 'artifacts' ||
            id === 'other'
          ) {
            setLaneId(id)
          }
        }}
        singleRow
        ariaLabel="Gear forge lanes"
      />

      {tabs.find((t) => t.id === laneId)?.blockers[0] && laneId !== 'weapons' ? (
        <p className="text-[11px] text-amber-200/80">
          {tabs.find((t) => t.id === laneId)?.blockers[0]}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {laneId === 'weapons' ? (
          <GearForgeWeaponsLane adapter={adapter} morphus={morphus} />
        ) : (
          <GearForgeStubLane laneId={laneId} morphus={morphus} />
        )}
      </div>
    </div>
  )
}
