import { useEffect, useState } from "react";
import { CheckCircle2, Terminal, TriangleAlert } from "lucide-react";
import { api } from "../api";
import { errorToMessage } from "../lib/errors";
import {
	DEFAULT_PROJECT_DEFAULTS,
	loadProjectDefaults,
	saveProjectDefaults,
	type ProjectDefaults,
} from "../lib/projectDefaults";
import { useToast } from "../hooks/useToast";

type BinaryCheck = Record<string, { available: boolean; detail: string }>;

export default function SettingsPage() {
	const { addToast } = useToast();
	const [defaults, setDefaults] = useState<ProjectDefaults>(
		DEFAULT_PROJECT_DEFAULTS,
	);
	const [binaries, setBinaries] = useState<BinaryCheck>({});
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setDefaults(loadProjectDefaults());
		api
			.binaries()
			.then(setBinaries)
			.catch((e) => setError(errorToMessage(e)));
	}, []);

	const toggleSongType = (type: string, checked: boolean) => {
		setDefaults((current) => ({
			...current,
			songTypes: checked
				? Array.from(new Set([...current.songTypes, type]))
				: current.songTypes.filter((item) => item !== type),
		}));
	};

	const saveDefaults = () => {
		if (defaults.songTypes.length === 0) {
			addToast("Select at least one song type", "error");
			return;
		}
		saveProjectDefaults(defaults);
		addToast("Defaults saved", "success");
	};

	const resetDefaults = () => {
		setDefaults(DEFAULT_PROJECT_DEFAULTS);
		saveProjectDefaults(DEFAULT_PROJECT_DEFAULTS);
		addToast("Defaults reset", "info");
	};

	return (
		<div className="max-w-3xl space-y-10">
			<header>
				<h1 className="type-headline">Settings</h1>
			</header>

			<section>
				<h2 className="type-title">Project defaults</h2>
				<p className="type-label mt-1 text-muted">
					Pre-filled when creating a new project.
				</p>

				<div className="mt-5 space-y-5">
					<div className="grid gap-4 md:grid-cols-2">
						<label className="block text-sm">
							Songs
							<input
								type="number"
								min={1}
								max={50}
								value={defaults.songsCount}
								onChange={(event) =>
									setDefaults((current) => ({
										...current,
										songsCount: Number(event.target.value),
									}))
								}
								className="mt-2 w-full rounded-xl border border-white/10 bg-panel px-3 py-2 text-sm"
							/>
						</label>
						<label className="block text-sm">
							Clip length (seconds)
							<input
								type="number"
								min={3}
								value={defaults.clipTime}
								onChange={(event) =>
									setDefaults((current) => ({
										...current,
										clipTime: Number(event.target.value),
									}))
								}
								className="mt-2 w-full rounded-xl border border-white/10 bg-panel px-3 py-2 text-sm"
							/>
						</label>
					</div>

					<div>
						<span className="text-sm font-medium">Song types</span>
						<div className="mt-3 flex gap-4 text-sm text-muted">
							<label className="flex items-center gap-2">
								<input
									type="checkbox"
									checked={defaults.songTypes.includes("opening")}
									onChange={(event) =>
										toggleSongType("opening", event.target.checked)
									}
								/>
								Openings
							</label>
							<label className="flex items-center gap-2">
								<input
									type="checkbox"
									checked={defaults.songTypes.includes("ending")}
									onChange={(event) =>
										toggleSongType("ending", event.target.checked)
									}
								/>
								Endings
							</label>
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<label className="block text-sm">
							Encoder
							<select
								value={defaults.encoder}
								onChange={(event) =>
									setDefaults((current) => ({
										...current,
										encoder: event.target.value,
									}))
								}
								className="mt-2 w-full rounded-xl border border-white/10 bg-panel px-3 py-2 text-sm"
							>
								<option value="auto">Auto-detect</option>
								<option value="libx264">Software H.264</option>
								<option value="h264_nvenc">NVIDIA H.264</option>
								<option value="hevc_nvenc">NVIDIA HEVC</option>
							</select>
						</label>
						<label className="flex items-end gap-2 pb-2 text-sm">
							<input
								type="checkbox"
								checked={defaults.audioNormalize}
								onChange={(event) =>
									setDefaults((current) => ({
										...current,
										audioNormalize: event.target.checked,
									}))
								}
							/>
							Normalize audio
						</label>
					</div>

					<div className="flex flex-wrap gap-3">
						<button
							type="button"
							onClick={saveDefaults}
							className="rounded-xl bg-lime px-4 py-2.5 text-sm font-medium text-studio hover:opacity-90"
						>
							Save defaults
						</button>
						<button
							type="button"
							onClick={resetDefaults}
							className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-muted hover:bg-white/[0.06] hover:text-soft"
						>
							Reset
						</button>
					</div>
				</div>
			</section>

			<section className="border-t border-white/10 pt-8">
				<h2 className="type-title">Diagnostics</h2>
				<p className="type-label mt-1 text-muted">
					Local tools required for sourcing and rendering.
				</p>

				{error && (
					<p
						className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
						aria-live="polite"
					>
						{error}
					</p>
				)}

				<div className="mt-5 grid gap-3 md:grid-cols-2">
					{Object.entries(binaries).map(([name, check]) => {
						const Icon = check.available ? CheckCircle2 : TriangleAlert;
						return (
							<div
								key={name}
								className="flex items-start gap-3 rounded-xl bg-white/[0.03] p-4"
							>
								<Icon
									size={20}
									className={
										check.available
											? "shrink-0 text-lime"
											: "shrink-0 text-warning"
									}
									aria-hidden="true"
								/>
								<div>
									<h3 className="text-sm font-medium">{name}</h3>
									<p className="type-label mt-1 text-muted">{check.detail}</p>
								</div>
							</div>
						);
					})}
				</div>

				<div className="mt-6">
					<div className="flex items-center gap-2">
						<Terminal size={16} className="text-lime" aria-hidden="true" />
						<h3 className="text-sm font-medium">Install hints</h3>
					</div>
					<div className="mt-3 space-y-3">
						{[
							{
								name: "yt-dlp",
								cmd: "pip install yt-dlp  # or: brew install yt-dlp",
							},
							{
								name: "ffmpeg + ffprobe",
								cmd: "brew install ffmpeg  # or: apt install ffmpeg",
							},
							{
								name: "fonts (for overlays)",
								cmd: "apt install fonts-liberation  # or: brew install --cask font-liberation",
							},
						].map(({ name, cmd }) => (
							<div key={name}>
								<p className="type-label text-soft">{name}</p>
								<pre className="mt-1 overflow-x-auto rounded-xl border border-white/[0.06] bg-studio/60 px-3 py-2 text-xs leading-5 text-muted">
									{cmd}
								</pre>
							</div>
						))}
					</div>
				</div>
			</section>
		</div>
	);
}
