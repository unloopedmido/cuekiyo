import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<BrowserRouter>
			<ThemeProvider defaultTheme="dark" storageKey="mv-pipeline-theme">
				<TooltipProvider>
					<App />
					<Toaster richColors closeButton />
				</TooltipProvider>
			</ThemeProvider>
		</BrowserRouter>
	</StrictMode>,
);
