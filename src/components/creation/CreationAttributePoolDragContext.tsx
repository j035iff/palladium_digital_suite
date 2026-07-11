import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type CreationAttributePoolDragContextValue = {
  draggingPoolIndex: number | null
  beginPoolDrag: (poolIndex: number) => void
  endPoolDrag: () => void
}

const CreationAttributePoolDragContext =
  createContext<CreationAttributePoolDragContextValue | null>(null)

export function CreationAttributePoolDragProvider({
  children,
}: {
  children: ReactNode
}) {
  const [draggingPoolIndex, setDraggingPoolIndex] = useState<number | null>(null)

  const beginPoolDrag = useCallback((poolIndex: number) => {
    setDraggingPoolIndex(poolIndex)
  }, [])

  const endPoolDrag = useCallback(() => {
    setDraggingPoolIndex(null)
  }, [])

  const value = useMemo(
    () => ({ draggingPoolIndex, beginPoolDrag, endPoolDrag }),
    [draggingPoolIndex, beginPoolDrag, endPoolDrag],
  )

  return (
    <CreationAttributePoolDragContext.Provider value={value}>
      {children}
    </CreationAttributePoolDragContext.Provider>
  )
}

export function useCreationAttributePoolDrag():
  | CreationAttributePoolDragContextValue
  | null {
  return useContext(CreationAttributePoolDragContext)
}
