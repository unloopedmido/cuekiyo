import { useEffect, useEffectEvent } from "react"

export function usePolling(
  callback: () => void,
  intervalMs: number,
  pollKey?: string
) {
  const onTick = useEffectEvent(callback)

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null

    const tick = () => {
      onTick()
    }

    const start = () => {
      if (intervalId !== null) return
      intervalId = setInterval(tick, intervalMs)
    }

    const stop = () => {
      if (intervalId !== null) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        stop()
      } else {
        start()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    if (document.visibilityState === "visible") {
      start()
    }

    return () => {
      stop()
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [intervalMs, pollKey])
}
