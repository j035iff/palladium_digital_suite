import { useMemo } from 'react'
import { useGmSession } from '../../context/GmSessionContext'
import {
  resolveContentLinkTarget,
  wikiBagFromSession,
  type GmPlaceholderEntity,
} from '../../lib/gm/narrativePlaceholders'
import type { GmContentLinkKind } from '../../lib/gm/contentLinks'
import {
  ContentLinkedNotesField,
  type ContentLinkedNotesFieldProps,
} from './ContentLinkedNotesField'

export type GmContentLinkedNotesFieldProps = Omit<
  ContentLinkedNotesFieldProps,
  'wiki'
>

/**
 * GM Hub host for the shared content-linked notes editor.
 * Builds a wiki adapter from `useGmSession` — sheet Campaigns pass their own
 * adapter into {@link ContentLinkedNotesField} directly (Pillar 9).
 */
export function GmContentLinkedNotesField(props: GmContentLinkedNotesFieldProps) {
  const {
    session,
    partySlices,
    createContentStub,
    navigateContentLink,
  } = useGmSession()

  const partyNamesById = useMemo(() => {
    const map = new Map<string, string>()
    for (const slice of partySlices) {
      map.set(slice.characterId, slice.name)
    }
    return map
  }, [partySlices])

  const wiki = useMemo(() => {
    if (!session) return null
    return {
      bag: wikiBagFromSession(session),
      partyNamesById,
      createContentStub: (input: {
        kind: GmContentLinkKind
        name: string
      }): GmPlaceholderEntity | null => createContentStub(input),
      navigateContentLink,
      resolveTarget: (kind: GmContentLinkKind, id: string, label: string) =>
        resolveContentLinkTarget(session, kind, id, label, {
          partyNamesById,
        }),
    }
  }, [session, partyNamesById, createContentStub, navigateContentLink])

  if (!wiki) return null

  return <ContentLinkedNotesField {...props} wiki={wiki} />
}
