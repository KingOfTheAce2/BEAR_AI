import { useEffect, RefObject } from 'react'

/**
 * Hook for detecting clicks outside of specified elements
 * Based on jan-dev patterns for modal and dropdown management
 */
export function useClickOutside<T extends HTMLElement>(
  handler: () => void,
  ref: RefObject<T> | null,
  additionalRefs: (RefObject<HTMLElement> | HTMLElement | null)[] = [],
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return

    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      
      if (!target || !ref?.current) return

      // Check main ref
      if (ref.current.contains(target)) return

      // Check additional refs
      for (const additionalRef of additionalRefs) {
        if (!additionalRef) continue
        
        const element = 'current' in additionalRef ? additionalRef.current : additionalRef
        if (element?.contains(target)) return
      }

      // Check for elements that should be ignored
      const closestIgnored = (target as Element).closest('[data-ignore-outside-clicks]')
      if (closestIgnored) return

      handler()
    }

    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)

    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [handler, ref, additionalRefs, enabled])
}