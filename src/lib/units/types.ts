/**
 * Dual measurement structures for catalog JSON and runtime resolution.
 * Prefer book-printed dual values; convert only when one side is missing
 * (or for custom user-entered values).
 */

export type MeasurementSystem = 'standard' | 'metric'

/** Which US Customary unit the book printed for a length (drives display + yard ladder). */
export type LengthStandardUnit = 'inches' | 'feet' | 'yards' | 'miles'

/**
 * Dual length / distance. Populate both sides when the book prints both.
 * Set `standardUnit` to the unit the book used on the standard side
 * (`yards` only when the book explicitly says yards).
 */
export type LengthMeasure = {
  /** Printed cell / prose fragment when useful for Radical Visibility. */
  display?: string
  inches?: number
  feet?: number
  yards?: number
  miles?: number
  centimeters?: number
  meters?: number
  kilometers?: number
  /** Book's standard-side unit. Defaults to `feet` when omitted. */
  standardUnit?: LengthStandardUnit
  /**
   * True when both systems appear in the book entry.
   * When true, the engine must not overwrite either side with calculated values.
   */
  bookDual?: boolean
}

export type WeightMeasure = {
  display?: string
  pounds?: number
  kilograms?: number
  bookDual?: boolean
}

export type TemperatureMeasure = {
  display?: string
  fahrenheit?: number
  celsius?: number
  /** When true, convert with 1°F = ½°C (no −30 offset). */
  isDelta?: boolean
  bookDual?: boolean
}

export type SpeedMeasure = {
  display?: string
  mph?: number
  kmh?: number
  bookDual?: boolean
}

export type VolumeMeasure = {
  display?: string
  cubicFeet?: number
  cubicMeters?: number
  bookDual?: boolean
}

export type AreaMeasure = {
  display?: string
  squareFeet?: number
  squareMeters?: number
  bookDual?: boolean
}

/**
 * Character height: feet+inches ↔ centimeters (whole cm).
 * Metric preference displays/edits centimeters only (e.g. 178 cm) — not meters
 * and not a meters+centimeters compound.
 * Legacy `meters` may appear on older dual rows; resolve converts to cm.
 */
export type CharacterHeightMeasure = {
  feet?: number
  inches?: number
  /** Preferred metric side — whole centimeters. */
  centimeters?: number
  /**
   * @deprecated Prefer {@link centimeters}. Kept for older bookDual / saves;
   * resolve treats meters as cm = round(m × 100).
   */
  meters?: number
  bookDual?: boolean
}
