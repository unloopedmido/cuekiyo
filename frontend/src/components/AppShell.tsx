import { Clapperboard, FolderKanban, MonitorCog, Plus, Settings } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Projects", icon: FolderKanban, end: true },
  { to: "/projects/new", label: "New project", icon: Plus },
  { to: "/settings", label: "Diagnostics", icon: MonitorCog },
];

export default function AppShell() {
  return (
    <div className="min-h-screen bg-studio text-soft">
      <aside className="fixed inset-x-3 bottom-3 z-30 rounded-2xl border border-white/10 bg-panel/90 p-2 shadow-studio backdrop-blur-xl md:inset-y-4 md:left-4 md:right-auto md:w-64 md:p-4">
        <div className="mb-5 hidden items-center gap-3 md:flex">
          <span className="grid size-10 place-items-center rounded-xl bg-lime text-studio">
            <Clapperboard size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold">Anime MV</p>
            <p className="text-xs text-muted">Local cut room</p>
          </div>
        </div>
        <nav className="grid grid-cols-3 gap-1 md:grid-cols-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              aria-label={label}
              className={({ isActive }) =>
                [
                  "flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm transition md:justify-start",
                  isActive
                    ? "bg-lime/[0.12] font-medium text-lime"
                    : "text-muted hover:bg-white/[0.06] hover:text-soft",
                ].join(" ")
              }
            >
              <Icon size={17} aria-hidden="true" />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden pt-6 text-xs text-muted md:block">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2">
            <Settings size={14} aria-hidden="true" />
            Defaults stay local
          </div>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 md:pl-80 md:pr-8 md:pt-8">
        <Outlet />
      </main>
    </div>
  );
}
