import type {
  ConfiguratorFilterDomain,
  ConfiguratorFilterExpression,
  ConfiguratorFilterGroupOp,
} from '../../lib/configuratorFilterExpression'
import {
  newFilterGroupNode,
  newFilterNotNode,
  newFilterPredicateNode,
} from '../../lib/configuratorFilterExpression'

export type ConfiguratorFilterCategoryOption = {
  value: string
  label: string
}

type ConfiguratorFilterBuilderProps = {
  root: ConfiguratorFilterExpression
  raceCategories: readonly ConfiguratorFilterCategoryOption[]
  occCategories: readonly ConfiguratorFilterCategoryOption[]
  bookCategories: readonly ConfiguratorFilterCategoryOption[]
  morphus: boolean
  onChange: (next: ConfiguratorFilterExpression | null) => void
}

type NodeEditorProps = {
  node: ConfiguratorFilterExpression
  raceCategories: readonly ConfiguratorFilterCategoryOption[]
  occCategories: readonly ConfiguratorFilterCategoryOption[]
  bookCategories: readonly ConfiguratorFilterCategoryOption[]
  morphus: boolean
  depth: number
  isRoot?: boolean
  onChange: (next: ConfiguratorFilterExpression | null) => void
}

function selectClass(morphus: boolean): string {
  return morphus
    ? 'rounded-lg border-2 border-violet-700 bg-slate-900/80 px-2 py-1.5 text-xs font-semibold capitalize tracking-wide text-violet-100'
    : 'rounded-lg border-2 border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold capitalize tracking-wide text-slate-800'
}

function buttonClass(
  morphus: boolean,
  variant: 'primary' | 'ghost' | 'danger' = 'ghost',
): string {
  if (variant === 'primary') {
    return morphus
      ? 'rounded-lg border border-violet-500 px-2.5 py-1 text-xs font-semibold text-violet-200 hover:bg-violet-950/60'
      : 'rounded-lg border border-blue-500 px-2.5 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-50'
  }
  if (variant === 'danger') {
    return morphus
      ? 'rounded-lg border border-slate-600 px-2 py-1 text-xs font-semibold text-slate-400 hover:border-rose-500 hover:text-rose-200'
      : 'rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-500 hover:border-rose-400 hover:text-rose-700'
  }
  return morphus
    ? 'rounded-lg border border-slate-600 px-2.5 py-1 text-xs font-semibold text-slate-400 hover:text-violet-100'
    : 'rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800'
}

function categoriesForDomain(
  domain: ConfiguratorFilterDomain,
  raceCategories: readonly ConfiguratorFilterCategoryOption[],
  occCategories: readonly ConfiguratorFilterCategoryOption[],
  bookCategories: readonly ConfiguratorFilterCategoryOption[],
): readonly ConfiguratorFilterCategoryOption[] {
  if (domain === 'race') return raceCategories
  if (domain === 'book') return bookCategories
  return occCategories
}

