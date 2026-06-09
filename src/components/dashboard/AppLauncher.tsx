import { useEffect, useMemo, useRef, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { isGenreId, LAUNCHER_CREATE_OPTIONS } from '../../data/genres'
import {
  formatCharacterIndexLabel,
  listRecentlyEditedCharacters,
  resolveCharacterIndexRowDisplay,
  type CharacterIndexEntry,
} from '../../lib/characterIndex'

function CharacterIndexSelectRow({
  row,
  selected,
  onSelect,
}: {
  row: CharacterIndexEntry
  selected: boolean
  onSelect: () => void
}) {
  const { genreLabel, mainLabel } = resolveCharacterIndexRowDisplay(row)
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={`relative w-full px-4 py-2.5 pr-20 text-left text-sm transition ${
        selected
          ? 'bg-cyan-500/15 font-semibold text-cyan-100 ring-1 ring-inset ring-cyan-400/50'
          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
      }`}
    >
      <sup
        className={`absolute right-3 top-2 text-[9px] font-bold uppercase tracking-wide ${
          selected ? 'text-cyan-300/90' : 'text-slate-500'
        }`}
      >
        {genreLabel}
      </sup>
      <span className="block leading-snug">{mainLabel}</span>
    </button>
  )
}

function InProgressCharacterRow({
  row,
  onOpen,
  onDelete,
}: {
  row: CharacterIndexEntry
  onOpen: () => void
  onDelete: () => void
}) {
  const { genreLabel, mainLabel } = resolveCharacterIndexRowDisplay(row)
  return (
    <div className="flex items-stretch border-b border-amber-800/30 last:border-b-0">
      <button
        type="button"
        onClick={onOpen}
        className="relative min-w-0 flex-1 px-4 py-2.5 pr-20 text-left text-sm text-slate-300 transition hover:bg-slate-800/80 hover:text-white"
      >
        <sup className="absolute right-3 top-2 text-[9px] font-bold uppercase tracking-wide text-amber-400/80">
          {genreLabel}
        </sup>
        <span className="block leading-snug">{mainLabel}</span>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="shrink-0 border-l border-amber-800/30 px-3 text-[10px] font-bold uppercase tracking-wide text-red-400/90 transition hover:bg-red-950/40 hover:text-red-300"
        title="Delete this in-progress character"
        aria-label={`Delete ${mainLabel}`}
      >
        Delete
      </button>
    </div>
  )
}

const GENRE_ACCENT: Record<string, string> = {
  nightbane: 'from-violet-900 to-indigo-950',
  rifts: 'from-amber-900 to-orange-950',
  palladium_fantasy: 'from-emerald-900 to-teal-950',
}

function CharacterPortraitCard({
  entry,
  onOpen,
}: {
  entry: CharacterIndexEntry
  onOpen: () => void
}) {
  const accent = GENRE_ACCENT[entry.creationGenreId] ?? 'from-slate-800 to-slate-950'
  const initial = entry.name.trim().charAt(0).toUpperCase() || '?'
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-[88px] shrink-0 flex-col items-center gap-2 text-center"
      title={formatCharacterIndexLabel(entry)}
    >
      <span
        className={`flex h-[88px] w-[88px] items-center justify-center rounded-xl border-2 border-slate-600/80 bg-gradient-to-br ${accent} text-2xl font-black text-white shadow-lg transition group-hover:border-cyan-400/70 group-hover:shadow-cyan-500/20`}
      >
        {initial}
      </span>
      <span className="max-w-[88px] truncate text-[10px] font-semibold text-slate-300 group-hover:text-cyan-200">
        {entry.name}
      </span>
    </button>
  )
}

/**
 * Gate Check viewport (Create Character — genre manifest).
 */
