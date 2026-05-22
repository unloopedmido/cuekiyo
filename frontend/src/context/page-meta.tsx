import { createContext, useEffect, use, useState, type ReactNode } from "react"

type PageMeta = {
  breadcrumb?: string
  documentTitle?: string
}

type PageMetaContextValue = {
  meta: PageMeta
  setMeta: (meta: PageMeta) => void
}

const PageMetaContext = createContext<PageMetaContextValue | null>(null)

function metaEquals(a: PageMeta, b: PageMeta): boolean {
  return a.breadcrumb === b.breadcrumb && a.documentTitle === b.documentTitle
}

export function PageMetaProvider({ children }: { children: ReactNode }) {
  const [meta, setMetaState] = useState<PageMeta>({})
  const setMeta = (next: PageMeta) => {
    setMetaState((prev) => (metaEquals(prev, next) ? prev : next))
  }
  return <PageMetaContext value={{ meta, setMeta }}>{children}</PageMetaContext>
}

export function usePageMetaContext() {
  const ctx = use(PageMetaContext)
  if (!ctx) {
    throw new Error("usePageMetaContext must be used within PageMetaProvider")
  }
  return ctx
}

/** Set breadcrumb and document title for the current page. Clears on unmount. */
export function usePageMeta(label: string | undefined) {
  const { setMeta } = usePageMetaContext()
  useEffect(() => {
    if (!label) return
    setMeta({ breadcrumb: label, documentTitle: label })
    return () => setMeta({})
  }, [label, setMeta])
}
