import { useEffect, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'

/** Shared freeform notes editor for Campaigns → Notes (character `playNotes`). */
export function PlayNotesEditor({
  morphus,
  eyebrow = 'Campaign notes',
}: {
  morphus: boolean
  eyebrow?: string
}) {
  const { character, setPlayNotes } = useCharacter()
  const notes = character.playNotes ?? ''
  const [draft, setDraft] = useState(notes)

  useEffect(() => {
    setDraft(notes)
  }, [notes])

  return (
    <section aria-labelledby="campaign-notes-heading" className="space-y-3">
      <div>
        <p
          className={`text-[10px] font-black uppercase tracking-wider ${
            morphus ? 'text-violet-300' : 'text-blue-800'
          }`}
        >
          {eyebrow}
        </p>
        <h2
          id="campaign-notes-heading"
          className={`text-lg font-black ${
            morphus ? 'text-violet-50' : 'text-slate-900'
          }`}
        >
          Notes
        </h2>
        <p className={`mt-1 text-xs ${morphus ? 'text-violet-300/90' : 'text-slate-600'}`}>
          Capture clues, names, objectives, and events during play.
        </p>
      </div>
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft !== notes) setPlayNotes(draft)
        }}
        placeholder="Write story notes…"
        aria-label="Campaign notes"
        className={`min-h-72 w-full resize-y rounded-lg border-2 px-4 py-3 text-sm leading-relaxed outline-none transition focus:ring-2 ${
          morphus
            ? 'border-violet-700 bg-slate-950/80 text-violet-50 placeholder:text-violet-400/60 focus:border-violet-500 focus:ring-violet-500/30'
            : 'border-blue-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20'
        }`}
      />
      <p className={`text-[11px] ${morphus ? 'text-violet-300/80' : 'text-slate-500'}`}>
        Notes apply when you leave the field — press Save to write the character file.
      </p>
    </section>
  )
}
