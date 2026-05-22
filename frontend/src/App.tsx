import { Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import Dashboard from "./pages/Dashboard";
import ProjectSetup from "./pages/ProjectSetup";
import ProjectPage from "./pages/ProjectPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="projects/new" element={<ProjectSetup />} />
        <Route path="projects/:id" element={<ProjectPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
