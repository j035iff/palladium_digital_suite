import type { ReactNode } from 'react'
import type { CombatWeaponGlyphId } from '../../lib/combatWeaponSlots'

const SIZE = 28

function Svg({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox="0 0 28 28"
      aria-hidden={false}
      role="img"
      aria-label={label}
      className="shrink-0"
    >
      {children}
    </svg>
  )
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

/** Simple W.P. category glyph — not Destiny art; silhouette pack is later. */
export function CombatWeaponGlyph({
  id,
}: {
  id: CombatWeaponGlyphId
}) {
  switch (id) {
    case 'fist':
      return (
        <Svg label="Unarmed">
          <path d="M8 16v-5a2 2 0 0 1 2-2h1V8a2 2 0 0 1 4 0v1h1a2 2 0 0 1 2 2v7a4 4 0 0 1-8 0Z" {...stroke} />
        </Svg>
      )
    case 'sword':
      return (
        <Svg label="Sword">
          <path d="M14 4v16M11 20h6M14 4l3 3M14 4 11 7" {...stroke} />
          <path d="M10 18h8" {...stroke} />
        </Svg>
      )
    case 'axe':
      return (
        <Svg label="Axe">
          <path d="M8 22 18 8" {...stroke} />
          <path d="M16 6c3 1 5 4 5 7-4 0-7-2-8-5Z" {...stroke} />
        </Svg>
      )
    case 'knife':
      return (
        <Svg label="Knife">
          <path d="M7 21 19 8l2 2-8 12H7Z" {...stroke} />
          <path d="M12 16l4-4" {...stroke} />
        </Svg>
      )
    case 'whip':
      return (
        <Svg label="Whip">
          <path d="M6 20c8-1 6-8 12-10 3-1 4 3 2 4" {...stroke} />
          <circle cx="6" cy="20" r="1.5" fill="currentColor" />
        </Svg>
      )
    case 'bow':
      return (
        <Svg label="Bow">
          <path d="M8 5c8 4 8 14 0 18" {...stroke} />
          <path d="M8 5v18M10 14h10" {...stroke} />
        </Svg>
      )
    case 'blunt':
      return (
        <Svg label="Blunt">
          <path d="M14 12v10" {...stroke} />
          <circle cx="14" cy="8" r="4" {...stroke} />
        </Svg>
      )
    case 'chain':
      return (
        <Svg label="Chain">
          <circle cx="9" cy="10" r="3" {...stroke} />
          <circle cx="19" cy="18" r="3" {...stroke} />
          <path d="M11 12 17 16" {...stroke} />
        </Svg>
      )
    case 'polearm':
      return (
        <Svg label="Polearm">
          <path d="M8 22 20 6" {...stroke} />
          <path d="M16 5h6v6" {...stroke} />
        </Svg>
      )
    case 'pistol':
      return (
        <Svg label="Pistol">
          <path d="M6 12h12l2-3h2" {...stroke} />
          <path d="M10 12v7h4" {...stroke} />
        </Svg>
      )
    case 'rifle':
      return (
        <Svg label="Rifle">
          <path d="M3 14h18l3-3" {...stroke} />
          <path d="M10 14v6h3" {...stroke} />
          <path d="M16 11V8" {...stroke} />
        </Svg>
      )
    case 'shotgun':
      return (
        <Svg label="Shotgun">
          <path d="M3 15h17l4-4" {...stroke} />
          <path d="M4 15v5h4" {...stroke} />
          <path d="M12 15v-3" {...stroke} />
        </Svg>
      )
    case 'smg':
      return (
        <Svg label="Submachine gun">
          <path d="M5 13h13l2-2" {...stroke} />
          <path d="M9 13v7h3" {...stroke} />
          <path d="M14 11V8h4" {...stroke} />
        </Svg>
      )
    case 'heavy':
      return (
        <Svg label="Heavy weapon">
          <rect x="4" y="10" width="16" height="6" rx="1" {...stroke} />
          <path d="M8 16v5M16 16v5" {...stroke} />
        </Svg>
      )
    default:
      return (
        <Svg label="Weapon">
          <circle cx="14" cy="14" r="8" {...stroke} />
          <path d="M14 8v8M10 14h8" {...stroke} />
        </Svg>
      )
  }
}
