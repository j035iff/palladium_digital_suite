export function ForgeTabNaBanner({ message }: { message: string }) {
  return (
    <div
      className="rounded-lg border border-slate-500/50 bg-slate-100 px-4 py-3 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-100"
      role="status"
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Not applicable
      </p>
      <p className="mt-1 leading-snug">{message}</p>
    </div>
  )
}
