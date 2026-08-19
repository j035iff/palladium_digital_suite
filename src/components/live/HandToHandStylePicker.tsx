type Style = {
  catalogId: string
  name: string
}

type Props = {
  morphus: boolean
  styles: readonly Style[]
  activeCatalogId: string | null
  onSelect: (catalogId: string) => void
  heading?: string
  singleStyleHint?: string
}

/**
 * Shared Hand-to-Hand roster — Combat Unarmed expand and Skills tab.
 * Multiple owned styles (rare) switch like a weapon slot.
 */
export function HandToHandStylePicker({
  morphus,
  styles,
  activeCatalogId,
  onSelect,
  heading = 'Hand-to-Hand',
  singleStyleHint,
}: Props) {
  const muted = morphus ? 'text-violet-300/90' : 'text-slate-600'
  const listBox = morphus
    ? 'divide-violet-800/80 border-violet-700/80 bg-black/40'
    : 'divide-slate-200 border-slate-200 bg-white'

  return (
    <div>
      <p
        className={`mb-1 text-[10px] font-black uppercase tracking-wider ${
          morphus ? 'text-violet-200' : 'text-blue-900'
        }`}
      >
        {heading}
      </p>
      {styles.length <= 1 ? (
        <p className={`text-[11px] ${muted}`}>
          {singleStyleHint ??
            `${styles[0]?.name ?? 'Hand-to-Hand: None'} — only one style is known.`}
        </p>
      ) : (
        <ul className={`divide-y rounded-lg border text-[12px] ${listBox}`}>
          {styles.map((style) => {
            const active = activeCatalogId === style.catalogId
            return (
              <li key={style.catalogId}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between px-3 py-2 text-left ${
                    active
                      ? morphus
                        ? 'bg-violet-800/70 font-bold'
                        : 'bg-blue-100 font-bold'
                      : morphus
                        ? 'hover:bg-violet-950/80'
                        : 'hover:bg-slate-50'
                  }`}
                  onClick={() => onSelect(style.catalogId)}
                  aria-pressed={active}
                >
                  <span className="truncate">{style.name}</span>
                  <span className={`text-[10px] uppercase ${muted}`}>
                    {active ? 'Active' : 'Select'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
