# Advanced Inventory & Custom Weapon Forge

> **Implementation status:** Target UX specification. Basic inventory/armory UI exists post-spawn; full currency smart-math, weapon forge, and Destiny-style HUD swap are **not fully implemented**.

This document defines the logic for currency management, item presence states, and the creation of unique, rule-breaking weapons (like Rune Swords) with a focus on high-speed UI interaction.
1. Currency & Resource Management
Direct Entry Entry: All numerical fields (Currency, Ammo, Consumables) support direct text input via numeric keypad. Tapping the value allows for immediate typing of large numbers.
Smart Math Fields: Fields support basic operators (+/-). Typing "+500" into a wallet field of 1000 will result in 1500.
Location Labels: Users can define custom locations for currency (e.g., "Pocket," "Ship's Safe," "Merchant Bank").
2. Item Presence Logic
Items exist in one of three states to ensure character sheet accuracy:
State
Description
System Impact
 
Equipped
Item is in hand or worn.
All combat/attribute bonuses are active and pushed to the HUD.
Carried
Item is in a pack or on person.
Bonuses are dormant; item is accessible for use.
Stashed
Item is in a remote location.
Item is hidden from active character calculations. No weight/bonus impact.

3. The Weapon Forge & HUD Icons
Inspired by modern looter-shooter UIs (e.g., Destiny 2), weapons are identified by W.P. Category Icons.
Icon Mapping: Every weapon is assigned a silhouette based on its Weapon Proficiency (W.P. Sword, W.P. Archery, etc.).
Custom Property Stack: Users can add unique mechanical triggers to items:
Indestructible: Disables durability tracking.
Damage Multipliers: Conditional damage (e.g., x2 vs. Supernatural).
Quality Modifiers: Pre-calculated bonuses for "Excellent" or "Dwarven" workmanship.
Ability Triggers: Unique items (like Rune Swords) can house custom sub-abilities with their own P.P.E./I.S.P. costs.
4. Visual HUD States
The Combat HUD displays the Active Weapon icon prominently with the Strike/Parry/Dodge bonuses. Stowed Weapons (items in the "Equipped" state but not currently in hand) are shown as smaller silhouettes below the active slot for one-tap switching.
