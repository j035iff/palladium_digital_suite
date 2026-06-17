Technical Specification: Derived Movement Engine

This document is the **source of truth** for all derived movement calculations (ground, swim, fly, leap) in the Palladium Digital Suite. Attribute wiring lives in `docs/attribute_and_stat.md`; stat stacking formulas live in `docs/stat_engine_spec.md`; this spec owns movement math only.

---

## 1. Architectural Overview

### Core Design Pillars

1. **Centralized middleware ("dumb" UI)**  
   All calculations and conditional logic occur in middleware (e.g. `characterDerived.ts` / `movementDerivation.ts`). React components consume and render the final payload only.

2. **Total reconfiguration (state gate)**  
   Calculations route on `activeForm`. Facade uses the Facade attribute pool; Morphus uses the aggregated Morphus attribute pool. Movement modifiers from Morphus traits apply to the **active form's** speed attributes.

3. **Three independent speed attributes**  
   Every character has normalized speed attributes that share the same conversion formulas but different sources:

   | Attribute | Source | When absent |
   |-----------|--------|-------------|
   | **Land Spd** | Standard Spd (creation roll + permanent bonuses + skills) | Always present |
   | **Swim Spd** | Derived from active-form **P.S.** | N/A or 0 when physically unable to swim (e.g. `buoyancy: "sink"`) |
   | **Fly Spd** | Rolled at character creation when flight exists (e.g. `2D6×10`) | Omitted when the character has no flight capability |

   Book swim rule: **yards/melee in water = P.S. × 3** (with Swimming skill).  
   Normalization: **Swim Spd attribute = round(P.S. × 3/5)** so `Swim Spd × 5 = P.S. × 3`, matching the Land Spd scale (`Land Spd × 5` yards/melee).

4. **Integer precision**  
   All derived movement numeric outputs are whole numbers. Use `Math.round()` at the end of each derivation pipeline unless a formula explicitly uses floor (leap vertical bonuses).

5. **Physical dice priority**  
   Attribute-altering dice (Spd, Fly Spd, swim flat dice on traits) are rolled at character creation and stored as integers. **Leaping** emits string payloads (e.g. `"1D6+5 Ft"`) for table-side rolls.

---

## 2. Core Data Types

```typescript
export type SpeedInputType = 'attribute' | 'mph' | 'yardsPerMelee';

export interface SpeedModifiers {
  flat?: number;
  percent?: number;
}

export interface SpeedInput {
  type: SpeedInputType;
  value: number;
  modifiers?: SpeedModifiers;
}

export interface SpeedProfile {
  attributeValue: number;
  mph: number;
  yardsPerMelee: number;
}

export interface LeapProfile {
  standingHorizontal: string;
  standingVertical: string;
  runningHorizontal: string;
  runningVertical: string;
}

export interface JumpModifier {
  flat: number;
  dice: string; // Empty string if no supplementary dice
}

export interface MorphusJumpModifiers {
  standingDistance: JumpModifier;
  standingHeight: JumpModifier;
  runningDistance?: JumpModifier; // Optional: 2× standing fallback
  runningHeight?: JumpModifier;   // Optional: 2× standing fallback
}

export interface DerivedMovementStats {
  ground: SpeedProfile;
  swim: SpeedProfile | null; // null when cannot swim
  fly?: SpeedProfile;        // only when flight capability exists
  leap: LeapProfile;
}
```

Display units: **MPH** and **yards per melee** only (no feet per second).

---

## 3. Universal Speed Engine

All continuous movement modes (ground, swim, fly) use the same proportions once a speed **attribute value** is known:

- **MPH** = `Math.round(Spd × 15/22)`
- **Yards per melee** = `Math.round(Spd × 5)`

### Normalization

Morphus traits may express speed as attribute, MPH, or yards/melee. Normalize to a base speed attribute before applying modifiers:

| Input type | Base attribute |
|------------|----------------|
| `attribute` | `value` |
| `mph` | `Math.round(value × 22/15)` |
| `yardsPerMelee` | `Math.round(value / 5)` |

### Modifier pipeline (all speed attributes)

Apply in this order:

1. Start from the base attribute for the active form.
2. Add all **flat** modifiers.
3. Apply all **percent** modifiers: `Math.round((base + flatSum) × (1 + percentSum/100))`.
4. Floor at 0.
5. Derive MPH and yards/melee from the final attribute.

```typescript
export const resolveSpeedProfile = (input: SpeedInput): SpeedProfile => {
  let baseSpd: number;

  switch (input.type) {
    case 'attribute':
      baseSpd = input.value;
      break;
    case 'mph':
      baseSpd = Math.round(input.value * (22 / 15));
      break;
    case 'yardsPerMelee':
      baseSpd = Math.round(input.value / 5);
      break;
    default:
      baseSpd = 0;
  }

  let modifiedSpd = baseSpd;
  if (input.modifiers) {
    const flatMod = input.modifiers.flat ?? 0;
    const percentMod = input.modifiers.percent ?? 0;
    modifiedSpd = modifiedSpd + flatMod;
    modifiedSpd = Math.round(modifiedSpd * (1 + percentMod / 100));
  }

  modifiedSpd = Math.max(0, modifiedSpd);

  return {
    attributeValue: modifiedSpd,
    mph: Math.round(modifiedSpd * (15 / 22)),
    yardsPerMelee: Math.round(modifiedSpd * 5),
  };
};
```

