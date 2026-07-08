import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type CreationForgeLeftSlotContextValue = {
  registeredContent: ReactNode
  register: (content: ReactNode) => void
}

const CreationForgeLeftSlotContext =
  createContext<CreationForgeLeftSlotContextValue | null>(null)

export function CreationForgeLeftSlotProvider({ children }: { children: ReactNode }) {
  const [registeredContent, setRegisteredContent] = useState<ReactNode>(null)
  const register = useCallback((content: ReactNode) => {
    setRegisteredContent(content)
  }, [])

  const value = useMemo(
    () => ({ registeredContent, register }),
    [registeredContent, register],
  )

  return (
    <CreationForgeLeftSlotContext.Provider value={value}>
      {children}
    </CreationForgeLeftSlotContext.Provider>
  )
}

export function useCreationForgeLeftSlotRegistrar() {
  const ctx = useContext(CreationForgeLeftSlotContext)
  if (!ctx) {
    throw new Error(
      'useCreationForgeLeftSlotRegistrar must be used within CreationForgeLeftSlotProvider',
    )
  }
  return ctx.register
}

export function useCreationForgeLeftSlotRegisteredContent() {
  const ctx = useContext(CreationForgeLeftSlotContext)
  if (!ctx) {
    throw new Error(
      'useCreationForgeLeftSlotRegisteredContent must be used within CreationForgeLeftSlotProvider',
    )
  }
  return ctx.registeredContent
}
