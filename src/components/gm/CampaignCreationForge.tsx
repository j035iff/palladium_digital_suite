import { useMemo, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { useGmSession } from '../../context/GmSessionContext'
import {
  CAMPAIGN_FORGE_GROUPS,
  campaignForgeConfirmLabel,
  campaignForgeIssues,
  campaignForgeReady,
  optionsForGroup,
} from '../../lib/gm/campaignForge'
import { CampaignForgeField } from './CampaignForgeField'

function CampaignCreateConfirmModal({
  open,
  title,
  onNotYet,
  onYes,
}: {
  open: boolean
  title: string
  onNotYet: () => void
  onYes: () => void
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 px-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="campaign-create-confirm-title"
    >
      <div className="max-w-md rounded-xl border-2 border-amber-500/80 bg-slate-950 p-6 text-center shadow-2xl">
        <h2
          id="campaign-create-confirm-title"
          className="text-lg font-black uppercase tracking-wide text-amber-200"
        >
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-200">
          Host genre and conversion rules cannot be changed after the campaign
          is created.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onNotYet}
            className="rounded-lg border-2 border-slate-500 px-4 py-2 text-sm font-bold uppercase text-slate-200 hover:border-slate-300"
          >
            Not yet
          </button>
          <button
            type="button"
            onClick={onYes}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-black uppercase text-slate-950 hover:bg-amber-400"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  )
}

export function CampaignCreationForge() {
  const { returnToLauncher, enterGmHub } = useCharacter()
  const {
    campaignForgeDraft,
    setCampaignForgeValue,
    sessionList,
    commitCampaignForge,
  } = useGmSession()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const takenNames = useMemo(
    () => sessionList.map((row) => row.name),
    [sessionList],
  )
  const ctx = useMemo(() => ({ takenNames }), [takenNames])
  const issues = campaignForgeIssues(campaignForgeDraft, ctx)
  const ready = campaignForgeReady(campaignForgeDraft, ctx)
  const issueById = new Map(issues.map((row) => [row.optionId, row.messages]))

  const onConfirmYes = () => {
    if (!commitCampaignForge()) return
    setConfirmOpen(false)
    enterGmHub()
  }

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden bg-[#0a0c12] text-slate-100">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/90 px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-500/90">
            Campaign Creation Forge
          </p>
          <h1 className="text-lg font-black tracking-wide text-white">
            New campaign
          </h1>
          <p className="text-[11px] text-slate-500">
            Identity and conversion rules are required now. More campaign
            options will appear here as we iterate — they stay on this same
            forge.
          </p>
        </div>
        <button
          type="button"
          onClick={returnToLauncher}
          className="rounded-lg border border-slate-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-300 hover:border-slate-400 hover:text-white"
        >
          Return to launcher
        </button>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col gap-6 overflow-y-auto p-6">
        {CAMPAIGN_FORGE_GROUPS.map((group) => (
          <section
            key={group.id}
            className="rounded-xl border border-slate-700 bg-slate-900/70 p-4"
          >
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-amber-200/90">
              {group.label}
            </h2>
            <p className="mt-1 text-xs text-slate-400">{group.description}</p>
            <div className="mt-4 space-y-4">
              {optionsForGroup(group.id).map((option) => (
                <CampaignForgeField
                  key={option.id}
                  option={option}
                  value={campaignForgeDraft.values[option.id] ?? ''}
                  messages={
                    (campaignForgeDraft.values[option.id] ?? '').trim()
                      ? (issueById.get(option.id) ?? [])
                      : []
                  }
                  onChange={(value) => setCampaignForgeValue(option.id, value)}
                />
              ))}
            </div>
          </section>
        ))}

        <button
          type="button"
          disabled={!ready}
          title={
            ready
              ? 'Review and create this campaign'
              : 'Name, host genre, and conversion rules are required'
          }
          onClick={() => setConfirmOpen(true)}
          className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
        >
          Create Campaign
        </button>
      </main>

      <CampaignCreateConfirmModal
        open={confirmOpen}
        title={campaignForgeConfirmLabel(campaignForgeDraft)}
        onNotYet={() => setConfirmOpen(false)}
        onYes={onConfirmYes}
      />
    </div>
  )
}
