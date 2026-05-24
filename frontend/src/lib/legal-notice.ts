const STORAGE_KEY = "cuekiyo-legal-notice-accepted"

export function hasAcceptedLegalNotice(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

export function acceptLegalNotice(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1")
  } catch {
    // Storage may be unavailable in private browsing.
  }
}
