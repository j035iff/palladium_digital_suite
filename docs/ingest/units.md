# Measurement units ingest

How to encode Standard/Metric quantities on catalog rows so the engine-wide units preference can resolve them.

**Runtime:** [`../units_preference.md`](../units_preference.md) · schema `$defs`: `src/data/schemas/palladium-units.schema.json` · example: `src/data/schemas/examples/palladium-units.example.json` · parsers: `src/lib/units/parse.ts`

Cross-cutting — apply during Pass A/B for **any** catalog that carries measurable length, weight, temperature, speed, volume, or area.

---

## Authoring rules

1. **Book dual wins** — if the book prints both systems (e.g. `100 ft (30.5 m)`, `39°F (4°C)`), store **both** numeric sides and set `bookDual: true`. Do **not** replace book metric with engine-calculated values.
2. **Single side** — if only one system appears, store that side and leave the other absent (`bookDual: false` or omit). The engine fills display via gross conversion.
3. **Custom / user gear** — only one side is known; engine converts. Do not invent a fake `bookDual`.
4. **Yards** — set `standardUnit: "yards"` only when the book explicitly says yards. Otherwise use `feet` / `inches` / `miles`. Display and conversion follow that unit (yard ladder is 1:1 with meters; feet use the inch→cm ladder).
5. **Structured fields only** — put measures on typed objects (`lengthMeasure`, `weightMeasure`, …). Do not rely on the units toggle to rewrite freeform `description` prose.
6. **Dice lengths** — ignore for now (`1D4 feet`, ranges like `0.3–1.2 m` from dice). Leave in prose; do not force a single dual measure until ruled.
7. **Temperature deltas** — Storm Maker-style `±4°F` / `alter by 10°F` → `isDelta: true` (conversion `1°F = ½°C`). Absolute readings (e.g. water at `39°F`) → `isDelta: false` / omit.

---

## Gross factors (engine)

| From | To | Factor | Rounding |
|------|-----|--------|----------|
| in | cm | × 2.54 | nearest whole cm when length &lt; 1 ft |
| ft | m | × 0.3048 (via inches) | nearest tenth m when length ≥ 1 ft |
| yd | m | × 1 | nearest tenth (**yards only**) |
| mi | km | × 1.6 | nearest tenth |
| kg | lb | × 2.2 | nearest tenth (lb → kg uses ÷ 2.2) |
| °F abs | °C | `(F−30)/2` | nearest whole |
| °C abs | °F | `(C×2)+30` | nearest whole |
| °F delta | °C | `/2` | nearest whole |
| mph | km/h | × 1.6 | nearest tenth |
| m³ | ft³ | × 35 | nearest tenth |
| m² | ft² | × 10.8 | nearest tenth |
| character height | m | via inches × 2.54 | nearest tenth m (e.g. 5′10″ → 1.8 m) |
| m → height | ft+in | reverse | nearest whole inch |

---

## Schema fragments

`$ref` from domain schemas:

```text
https://megaverse-companion.local/schemas/palladium-units.schema.json#/$defs/lengthMeasure
https://megaverse-companion.local/schemas/palladium-units.schema.json#/$defs/weightMeasure
https://megaverse-companion.local/schemas/palladium-units.schema.json#/$defs/temperatureMeasure
https://megaverse-companion.local/schemas/palladium-units.schema.json#/$defs/speedMeasure
https://megaverse-companion.local/schemas/palladium-units.schema.json#/$defs/volumeMeasure
https://megaverse-companion.local/schemas/palladium-units.schema.json#/$defs/areaMeasure
https://megaverse-companion.local/schemas/palladium-units.schema.json#/$defs/characterHeightMeasure
```

**Ancient weapons** already use local `lengthMeasure` / `weightMeasure` with `feet`/`meters` and `lb`/`kg` — keep book dual there; align new catalogs with the shared `$defs` (pounds/kilograms naming).

---

## Pass A checklist (when a row has measurable quantities)

- [ ] Scan description/tables for dual print (`ft (m)`, `lb (kg)`, `°F (°C)`, `mph (km)`, etc.)
- [ ] Prefer `parseLengthFromProse` / `parseWeightFromProse` / `parseTemperatureFromProse` / `parseSpeedFromProse` as a starting point; verify against the book
- [ ] Set `standardUnit` correctly (especially **yards** vs **feet**)
- [ ] Set `bookDual: true` only when both sides came from the book
- [ ] Mark temperature `isDelta` when the book describes a change, not an absolute reading
- [ ] Leave dice-based distances in prose for now

---

## Batch template (add to Pass A/B notes)

```text
UNITS
- Dual measures encoded: [list fields]
- bookDual rows: [ids]
- Single-side (engine will convert): [ids]
- Yards explicit: [ids or none]
- Temp deltas: [ids or none]
- Dice lengths skipped: [ids or none]
- Open rulings: …
```

---

## Validation

```bash
npm run validate:schemas
npx vitest run src/lib/units/units.test.ts
```

Catalog backfill of existing prose-only rows is **out of scope** for the initial units PR — encode dual measures on new/updated batches going forward.
