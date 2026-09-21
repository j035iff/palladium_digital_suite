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
- **Weapons** lane with era sub-tabs (**Ancient weapons** / **Modern weapons**): Ancient uses a skills-style catalog picker (category dropdown + search; list only after a category — or All + search — with condensed damage/weight/flag rows; **Miscellaneous** sorted last). Selecting a catalog row enables **Use as base archetype**, which fills the **Custom weapon** editor: **Name** + locked **Linked W.P.** (category is internal only — not shown; Misc → no W.P.); **Combat stats** (Damage plus Strike / Parry / Entangle / Disarm / Rate of Fire / Strike when Thrown default **`+0`** until schema carries applicability — future: N/A only when a type can’t use a slot); **Other stats** (Material blank on fill, Weight, Length, Throwable / Two-handed / Adds PS Damage Bonus default **off**); **Description**. Custom property stack stays below (plus interim magazine toggles). Weight/length labels follow the app-wide **Standard / Metric** preference ([`units_preference.md`](../units_preference.md)); values persist as lbs / feet and convert at the UI boundary. Extra form cells round-trip in `forgeProperties.editorDraft` until a later schema pass — see deferred note in project store `internal/deferred-gear-schema-units.md`. Modern is a visible Radical Visibility stub (coming soon)
- Armor / Artifacts / Other lanes visible with Radical Visibility stubs
- Portal: **Gear Forge** + **My Custom Gear** on `AppLauncher`
- Creation: **`kind: 'creation'`** adapter (`buildCreationGearForgeAdapter`) on `tab8_gear` — same shell; commits to draft inventory (not the custom library)
- Live sheet: **`kind: 'sheet'`** adapter (`buildSheetGearForgeAdapter`) on `GearPanel` — same shell; commits to active character inventory
- GM Hub: **`kind: 'gm'`** adapter (`buildGmGearForgeAdapter`) on Hub **Gear** — same shell; commits to the selected party character save (`gmCharacterInventoryGrant`). Cast Quick-Blocks stay non-grantable with a visible reason (no inventory bags invented). Party / Cast tabs unchanged.

## Later

- Cast inventory / fodder gear bags; LAN item push
- Artifacts lane deep editor; armor/other catalogs
- Combat auto-apply of multipliers; P.P.E./I.S.P. spend for ability triggers
- **Weapon schema** — promote Custom Weapon combat/other-stat fields off `forgeProperties.editorDraft` into first-class inventory + combat consumption
- Broader catalog dual-measure backfill (see [`../ingest/units.md`](../ingest/units.md)); identity height/weight metric entry polish

**Shipped:** app-wide Standard/Metric preference (`docs/units_preference.md`) — Gear Forge weight/length labels + convert-on-edit.

Related: [inventory_weapons.md](../inventory_weapons.md) · [app_viewport_launcher.md](../app_viewport_launcher.md) · [character_creation.md](character_creation.md) · [gm_hub.md](../gm_hub.md) · [units_preference.md](../units_preference.md)
