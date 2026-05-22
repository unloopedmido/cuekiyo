import { Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import Dashboard from "@/pages/dashboard";
import ProjectSetup from "@/pages/project-setup";
import ProjectPage from "@/pages/project";
import SettingsPage from "@/pages/settings";

export default function App() {
	return (
		<Routes>
			<Route element={<AppLayout />}>
				<Route index element={<Dashboard />} />
				<Route path="projects/new" element={<ProjectSetup />} />
				<Route path="projects/:id" element={<ProjectPage />} />
				<Route path="settings" element={<SettingsPage />} />
			</Route>
		</Routes>
	);
}
