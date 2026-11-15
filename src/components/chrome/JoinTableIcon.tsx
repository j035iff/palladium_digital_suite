/** Table / Join Session glyph for live-sheet tool cluster (Unified Path). */

export function JoinTableIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 10h16M4 14h16M8 6v12M16 6v12"
      />
      <rect x="3" y="5" width="18" height="14" rx="2" />
    </svg>
  )
}
