/**
 * Palladium-style gross conversion factors (engine units preference).
 * See docs/ingest/units.md and docs/units_preference.md.
 */

/** 1 inch = 2.54 cm. */
export const CM_PER_INCH = 2.54

/** Derived: 1 foot = 12 × 2.54 cm = 0.3048 m (via inches, not yards). */
export const METERS_PER_FOOT = (12 * CM_PER_INCH) / 100

/** 1 kg = 2.2 lbs. */
export const LB_PER_KG = 2.2

/** Derived: 1 lb = 1/2.2 kg. */
export const KG_PER_LB = 1 / LB_PER_KG

/** 1 yard = 1 meter — only when the book explicitly uses yards. */
export const METERS_PER_YARD = 1

/** 1 mile = 1.6 km. */
export const KM_PER_MILE = 1.6

/** 1 mph = 1.6 km/h. */
export const KMH_PER_MPH = 1.6

/** 1 cubic meter = 35 cubic feet. */
export const CUBIC_FEET_PER_CUBIC_METER = 35

/** 1 square meter = 10.8 square feet. */
export const SQUARE_FEET_PER_SQUARE_METER = 10.8

export const INCHES_PER_FOOT = 12
export const FEET_PER_YARD = 3
export const FEET_PER_MILE = 5280
