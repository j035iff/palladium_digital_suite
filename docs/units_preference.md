# Units preference (Standard ↔ Metric)

Engine-wide, **per-user / per-device** measurement preference. Players at the same table may disagree; the GM may house-rule verbally, but the app does not force a host-session unit lock.

**Related:** [`ingest/units.md`](./ingest/units.md) · [`unified_paths.md`](./unified_paths.md) · [`forge/gear_forge.md`](./forge/gear_forge.md)

---

## Preference storage

| Key | Where | Notes |
|-----|--------|--------|
| `pds:unitsPreference` | `localStorage` | `'standard'` \| `'metric'`; default **standard** |

Not written into character saves (see [`master_flow.md`](./master_flow.md) — saves stay free of host/display transforms).

**UI:** `UnitsPreferenceToggle` on the launcher and live-sheet chrome. Context: `UnitsPreferenceProvider` / `useUnitsPreference` (`src/lib/units/`).

---

## Resolution rules

1. **Book dual** — when a structured measure has both systems (and/or `bookDual: true`), display the side matching the preference; **do not** recalculate.
2. **Single side / custom** — convert with the gross factors below and the rounding rules in [`ingest/units.md`](./ingest/units.md).
3. **Structured fields only** — freeform `description` / `summary` prose is not rewritten by the toggle.
4. **Yards** — use the yard ladder only when the book (or `standardUnit: "yards"`) explicitly used yards; otherwise feet/inches ↔ cm/m via the inch ladder.
5. **Character height** — metric shows meters to one decimal (e.g. 5′10″ → 1.8 m); reverse uses nearest whole inch.

---

## Gross conversion factors

| Quantity | Factor |
|----------|--------|
| inch → cm | 1 in = 2.5 cm |
| foot → m | via inches (`× 0.3`) — **not** via yards |
| yard → m | 1 yd = 1 m (**yards only**) |
| mile → km | 1 mi = 1.6 km |
| lb → kg | 1 lb = 0.5 kg |
| °F → °C (absolute) | `(F − 30) / 2` |
| °C → °F (absolute) | `(C × 2) + 30` |
| °F → °C (delta) | `F / 2` |
| mph → km/h | 1 mph = 1.6 km/h |
| m³ → ft³ | 1 m³ = 35 ft³ |
| m² → ft² | 1 m² = 10.8 ft² |

---

## Runtime modules

| Module | Role |
|--------|------|
| `src/lib/units/convert.ts` | Factors + rounding |
| `src/lib/units/resolve.ts` | Dual → preferred system |
| `src/lib/units/format.ts` | Display strings / field labels |
| `src/lib/units/parse.ts` | Ingest helpers from book prose |
| `src/lib/units/preference.ts` | localStorage |
| `src/data/schemas/palladium-units.schema.json` | Shared `$defs` for catalog dual measures |

**Canonical storage today:** inventory / identity still persist US Customary numbers (`weightLbs`, `lengthFeet`, `heightFeet`/`heightInches`) and convert at the UI boundary. Catalog JSON should store dual structured measures when the book prints both.
