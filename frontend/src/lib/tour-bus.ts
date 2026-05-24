let restartFn: (() => void) | null = null

export function setTourRestarter(fn: () => void) {
  restartFn = fn
}

export function restartTour() {
  restartFn?.()
}
