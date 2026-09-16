# Gear Forge

Shared inventory forge shell: **Weapons / Armor / Artifacts / Other** lanes on one pipeline ([Unified Path](../unified_paths.md)).

## Hosts

| Host | Mount | Commit target |
|------|--------|----------------|
| **Portal library** | Launcher **Gear Forge** / **My Custom Gear** → `viewport: 'gear_forge'` | Custom gear library (`src/lib/gear/customGearLibrary.ts`) |
| **Creation** | Planned: `tab8_gear` before Review | Draft character inventory |
| **Live sheet** | Planned: `GearPanel` embeds shell | Active character inventory |
| **GM Hub** | Planned: Hub **Gear** tab + Party/Cast grant | Selected party/cast inventory |

## MVP (shipped)

- `GearForgeShell` + lane nav (`src/lib/forgeNavigation/gearForge.ts`)
- **Weapons** lane: ancient catalog grant, custom weapon, custom property stack (`forgeProperties` on `Weapon`)
- Armor / Artifacts / Other lanes visible with Radical Visibility stubs
- Portal: **Gear Forge** + **My Custom Gear** on `AppLauncher`

## Later

- Creation Gear tab, sheet host, GM Gear tab + Party/Cast inverse grant
- Artifacts lane deep editor; armor/other catalogs
- Combat auto-apply of multipliers; P.P.E./I.S.P. spend for ability triggers

Related: [inventory_weapons.md](../inventory_weapons.md) · [app_viewport_launcher.md](../app_viewport_launcher.md)
