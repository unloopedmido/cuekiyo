import type { Candidate, Job, Project, Song, ThemeSong } from "./types";

const API = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${API}${path}`, {
		headers: { "Content-Type": "application/json", ...init?.headers },
		...init,
	});
	if (!res.ok) {
		const err = await res.text();
		throw new Error(err || res.statusText);
	}
	return res.json();
}

export const api = {
	listProjects: () => request<Project[]>("/projects"),
	createProject: (body: unknown) =>
		request<Project>("/projects", {
			method: "POST",
			body: JSON.stringify(body),
		}),
	getProject: (id: string) => request<Project>(`/projects/${id}`),
	deleteProject: (id: string) =>
		request<{ ok: boolean }>(`/projects/${id}`, { method: "DELETE" }),
	loadThemes: (id: string) =>
		request<{ jobId: string }>(`/projects/${id}/load-themes`, {
			method: "POST",
		}),
	listThemes: (id: string) => request<ThemeSong[]>(`/projects/${id}/themes`),
	selectSongs: (id: string, body: unknown) =>
		request<{ jobId: string }>(`/projects/${id}/songs/select`, {
			method: "POST",
			body: JSON.stringify(body),
		}),
	listSongs: (id: string) => request<Song[]>(`/projects/${id}/songs`),
	listCandidates: (projectId: string, songId: string) =>
		request<Candidate[]>(`/projects/${projectId}/songs/${songId}/candidates`),
	selectCandidate: (projectId: string, songId: string, candidateId: string) =>
		request<{ ok: boolean; jobId?: string }>(
			`/projects/${projectId}/songs/${songId}/candidates/select`,
			{ method: "POST", body: JSON.stringify({ candidate_id: candidateId }) },
		),
	confirmRenderOrder: (id: string) =>
		request<{ jobId: string }>(`/projects/${id}/render-order/confirm`, {
			method: "POST",
		}),
	updateRenderOrder: (id: string, songIds: string[]) =>
		request<{ ok: boolean }>(`/projects/${id}/render-order`, {
			method: "PUT",
			body: JSON.stringify({ song_ids: songIds }),
		}),
	retry: (id: string) =>
		request<{ jobId?: string }>(`/projects/${id}/retry`, { method: "POST" }),
	cancel: (id: string) =>
		request<{ ok: boolean }>(`/projects/${id}/cancel`, { method: "POST" }),
	listJobs: (id: string) => request<Job[]>(`/projects/${id}/jobs`),
	projectLogs: (id: string) =>
		request<
			{ id: string; message: string; level: string; created_at: string }[]
		>(`/projects/${id}/logs`),
	jobLogs: (jobId: string) =>
		request<
			{ id: string; message: string; level: string; created_at: string }[]
		>(`/jobs/${jobId}/logs`),
	searchAnime: (q: string) =>
		request<
			{
				mal_id: number;
				title: string;
				title_english?: string;
				image_url?: string;
				year?: number;
			}[]
		>(`/anime/search?q=${encodeURIComponent(q)}`),
	binaries: () =>
		request<Record<string, { available: boolean; detail: string }>>(
			"/system/binaries",
		),
	getOutput: (id: string) =>
		request<{
			output_path: string | null;
			output_filename: string | null;
			exists: boolean;
			status: string;
		}>(`/projects/${id}/output`),
	startStage: (id: string) =>
		request<{ jobId: string }>(`/projects/${id}/stage/start`, {
			method: "POST",
		}),
	openOutputFolder: (id: string) =>
		request<{ folder: string }>(`/projects/${id}/output/open-folder`, {
			method: "POST",
		}),
};

export function connectWebSocket(onEvent: (data: unknown) => void): WebSocket {
	const proto = location.protocol === "https:" ? "wss" : "ws";
	const ws = new WebSocket(`${proto}://${location.host}/api/ws`);
	ws.onmessage = (e) => {
		try {
			onEvent(JSON.parse(e.data));
		} catch {
			/* ignore */
		}
	};
	return ws;
}