### Worked example (Land Spd, Morphus active)

| Step | Land Spd attribute |
|------|-------------------|
| Rolled Spd | 15 |
| Running skill (+4D4 rolled → 12) | 27 |
| Morphus stat base (+10) | 37 |
| Morphus trait flat (+3) | 40 |
| Morphus trait percent (−30% on land) | **28** |

Final: `resolveSpeedProfile({ type: 'attribute', value: 28 })` → mph and yards/melee.

---

## 4. Ground (Land) Speed

**Input:** resolved **Land Spd** for the active form (Facade or Morphus pool).

**Morphus inputs:** collect land speed modifiers from traits (flat, percent, dice pre-rolled at creation). Conditional terrain modifiers (e.g. −30% on land) contribute to the **percent** bucket for ground only.

**Output:** `DerivedMovementStats.ground`.

---

## 5. Swimming Speed

### Base Swim Spd attribute

1. **Skilled swimmer** (character has the Swimming skill at any learned value):  
   `baseSwimAttribute = Math.round(P.S. × 3/5)`  
   (equivalent to P.S. × 3 yards/melee.)

2. **No Swimming skill:** halve the swim capability:  
   `baseSwimAttribute = Math.round(P.S. × 3/10)`  
   (equivalent to P.S. × 3/2 yards/melee.)

3. **Cannot swim physically** (e.g. `mobility.aquaticTraits.buoyancy === "sink"`):  
   `DerivedMovementStats.swim = null` (UI shows N/A).

### Explicit land-speed override rule

Default swim derivation is P.S.-based.  
If Morphus text explicitly states swimming speed as a modifier of **land Spd** (for example: "swimming speed equal to land Spd +50%" or "double Spd for swimming"), that explicit rule **overrides** the default P.S. base.

Implementation signal:

- Set `mobility.swimSpeedBaseSource = "land_spd"` on the matching trait row.
- Keep using `mobility.swimSpeedBonus` for additive/percent modifiers.

Examples:

- Shark full form: `swimSpeedBaseSource: "land_spd"` + `swimSpeedBonus.percent: 100`  
  → `Swim Spd = Land Spd × 2`
- Dolphin/Whale rows using table rule: `swimSpeedBaseSource: "land_spd"` + `swimSpeedBonus.percent: 50`  
  → `Swim Spd = Land Spd × 1.5`

### Morphus swim modifiers

After the base Swim Spd attribute is determined for the active form:

1. Sum **flat** bonuses from `mobility.swimSpeedBonus` (including dice pre-rolled at creation).
2. Apply **percent** from `swimSpeedBonus` using the same pipeline as land speed:  
   `finalSwimAttribute = round((base + flatSum) × (1 + percentSum/100))`.
3. Pass into `resolveSpeedProfile({ type: 'attribute', value: finalSwimAttribute })`.

Morphus traits that grant Swimming skill affect whether the skilled vs unskilled base applies; skill **percentage** does not alter swim **speed** (only skill rolls).

```typescript
const calculateSwimProfile = (
  activePs: number,
  activeLandSpd: number,
  hasSwimmingSkill: boolean,
  swimBaseSource: 'ps' | 'land_spd' = 'ps',
  morphusSwimFlat: number = 0,
  morphusSwimPercent: number = 0,
): SpeedProfile => {
  const psBase = hasSwimmingSkill
    ? Math.round(activePs * (3 / 5))
    : Math.round(activePs * (3 / 10));
  const baseSwimAttribute =
    swimBaseSource === 'land_spd' ? activeLandSpd : psBase;

  return resolveSpeedProfile({
    type: 'attribute',
    value: baseSwimAttribute,
    modifiers: { flat: morphusSwimFlat, percent: morphusSwimPercent },
  });
};
```

---

## 6. Flying Speed

**Separate attribute** — not derived from Land Spd.

1. If the character has flight capability, roll `mobility.flightEngine.flySpdAttribute` at character creation (e.g. `2D6×10`) and store the result on the character record.
2. If a trait specifies `flightEngine.maxSpeedMph` without a fly attribute, normalize from MPH input type.
3. Apply flat/percent morphus flight modifiers through the same pipeline if present.
4. If no flight capability, omit `DerivedMovementStats.fly`.

```typescript
const calculateFlyProfile = (
  storedFlySpdAttribute: number,
  morphusFlyFlat: number = 0,
  morphusFlyPercent: number = 0,
): SpeedProfile =>
  resolveSpeedProfile({
    type: 'attribute',
    value: storedFlySpdAttribute,
    modifiers: { flat: morphusFlyFlat, percent: morphusFlyPercent },
  });
```

---

## 7. Dynamic Leaping Engine

Leaping depends on P.S., Land Spd, character height, and Acrobatics/Gymnastics.

