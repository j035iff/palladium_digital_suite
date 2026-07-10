import { useEffect, useState } from 'react'

/** Subscribe to a CSS media query. SSR-safe (starts false until mount). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(query)
    const apply = () => setMatches(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [query])

  return matches
}

/** Short laptop / landscape phone — forge chrome should stay compact. */
export const FORGE_SHORT_VIEWPORT_QUERY = '(max-height: 820px)'
