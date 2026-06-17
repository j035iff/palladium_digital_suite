# Combat Logic & Megaversal Scaling: Technical Specification

This document defines the rules for cross-setting combat, damage scaling, and the melee action economy. It ensures that the application can bridge different Palladium settings (e.g., Nightbane and Rifts) without breaking the core engine.

---

## 1. Damage Scaling (The M.D.C. Barrier)
The engine must handle two distinct tiers of durability and destruction.

| Damage Type | Scaling Logic | UI Representation |
| :--- | :--- | :--- |
| **S.D.C. / H.P.** | Standard human-scale damage. | Blue/Red bars in the Vitality Header. |
| **M.D.C.** | Mega-Damage. 1 M.D.C. = 100 S.D.C. | Gold bar/border in the Vitality Header. |

### Logic Requirements:
- **The 100x Rule**: Any attack tagged as `Mega-Damage` (M.D.) against a target with only `S.D.C.` ignores S.D.C. and destroys the target (or deals 100x damage to the H.P. pool).
- **The "Invulnerability" Flag**: Targets with M.D.C. are immune to S.D.C. weapons unless the weapon is specifically tagged as "Anti-M.D.C." (e.g., certain magic or tech).

---

## 2. Physical Strength (P.S.) Tiers
To satisfy the "Megaversal Bridge," P.S. is not just a number; it has a **Power Tier**.

| P.S. Tier | Damage Logic | Lifting/Carrying Logic |
| :--- | :--- | :--- |
| **Standard** | Standard P.S. damage bonuses. | P.S. x 10 lbs (Carry). |
| **Augmented** | Enhanced bonuses; can damage M.D.C. | P.S. x 20 lbs (Carry). |
| **Robotic** | Fixed damage dice based on P.S. | P.S. x 25 lbs (Carry). |
| **Supernatural** | Massive M.D.C. punch damage. | P.S. x 50 lbs (Carry). |

---

## 3. The Melee Economy (APM Tracker)
Palladium uses a "Melee Round" (15 seconds) divided into individual "Attacks Per Melee" (A.P.M.).

**APM stacking formula** (PC base, HtH, Race, OCC, Skills, Morphus base, traits): `docs/stat_engine_spec.md` §4.5 and §5.4.  
**Core term** (`2 + HtH`, uncapped): `src/lib/meleeCombat.ts`.

### The APM Sequence:
1. **Reset Event**: At the start of a round, the character's `Current_APM` is set to their `Max_APM`.
2. **Spend Action**: Every offensive, defensive (active), or magical action decrements `Current_APM` by 1.
3. **The "Out of Actions" State**: When `Current_APM` hits 0, the character can no longer Dodge or Strike, character may still Parry as that is a "free" action.

---

## 4. The Save System (Dynamic Targets)

The GM calls the save number from the book (e.g. “save vs magic 12”). The player rolls **d20 + save bonuses** and needs a total **≥ the called number**. The character sheet shows the **base target** and the **total bonus to add to the roll** — not a pre-reduced threshold.

| Save Type | Base Target (Human) |
| :--- | :--- |
| **Lethal Poison** | 14+ |
| **Non-Lethal Poison** | 16+ |
| **Magic (Standard)** | 12+ |
| **Magic (Ritual)** | 16+ |

### 4.1 Defender wins ties (global)

Unless an ability explicitly overrides it:

| Context | Tie goes to |
| :--- | :--- |
| **Saving throw** | The character rolling the save |
| **Opposed combat defense** (parry/dodge vs strike) | The defender |

Implementation: `src/lib/opposedRollRules.ts` (`DEFENDER_WINS_TIES`).

Book wording like Darksong’s “roll under 10” means **fail the save vs 10** — encode as `saveKind: base_pe`, `targetNumber: 10` (same as any other roll-over save).


## 5. Damage Multiplier Stacking

This rule is **universal** for all damage multiplier stacking (outgoing attack modifiers, incoming damage affinities, critical strikes, from-behind bonuses, weapon doublers, and any other ×N damage factor).

**Outgoing** and **incoming** damage are resolved in two separate passes. Outgoing damage is calculated first; that result is then modified by incoming bonuses and penalties.

### 5.1 Combining multipliers greater than 1

Only multipliers **strictly greater than 1** participate in this step. Ignore multipliers of exactly **1** (no effect).

1. Take the **highest** multiplier among all sources greater than 1 as the **base**.
2. For every **other** multiplier greater than 1, add its **bonus portion**: `(multiplier − 1)`.
3. The stacked multiplier is: **base + Σ(bonus portions from the other sources > 1)**.

Equivalently: sort all multipliers > 1, use the largest as the base, and add `(m − 1)` for each remaining value.

| Sources (all > 1) | Calculation | Result |
| :--- | :--- | :--- |
| ×2 + ×2 | 2 + (2−1) | **×3** |
| ×2 + ×1.5 | 2 + (1.5−1) | **×2.5** |
| ×2 + ×2 + ×3 | 3 + (2−1) + (2−1) | **×5** |
| ×4 + ×3 + ×2 + ×2 | 4 + (3−1) + (2−1) + (2−1) | **×8** |

### 5.2 Multipliers less than 1

After §5.1, apply every multiplier **less than 1** by **multiplying** the result (same treatment as fractional damage affinities). They do not add bonus portions in §5.1.

| Sources | Step 1 (> 1) | Step 2 (< 1) | Result |
| :--- | :--- | :--- | :--- |
| ×2 + ×0.5 | ×2 | ×2 × 0.5 | **×1** |
| ×4 + ×3 + ×2 + ×2 + ×0.5 | ×8 | ×8 × 0.5 | **×4** |

### 5.3 Incoming damage affinities

The same §5.1 / §5.2 rules apply to **incoming** damage (e.g. Morphus `damageAffinities` on the defender). When multiple affinities for the **same damage type** are greater than 1, stack them with §5.1—not by multiplying ×2 × ×2 = ×4.

Example: one trait gives ×2 fire damage taken and another gives ×2 fire → **×3** fire incoming (2 + 1), not ×4.

### 5.4 Resolution order (full hit)

1. **Roll base damage** — dice plus flat bonuses (P.S., Hand-to-Hand damage, weapon flats, etc.).
2. **Outgoing multiplier** — collect all outgoing damage multipliers for this attack; apply §5.1 then §5.2 → `outgoingMultiplier`.
3. **Outgoing damage** — `outgoingDamage = round(baseDamage × outgoingMultiplier)`.
4. **Incoming multiplier** — collect defender incoming modifiers for this damage type (affinities, vulnerabilities, resistances); apply §5.1 then §5.2 → `incomingMultiplier`.
5. **Final damage** — `finalDamage = round(outgoingDamage × incomingMultiplier)`.
6. **Vitality** — apply `finalDamage` through M.D./S.D.C. rules (§1).

### 5.5 Worked example

A player deals **fire** damage, scores a **natural 20** on a **critical strike from behind** (two ×2 outgoing sources → **×3** outgoing). They roll **10** base damage.

- Outgoing: 10 × 3 = **30**

If the target **takes double damage from fire** (×2 incoming):

- Final: 30 × 2 = **60**

If the target **takes half damage from fire** (×0.5 incoming; no §5.1 step):

- Final: 30 × 0.5 = **15**

### 5.6 Flat bonuses (unchanged)

Strike, parry, dodge, and **flat** damage bonuses still **add**; this section applies only to **multiplicative** (×N) damage factors, not to +N dice or +N flat damage.