export function AppLauncher() {
  const {
    startCreation,
    loadSavedCharacter,
    savedCharacterRows,
    inProgressCharacterRows,
    deleteInProgressCharacter,
    refreshSavedCharacterIndex,
  } = useCharacter()

  const [openId, setOpenId] = useState('')
  const [openMenu, setOpenMenu] = useState(false)
  const [createMenu, setCreateMenu] = useState(false)
  const openPanelRef = useRef<HTMLDivElement>(null)
  const createPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    refreshSavedCharacterIndex()
  }, [refreshSavedCharacterIndex])

  useEffect(() => {
    if (!openId && savedCharacterRows.length > 0) {
      setOpenId(savedCharacterRows[0].id)
    }
  }, [savedCharacterRows, openId])

  const recentRows = useMemo(
    () => listRecentlyEditedCharacters(6),
    [savedCharacterRows],
  )

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node
      if (openMenu && openPanelRef.current && !openPanelRef.current.contains(t)) {
        setOpenMenu(false)
      }
      if (createMenu && createPanelRef.current && !createPanelRef.current.contains(t)) {
        setCreateMenu(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [openMenu, createMenu])

  const onOpen = (id?: string) => {
    const target = id ?? openId
    if (!target) return
    loadSavedCharacter(target)
    setOpenMenu(false)
  }

  const onCreate = (genreId: string) => {
    if (!isGenreId(genreId)) return
    startCreation(genreId)
    setCreateMenu(false)
  }

  const selectedRow = savedCharacterRows.find((r) => r.id === openId)
  const selectedRowDisplay = selectedRow
    ? resolveCharacterIndexRowDisplay(selectedRow)
    : null

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-[#0a0c12] text-slate-100">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(30,58,138,0.18),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-[28%] h-[42%] bg-cover bg-center opacity-[0.22] grayscale"
        style={{ backgroundImage: "url('/assets/launcher-hero.png')" }}
        aria-hidden
      />

      <header className="relative z-10 px-6 pt-10 text-center">
        <h1 className="text-4xl font-black uppercase tracking-[0.2em] text-white drop-shadow-lg sm:text-5xl">
          Character Nexus
        </h1>
        <p className="mt-4 text-lg font-semibold text-cyan-200/90">
          Welcome to the Nexus!
        </p>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Your tabletop character manager — open an existing record or choose a setting
          to begin the assembly wizard. Saves run through genre middleware before the
          live sheet loads.
        </p>
      </header>

      <main className="relative z-10 mx-auto mt-10 flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 pb-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div ref={openPanelRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setOpenMenu((v) => !v)
                setCreateMenu(false)
              }}
              className={`flex w-full items-center justify-center gap-3 rounded-xl border-2 px-6 py-4 text-sm font-black uppercase tracking-[0.2em] transition ${
                openMenu
                  ? 'border-cyan-400/80 bg-slate-900/90 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.25)]'
                  : 'border-slate-600 bg-slate-900/70 text-slate-200 hover:border-slate-400'
              }`}
              aria-expanded={openMenu}
            >
              <span className="text-xl" aria-hidden>
                📖
              </span>
              My Characters
            </button>

            {openMenu ? (
              <ul
                className="absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-600/90 bg-slate-950/95 py-2 shadow-2xl backdrop-blur-sm"
                role="listbox"
              >
                {savedCharacterRows.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-slate-500">
                    No spawned characters yet — finish creation and spawn to add one here.
                  </li>
                ) : (
                  savedCharacterRows.map((row) => {
                    const selected = row.id === openId
                    return (
                      <li key={row.id}>
                        <CharacterIndexSelectRow
                          row={row}
                          selected={selected}
                          onSelect={() => {
                            setOpenId(row.id)
                            onOpen(row.id)
                          }}
                        />
                      </li>
                    )
                  })
                )}
              </ul>
            ) : null}

            {selectedRowDisplay && !openMenu ? (
              <p className="mt-3 text-center text-xs text-slate-500">
                Selected: {selectedRowDisplay.mainLabel}
                <sup className="ml-1 text-[9px] font-bold uppercase tracking-wide text-slate-600">
                  {selectedRowDisplay.genreLabel}
                </sup>{' '}
                — open menu to switch
              </p>
            ) : null}
          </div>

          <div ref={createPanelRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setCreateMenu((v) => !v)
                setOpenMenu(false)
              }}
              className={`flex w-full items-center justify-center gap-3 rounded-xl border-2 px-6 py-4 text-sm font-black uppercase tracking-[0.2em] transition ${
                createMenu
                  ? 'border-violet-400/80 bg-slate-900/90 text-violet-100 shadow-[0_0_24px_rgba(167,139,250,0.25)]'
                  : 'border-slate-600 bg-slate-900/70 text-slate-200 hover:border-slate-400'
              }`}
              aria-expanded={createMenu}
            >
              <span className="text-xl" aria-hidden>
                🎲
              </span>
              Create Character
            </button>

            {createMenu ? (
              <ul
                className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-600/90 bg-slate-950/95 py-2 shadow-2xl backdrop-blur-sm"
                role="listbox"
              >
                {LAUNCHER_CREATE_OPTIONS.map((opt) => {
                  const disabled = !opt.playable
                  return (
                    <li key={opt.id}>
                      <button
                        type="button"
                        role="option"
                        disabled={disabled}
                        title={
                          disabled
                            ? 'Coming soon — not available in this build'
                            : opt.description
                        }
                        onClick={() => {
                          if (opt.playable && isGenreId(opt.id)) onCreate(opt.id)
                        }}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition ${
                          disabled
                            ? 'cursor-not-allowed text-slate-600 line-through opacity-50'
                            : 'text-slate-200 hover:bg-violet-950/60 hover:text-violet-50'
                        }`}
                      >
                        <span className="w-6 text-center text-base" aria-hidden>
                          {opt.icon}
                        </span>
                        <span>{opt.label}</span>
                        {disabled ? (
                          <span className="ml-auto text-[10px] uppercase text-slate-600">
                            Soon
                          </span>
                        ) : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>
        </div>

        {inProgressCharacterRows.length > 0 ? (
          <section className="rounded-xl border border-amber-600/40 bg-amber-950/20 px-4 py-5">
            <h2 className="text-center text-xs font-bold uppercase tracking-[0.25em] text-amber-300/90">
              In Progress
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-center text-xs text-amber-200/70">
              Draft characters saved with Save for Later — pick up where you left off.
            </p>
            <ul
              className="mx-auto mt-4 max-w-xl overflow-hidden rounded-lg border border-amber-700/50 bg-slate-950/60"
              role="listbox"
              aria-label="In progress characters"
            >
              {inProgressCharacterRows.map((row) => (
                <li key={row.id}>
                  <InProgressCharacterRow
                    row={row}
                    onOpen={() => onOpen(row.id)}
                    onDelete={() => deleteInProgressCharacter(row.id)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-auto border-t border-slate-800/80 pt-8">
          <h2 className="text-center text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
            Recently Edited Characters
          </h2>
          <div className="mt-5 flex flex-wrap justify-center gap-4 sm:gap-6">
            {recentRows.length > 0 ? (
              recentRows.map((row) => (
                <CharacterPortraitCard
                  key={row.id}
                  entry={row}
                  onOpen={() => onOpen(row.id)}
                />
              ))
            ) : (
              <p className="text-sm text-slate-600">
                Edited characters will appear here after you save a sheet.
              </p>
            )}
          </div>
        </section>
      </main>

      <a
        href="mailto:support@palladium.local?subject=Character%20Nexus%20Feedback"
        className="fixed bottom-4 right-4 z-20 rounded-lg border border-slate-600 bg-slate-900/90 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 transition hover:border-slate-400 hover:text-slate-200"
      >
        Support / Feedback
      </a>
    </div>
  )
}
