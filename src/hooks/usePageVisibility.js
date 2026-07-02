import { useEffect, useRef } from 'react'

/**
 * usePageVisibility
 * Detects when the user returns to the tab/app after being away.
 * On return:
 *  1. Checks if a new Service Worker version is waiting — if so, activates it and reloads.
 *  2. Calls optional onVisible() callback so pages can refetch their data.
 *
 * @param {Function} onVisible - Optional callback to run when page becomes visible
 * @param {number} staleThreshold - ms away before we consider data stale (default 5 min)
 */
export function usePageVisibility(onVisible, staleThreshold = 5 * 60 * 1000) {
  const hiddenAt = useRef(null)

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = Date.now()
        return
      }

      // Page is now visible again
      if (document.visibilityState === 'visible') {
        const away = hiddenAt.current ? Date.now() - hiddenAt.current : 0

        // 1. Check if a new SW is waiting to take over
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.getRegistration()
            if (registration?.waiting) {
              // New version available — tell it to activate, then reload
              registration.waiting.postMessage({ type: 'SKIP_WAITING' })
              navigator.serviceWorker.addEventListener('controllerchange', () => {
                window.location.reload()
              }, { once: true })
              return
            }

            // Also trigger an update check in case there's a new deploy
            registration?.update?.()
          } catch (e) {
            // ignore SW errors silently
          }
        }

        // 2. If user was away longer than threshold, refresh data
        if (away >= staleThreshold && typeof onVisible === 'function') {
          onVisible()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [onVisible, staleThreshold])
}