function ConfiguratorFilterNodeEditor({
  node,
  raceCategories,
  occCategories,
  bookCategories,
  morphus,
  depth,
  isRoot = false,
  onChange,
}: NodeEditorProps) {
  const legacyTag = (node as { kind: string; tag?: string }).kind === 'tag'
    ? (node as unknown as { id: string; kind: 'tag'; tag: string })
    : null

  if (node.kind === 'predicate' || legacyTag) {
    const predicate =
      node.kind === 'predicate'
        ? node
        : {
            id: legacyTag!.id,
            kind: 'predicate' as const,
            domain: 'occ' as const,
            value: legacyTag!.tag,
          }
    const categories = categoriesForDomain(
      predicate.domain,
      raceCategories,
      occCategories,
      bookCategories,
    )
    return (
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-[6rem] flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">
            Type
          </span>
          <select
            value={predicate.domain}
            onChange={(e) => {
              const domain = e.target.value as ConfiguratorFilterDomain
              const nextCategories = categoriesForDomain(
                domain,
                raceCategories,
                occCategories,
                bookCategories,
              )
              onChange({
                ...predicate,
                domain,
                value: nextCategories.some((c) => c.value === predicate.value)
                  ? predicate.value
                  : '',
              })
            }}
            aria-label="Filter type"
            className={selectClass(morphus)}
          >
            <option value="race">Race</option>
            <option value="occ">O.C.C.</option>
            <option value="book">Book</option>
          </select>
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">
            Category
          </span>
          <select
            value={predicate.value}
            onChange={(e) => onChange({ ...predicate, value: e.target.value })}
            aria-label="Filter category"
            className={`flex-1 ${selectClass(morphus)}`}
          >
            <option value="">Select category…</option>
            {categories.map((option) => (
              <option key={`${predicate.domain}:${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {!isRoot ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className={`self-end ${buttonClass(morphus, 'danger')}`}
          >
            Remove
          </button>
        ) : null}
      </div>
    )
  }

  if (node.kind === 'not') {
    return (
      <div
        className={`flex flex-col gap-2 rounded-lg border border-dashed p-2 ${
          morphus ? 'border-rose-500/40 bg-rose-950/20' : 'border-rose-300 bg-rose-50/50'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wide text-rose-600 dark:text-rose-300">
            NOT
          </span>
          {!isRoot ? (
            <button
              type="button"
              onClick={() => onChange(null)}
              className={buttonClass(morphus, 'danger')}
            >
              Remove
            </button>
          ) : null}
        </div>
        <ConfiguratorFilterNodeEditor
          node={node.child}
          raceCategories={raceCategories}
          occCategories={occCategories}
          bookCategories={bookCategories}
          morphus={morphus}
          depth={depth + 1}
          onChange={(child) => {
            if (!child) {
              onChange(null)
              return
            }
            onChange({ ...node, child })
          }}
        />
      </div>
    )
  }

  const groupShell = depth > 0
  return (
    <div
      className={
        groupShell
          ? `rounded-lg border p-2 ${
              morphus ? 'border-violet-700/80 bg-slate-900/40' : 'border-slate-200 bg-slate-50/80'
            }`
          : 'flex flex-col gap-2'
      }
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">
          {isRoot ? 'Match' : 'Group'}
        </span>
        <select
          value={node.op}
          onChange={(e) =>
            onChange({ ...node, op: e.target.value as ConfiguratorFilterGroupOp })
          }
          aria-label="Group operator"
          className={selectClass(morphus)}
        >
          <option value="and">AND</option>
          <option value="or">OR</option>
        </select>
        {!isRoot ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className={buttonClass(morphus, 'danger')}
          >
            Remove group
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 pl-1">
        {node.children.length === 0 ? (
          <p className="text-xs opacity-70">Add conditions or nested groups below.</p>
        ) : (
          node.children.map((child) => (
            <ConfiguratorFilterNodeEditor
              key={child.id}
              node={child}
              raceCategories={raceCategories}
              occCategories={occCategories}
              bookCategories={bookCategories}
              morphus={morphus}
              depth={depth + 1}
              onChange={(nextChild) => {
                if (!nextChild) {
                  onChange({
                    ...node,
                    children: node.children.filter((c) => c.id !== child.id),
                  })
                  return
                }
                onChange({
                  ...node,
                  children: node.children.map((c) =>
                    c.id === child.id ? nextChild : c,
                  ),
                })
              }}
            />
          ))
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            onChange({
              ...node,
              children: [...node.children, newFilterPredicateNode()],
            })
          }
          className={buttonClass(morphus, 'primary')}
        >
          Add condition
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...node,
              children: [...node.children, newFilterGroupNode('or', [])],
            })
          }
          className={buttonClass(morphus)}
        >
          Add group
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...node,
              children: [...node.children, newFilterNotNode()],
            })
          }
          className={buttonClass(morphus)}
        >
          Add NOT
        </button>
      </div>
    </div>
  )
}

export function ConfiguratorFilterBuilder({
  root,
  raceCategories,
  occCategories,
  bookCategories,
  morphus,
  onChange,
}: ConfiguratorFilterBuilderProps) {
  return (
    <ConfiguratorFilterNodeEditor
      node={root}
      raceCategories={raceCategories}
      occCategories={occCategories}
      bookCategories={bookCategories}
      morphus={morphus}
      depth={0}
      isRoot
      onChange={(next) => {
        if (!next || next.kind !== 'group') {
          onChange(null)
          return
        }
        onChange(next)
      }}
    />
  )
}
