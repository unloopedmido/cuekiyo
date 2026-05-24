import { useState, type ReactNode } from "react"
import { LegalNoticeDialog } from "@/components/legal-notice-dialog"
import {
  acceptLegalNotice,
  hasAcceptedLegalNotice,
} from "@/lib/legal-notice"

export function LegalNoticeGate({ children }: { children: ReactNode }) {
  const [accepted, setAccepted] = useState(hasAcceptedLegalNotice)

  if (!accepted) {
    return (
      <div className="min-h-svh bg-background">
        <LegalNoticeDialog
          open
          onAccept={() => {
            acceptLegalNotice()
            setAccepted(true)
          }}
        />
      </div>
    )
  }

  return children
}
