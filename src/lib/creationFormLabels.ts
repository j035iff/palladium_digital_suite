/** User-facing creation labels — Facade/Morphus only for Nightbane dual-form. */

export function creationHpLabel(supportsDualForm: boolean, form?: 'human' | 'morphus'): string {
  if (!supportsDualForm) return 'H.P.'
  if (form === 'morphus') return 'Morphus H.P.'
  return 'Human form H.P.'
}

export function creationSdcLabel(supportsDualForm: boolean, form?: 'human' | 'morphus'): string {
  if (!supportsDualForm) return 'S.D.C.'
  if (form === 'morphus') return 'Morphus S.D.C.'
  return 'Human form S.D.C.'
}

export function creationAttributesBlockerLabel(supportsDualForm: boolean, form: 'human' | 'morphus'): string {
  if (!supportsDualForm) {
    return 'Attributes look incomplete or invalid — finish attribute allocation.'
  }
  if (form === 'morphus') {
    return 'Morphus attributes look incomplete or invalid — finish attribute allocation.'
  }
  return 'Human form attributes look incomplete or invalid — finish attribute allocation.'
}

export function creationIspLabel(supportsDualForm: boolean): string {
  return supportsDualForm ? 'Morphus I.S.P.' : 'I.S.P.'
}
