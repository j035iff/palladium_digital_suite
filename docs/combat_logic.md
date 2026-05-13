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

### The APM Sequence:
1. **Reset Event**: At the start of a round, the character's `Current_APM` is set to their `Max_APM`.
2. **Spend Action**: Every offensive, defensive (active), or magical action decrements `Current_APM` by 1.
3. **The "Out of Actions" State**: When `Current_APM` hits 0, the character can no longer Parry or Strike.

---

## 4. The Save System (Dynamic Targets)
| Save Type | Base Target (Human) |
| :--- | :--- |
| **Lethal Poison** | 14+ |
| **Non-Lethal Poison** | 16+ |
| **Magic (Standard)** | 12+ |
| **Magic (Ritual)** | 16+ |