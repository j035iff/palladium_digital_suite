import { gearPanelTheme } from './gearPanelTheme'

type Props = {
  morphus: boolean
}

export function GearArtifactsSection({ morphus }: Props) {
  const theme = gearPanelTheme(morphus)

  return (
    <div
      className={`rounded-xl p-4 shadow-lg ${theme.shell}`}
      role="tabpanel"
      aria-label="Artifacts"
    >
      <p className={`mb-3 text-[11px] font-semibold leading-snug ${theme.muted}`}>
        Magical items, rune weapons, talismans, and other unique gear with special abilities — the
        weapon forge and custom property stack from inventory_weapons.md.
      </p>
      <div
        className={`rounded-lg border-2 border-dashed px-4 py-8 text-center ${
          morphus ? 'border-violet-600/70 bg-slate-900/40' : 'border-blue-300 bg-blue-50/50'
        }`}
      >
        <p className={`text-sm font-semibold ${theme.th}`}>Artifacts — coming soon</p>
        <p className={`mt-2 text-xs ${theme.muted}`}>
          This tab will hold indestructible gear, conditional damage multipliers, and sub-abilities
          with their own P.P.E. / I.S.P. costs.
        </p>
      </div>
    </div>
  )
}
