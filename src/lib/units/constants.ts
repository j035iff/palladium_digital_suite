/**
 * Palladium-style gross conversion factors (engine units preference).
 * See docs/ingest/units.md and docs/units_preference.md.
 */

/** 1 inch = 2.5 cm (gross). */
export const CM_PER_INCH = 2.5

/** Derived: 1 foot = 30 cm = 0.3 m (via inches, not yards). */
export const METERS_PER_FOOT = (12 * CM_PER_INCH) / 100

/** 1 lb = 0.5 kg (gross). */
export const KG_PER_LB = 0.5

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
