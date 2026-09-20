# Gear Forge

Shared inventory forge shell: **Weapons / Armor / Artifacts / Other** lanes on one pipeline ([Unified Path](../unified_paths.md)).

## Hosts

| Host | Mount | Commit target |
|------|--------|----------------|
| **Portal library** | Launcher **Gear Forge** / **My Custom Gear** → `viewport: 'gear_forge'` | Custom gear library (`src/lib/gear/customGearLibrary.ts`) |
| **Creation** | `tab8_gear` (before Review) → `CreationGearForgePanel` + shared shell | Draft character inventory (`inventory` via session + `mergeCharacterWithInventory`) |
| **Live sheet** | `GearPanel` → shared shell + `kind: 'sheet'` adapter | Active character inventory (same session APIs as Creation) |
| **GM Hub** | Hub **Gear** tab → `GmGearPanel` + shared shell (`kind: 'gm'`) | Selected **party** character’s local save inventory |

## MVP (shipped)

- `GearForgeShell` + lane nav (`src/lib/forgeNavigation/gearForge.ts`)
- **Weapons** lane with era sub-tabs (**Ancient weapons** / **Modern weapons**): Ancient keeps catalog grant, custom weapon, and property stack (`forgeProperties` on `Weapon`); Modern is a visible Radical Visibility stub (coming soon)
- Armor / Artifacts / Other lanes visible with Radical Visibility stubs
- Portal: **Gear Forge** + **My Custom Gear** on `AppLauncher`
- Creation: **`kind: 'creation'`** adapter (`buildCreationGearForgeAdapter`) on `tab8_gear` — same shell; commits to draft inventory (not the custom library)
- Live sheet: **`kind: 'sheet'`** adapter (`buildSheetGearForgeAdapter`) on `GearPanel` — same shell; commits to active character inventory
- GM Hub: **`kind: 'gm'`** adapter (`buildGmGearForgeAdapter`) on Hub **Gear** — same shell; commits to the selected party character save (`gmCharacterInventoryGrant`). Cast Quick-Blocks stay non-grantable with a visible reason (no inventory bags invented). Party / Cast tabs unchanged.

## Later

- Cast inventory / fodder gear bags; LAN item push
- Artifacts lane deep editor; armor/other catalogs
- Combat auto-apply of multipliers; P.P.E./I.S.P. spend for ability triggers

Related: [inventory_weapons.md](../inventory_weapons.md) · [app_viewport_launcher.md](../app_viewport_launcher.md) · [character_creation.md](character_creation.md) · [gm_hub.md](../gm_hub.md)
