/** Shared Facade / Morphus chrome for gear sub-panels. */
export function gearPanelTheme(morphus: boolean) {
  return {
    shell: morphus
      ? 'border-2 border-violet-500 bg-slate-950/90 text-violet-50'
      : 'border-2 border-blue-600 bg-white text-slate-900',
    th: morphus ? 'text-violet-200' : 'text-blue-900',
    muted: morphus ? 'text-violet-300/90' : 'text-slate-600',
    btn: morphus
      ? 'rounded-md border-2 border-violet-300 bg-violet-800 px-2 py-1 text-[11px] font-black uppercase text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-35'
      : 'rounded-md border-2 border-blue-600 bg-blue-600 px-2 py-1 text-[11px] font-black uppercase text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-35',
    btnGhost: morphus
      ? 'rounded-md border-2 border-violet-500/80 bg-transparent px-2 py-1 text-[11px] font-bold uppercase text-violet-200 hover:bg-violet-950/80'
      : 'rounded-md border-2 border-slate-400 bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase text-slate-800 hover:bg-slate-200',
    btnDanger: morphus
      ? 'rounded-md border-2 border-rose-500/80 bg-rose-950/50 px-2 py-1 text-[11px] font-black uppercase text-rose-100 hover:bg-rose-900/70'
      : 'rounded-md border-2 border-rose-600 bg-rose-600 px-2 py-1 text-[11px] font-black uppercase text-white hover:bg-rose-500',
    inputCls: morphus
      ? 'w-full rounded-md border-2 border-violet-600 bg-slate-950 px-2 py-1.5 font-mono text-xs text-violet-50'
      : 'w-full rounded-md border-2 border-slate-300 bg-white px-2 py-1.5 font-mono text-xs text-slate-900',
    card: morphus
      ? 'rounded-lg border-2 border-violet-700/60 bg-slate-900/40'
      : 'rounded-lg border-2 border-blue-200 bg-blue-50/50',
    cardEquipped: morphus
      ? 'rounded-lg border-2 border-amber-400/90 bg-slate-900/80'
      : 'rounded-lg border-2 border-amber-500 bg-amber-50/90',
    dashedPanel: morphus
      ? 'rounded-lg border-2 border-dashed border-violet-600/80 bg-slate-900/50'
      : 'rounded-lg border-2 border-dashed border-blue-300/90 bg-blue-50/40',
    ammoPanel: morphus
      ? 'rounded-lg border-2 border-amber-500/70 bg-amber-950/30'
      : 'rounded-lg border-2 border-orange-400/90 bg-orange-50/70',
  }
}

export type GearPanelTheme = ReturnType<typeof gearPanelTheme>
