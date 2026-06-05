import type { SkillCreationDisplayInfo } from '../../lib/skillCreationDisplay'

export function SkillStatLines({
  display,
  compact = false,
}: {
  display: SkillCreationDisplayInfo
  compact?: boolean
}) {
  const textClass = compact ? 'text-[11px] opacity-85' : 'text-xs opacity-85'

  if (display.isWeaponProficiency) {
    return (
      <div className={textClass}>
        {display.weaponBonusSummary ? (
          <p className="font-mono tabular-nums">{display.weaponBonusSummary}</p>
        ) : (
          <p className="opacity-60">Combat bonuses by level (no skill %).</p>
        )}
      </div>
    )
  }

  const percentBonuses = [...display.equationBonuses, ...display.contextBonuses].filter(
    (b) => b.value !== 0,
  )

  const hasPhysical = Boolean(display.physicalBonusSummary)
  const hasSubPercents = display.subPercentLines.length > 0
  const hasMainPercent = display.showMainPercentLine
  const hasAnything =
    hasPhysical || hasSubPercents || hasMainPercent || percentBonuses.length > 0

  if (!hasAnything && !display.impossibleInMorphus) {
    return (
      <div className={textClass}>
        <p className="font-mono opacity-60">No skill % or physical bonuses.</p>
      </div>
    )
  }

  return (
    <div className={textClass}>
      {hasPhysical ? (
        <p className="font-mono tabular-nums">{display.physicalBonusSummary}</p>
      ) : null}

      {hasSubPercents ? (
        <ul className={`space-y-0.5 ${hasPhysical ? 'mt-1' : ''}`}>
          {display.subPercentLines.map((line) => (
            <li key={line.name} className="font-mono tabular-nums">
              {line.name}: {line.basePercent}% +{line.perLevel}%/level
            </li>
          ))}
        </ul>
      ) : null}

      {hasMainPercent ? (
        <p
          className={`font-mono tabular-nums ${hasPhysical || hasSubPercents ? 'mt-1' : ''}`}
        >
          Base {display.basePercent}% · +{display.perLevel}%/level
          {display.impossibleInMorphus ? (
            <span className="ml-2 font-semibold text-rose-500">
              Impossible in Morphus
            </span>
          ) : (
            <span className="ml-2 font-semibold">→ {display.total}%</span>
          )}
        </p>
      ) : null}

      {percentBonuses.length > 0 ? (
        <ul className={`space-y-0.5 ${hasMainPercent || hasPhysical || hasSubPercents ? 'mt-0.5' : ''}`}>
          {percentBonuses.map((b) => (
            <li key={`${b.label}-${b.value}`} className="font-mono tabular-nums">
              {b.value > 0 ? '+' : ''}
              {b.value}% <span className="opacity-75">{b.label}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {display.impossibleInMorphus && !hasMainPercent ? (
        <p className="mt-1 font-semibold text-rose-500">Impossible in Morphus</p>
      ) : null}
    </div>
  )
}