### Morphus leap rules

- **Strictly additive:** all `jumpModifiers` flat and dice values add to the computed leap formula. No override/replace semantics.
- **2× fallback:** if standing modifiers exist but running modifiers are omitted, running defaults to twice standing (flat × 2, same dice string). Vice versa when only running is provided.
- **Dice appending:** supplementary dice (e.g. `+1D4`) append before the flat bonus in the output string.

```typescript
const formatLeapString = (
  diceCount: number,
  diceType: 'D4' | 'D6',
  bonus: number,
  extraDice: string = '',
): string => {
  const roundedBonus = Math.round(bonus);
  let bonusStr = '';
  if (roundedBonus > 0) bonusStr = `+${roundedBonus}`;
  if (roundedBonus < 0) bonusStr = `${roundedBonus}`;
  const extraDiceStr = extraDice ? `+${extraDice}` : '';
  return `${diceCount}${diceType}${extraDiceStr}${bonusStr} Ft`;
};

export const calculateLeapProfile = (
  isMorphus: boolean,
  ps: number,
  spd: number,
  totalHeightInches: number,
  hasAcrobaticsOrGymnastics: boolean,
  rawMorphusMods?: MorphusJumpModifiers,
): LeapProfile => {
  const mMods = rawMorphusMods ?? {
    standingDistance: { flat: 0, dice: '' },
    standingHeight: { flat: 0, dice: '' },
  };

  const mods = {
    standDist: mMods.standingDistance,
    standHeight: mMods.standingHeight,
    runDist: mMods.runningDistance ?? {
      flat: mMods.standingDistance.flat * 2,
      dice: mMods.standingDistance.dice,
    },
    runHeight: mMods.runningHeight ?? {
      flat: mMods.standingHeight.flat * 2,
      dice: mMods.standingHeight.dice,
    },
  };

  const psRatio = Math.floor(ps / 10);
  const leapBaseDiceNumber = psRatio < 2 ? 1 : Math.round(ps / 15);

  const heightRatio = Math.round((totalHeightInches * 2) / 36);
  const leapBase =
    heightRatio < 1 ? 0 : heightRatio + (hasAcrobaticsOrGymnastics ? 1 : 0);

  const spdMultiplier = spd < 20 ? 1.5 : 2 + Math.floor((spd - 20) / 10) * 0.5;

  const standHorizDiceType = hasAcrobaticsOrGymnastics ? 'D6' : 'D4';
  const standVertDiceCount = Math.round(leapBaseDiceNumber / 2);
  const runHorizDiceCount = hasAcrobaticsOrGymnastics
    ? leapBaseDiceNumber + 1
    : leapBaseDiceNumber;
  const runVertDiceCount = Math.round(leapBaseDiceNumber);

  if (isMorphus) {
    return {
      standingHorizontal: formatLeapString(
        leapBaseDiceNumber,
        standHorizDiceType,
        leapBase + mods.standDist.flat,
        mods.standDist.dice,
      ),
      standingVertical: formatLeapString(
        standVertDiceCount,
        'D4',
        Math.floor((leapBase + mods.standHeight.flat) * 0.75) +
          (hasAcrobaticsOrGymnastics ? 1 : 0),
        mods.standHeight.dice,
      ),
      runningHorizontal: formatLeapString(
        runHorizDiceCount,
        'D6',
        leapBase * spdMultiplier + mods.runDist.flat,
        mods.runDist.dice,
      ),
      runningVertical: formatLeapString(
        runVertDiceCount,
        'D4',
        Math.floor(leapBase * 0.75 + mods.runHeight.flat) +
          (hasAcrobaticsOrGymnastics ? 2 : 1),
        mods.runHeight.dice,
      ),
    };
  }

  return {
    standingHorizontal: formatLeapString(
      leapBaseDiceNumber,
      standHorizDiceType,
      leapBase,
    ),
    standingVertical: formatLeapString(
      standVertDiceCount,
      'D4',
      Math.floor(leapBase / 4) + (hasAcrobaticsOrGymnastics ? 1 : 0),
    ),
    runningHorizontal: formatLeapString(
      runHorizDiceCount,
      'D6',
      leapBase * spdMultiplier,
    ),
    runningVertical: formatLeapString(
      runVertDiceCount,
      'D4',
      Math.floor(leapBase / 2) + (hasAcrobaticsOrGymnastics ? 2 : 1),
    ),
  };
};
```

When Morphus is active, use Morphus P.S., Land Spd, height, and aggregated `jumpModifiers`. Facade branch ignores Morphus leap traits.

---

## 8. Payload Assembly

Middleware builds `DerivedMovementStats` per `activeForm`:

1. Resolve Land Spd → `ground`.
2. Resolve Swim Spd from P.S. + skill gate + morphus swim modifiers → `swim` or `null`.
3. If flight exists, resolve stored Fly Spd + modifiers → `fly`.
4. Compute `leap` from active-form stats and morphus jump inputs.

The Movement Panel subscribes to attribute changes per `docs/attribute_and_stat.md` §3 and renders this payload.
