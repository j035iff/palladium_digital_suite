import type { ForgeTabVisualState } from './types'

export type ForgeTabVisualTheme = {
  pill: string
  headerBar: string
  headerTitle: string
}

export const FORGE_TAB_VISUAL_THEMES: Record<ForgeTabVisualState, ForgeTabVisualTheme> = {
  complete: {
    pill: 'bg-emerald-600 text-white ring-1 ring-emerald-400/60',
    headerBar: 'bg-emerald-600 ring-1 ring-emerald-400/50',
    headerTitle: 'text-white',
  },
  active: {
    pill: 'bg-blue-600 text-white ring-1 ring-blue-400/70',
    headerBar: 'bg-blue-600 ring-1 ring-blue-400/60',
    headerTitle: 'text-white',
  },
  available: {
    pill: 'bg-slate-100 text-slate-700 ring-1 ring-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600',
    headerBar: 'bg-slate-100 ring-1 ring-slate-300 dark:bg-slate-800 dark:ring-slate-600',
    headerTitle: 'text-slate-800 dark:text-slate-100',
  },
  incomplete: {
    pill: 'bg-red-600 text-white ring-1 ring-red-400/70',
    headerBar: 'bg-red-600 ring-1 ring-red-400/60',
    headerTitle: 'text-white',
  },
  conflict: {
    pill: 'bg-amber-500 text-amber-950 ring-1 ring-amber-300',
    headerBar: 'bg-amber-500 ring-1 ring-amber-300',
    headerTitle: 'text-amber-950',
  },
  locked: {
    pill: 'bg-slate-50 text-slate-400 ring-1 ring-slate-200 dark:bg-slate-100 dark:text-slate-400 dark:ring-slate-300',
    headerBar: 'bg-slate-50 ring-1 ring-slate-200 dark:bg-slate-100 dark:ring-slate-300',
    headerTitle: 'text-slate-500 dark:text-slate-500',
  },
  na: {
    pill: 'bg-slate-900 text-slate-300 ring-1 ring-slate-700 cursor-not-allowed',
    headerBar: 'bg-slate-900 ring-1 ring-slate-700',
    headerTitle: 'text-slate-300',
  },
}

export function forgeTabVisualTheme(
  visual: ForgeTabVisualState | undefined,
): ForgeTabVisualTheme {
  return FORGE_TAB_VISUAL_THEMES[visual ?? 'active']
}
