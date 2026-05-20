import { Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import ProjectPage from "./pages/ProjectPage";

export default function App() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Anime MV Pipeline</h1>
        <a href="/" className="text-sm text-zinc-400 hover:text-white">
          Dashboard
        </a>
      </header>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects/:id" element={<ProjectPage />} />
      </Routes>
    </div>
  );
}
