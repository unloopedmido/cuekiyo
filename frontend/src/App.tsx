import { lazy, Suspense } from "react"
import { Route, Routes } from "react-router-dom"
import { AppLayout } from "@/components/layout/app-layout"
import { ErrorBoundary } from "@/components/error-boundary"
import { Skeleton } from "@/components/ui/skeleton"
import Dashboard from "@/pages/dashboard"
import ProjectPage from "@/pages/project"

const ProjectSetup = lazy(() => import("@/pages/project-setup"))
const SettingsPage = lazy(() => import("@/pages/settings"))

function PageSkeleton() {
  return (
    <div className="fcr-animate-up flex flex-1 flex-col gap-6">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          index
          element={
            <ErrorBoundary>
              <Dashboard />
            </ErrorBoundary>
          }
        />
        <Route
          path="projects/new"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageSkeleton />}>
                <ProjectSetup />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="projects/:id"
          element={
            <ErrorBoundary>
              <ProjectPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="settings"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageSkeleton />}>
                <SettingsPage />
              </Suspense>
            </ErrorBoundary>
          }
        />
      </Route>
    </Routes>
  )
}
