/** Shared light left-column chrome for the creation forge shell. */
export function creationForgePanelSurfaceClass(morphus: boolean): string {
  return morphus
    ? 'border-violet-300 bg-violet-50 text-violet-950'
    : 'border-slate-300 bg-slate-100 text-slate-900'
}

export function creationForgeLeftColumnClass(morphus: boolean): string {
  return morphus ? 'bg-violet-50/80' : 'bg-slate-100'
}

export function creationForgePanelHeaderBorderClass(morphus: boolean): string {
  return morphus ? 'border-violet-200' : 'border-slate-300'
}

export function creationForgePanelMutedTextClass(morphus: boolean): string {
  return morphus ? 'text-violet-800' : 'text-slate-700'
}

export function creationForgePanelSubduedTextClass(morphus: boolean): string {
  return morphus ? 'text-violet-700' : 'text-slate-600'
}
