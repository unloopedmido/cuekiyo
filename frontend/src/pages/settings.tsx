import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import { errorToMessage } from "@/lib/errors";
import {
	DEFAULT_PROJECT_DEFAULTS,
	loadProjectDefaults,
	saveProjectDefaults,
	type ProjectDefaults,
} from "@/lib/projectDefaults";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { NAV } from "@/lib/nav";

export default function SettingsPage() {
	const [defaults, setDefaults] = useState<ProjectDefaults>(
		DEFAULT_PROJECT_DEFAULTS,
	);
	const [binaries, setBinaries] = useState<
		Record<string, { available: boolean; detail: string }>
	>({});
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setDefaults(loadProjectDefaults());
		api
			.binaries()
			.then(setBinaries)
			.catch((e) => setError(errorToMessage(e)));
	}, []);

	const saveDefaults = () => {
		if (defaults.songTypes.length === 0) {
			toast.error("Select at least one song type");
			return;
		}
		saveProjectDefaults(defaults);
		toast.success("Defaults saved");
	};

	const resetDefaults = () => {
		setDefaults(DEFAULT_PROJECT_DEFAULTS);
		saveProjectDefaults(DEFAULT_PROJECT_DEFAULTS);
		toast.info("Defaults reset");
	};

	return (
		<div className="flex flex-1 flex-col gap-8">
			<PageHeader
				title={NAV.settings}
				description="Defaults for new compilations and health of local media tools on this machine."
			/>

			<Tabs defaultValue="defaults" className="w-full">
				<TabsList>
					<TabsTrigger value="defaults">New compilation defaults</TabsTrigger>
					<TabsTrigger value="tools">Local tools</TabsTrigger>
				</TabsList>

				<TabsContent value="defaults" className="mt-6 max-w-xl">
					<FieldGroup className="gap-6">
						<div className="grid gap-4 sm:grid-cols-2">
							<Field>
								<FieldLabel htmlFor="default-songs">Songs</FieldLabel>
								<Input
									id="default-songs"
									type="number"
									min={1}
									max={50}
									value={defaults.songsCount}
									onChange={(e) =>
										setDefaults((c) => ({
											...c,
											songsCount: Number(e.target.value),
										}))
									}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="default-clip">Clip seconds</FieldLabel>
								<Input
									id="default-clip"
									type="number"
									min={3}
									value={defaults.clipTime}
									onChange={(e) =>
										setDefaults((c) => ({
											...c,
											clipTime: Number(e.target.value),
										}))
									}
								/>
							</Field>
						</div>
						<Field>
							<FieldLabel>Song types</FieldLabel>
							<ToggleGroup
								type="multiple"
								value={defaults.songTypes}
								onValueChange={(types) =>
									setDefaults((c) => ({ ...c, songTypes: types }))
								}
								variant="outline"
							>
								<ToggleGroupItem value="opening">Opening</ToggleGroupItem>
								<ToggleGroupItem value="ending">Ending</ToggleGroupItem>
							</ToggleGroup>
						</Field>
						<div className="grid gap-4 sm:grid-cols-2">
							<Field>
								<FieldLabel htmlFor="default-encoder">Encoder</FieldLabel>
								<Select
									value={defaults.encoder}
									onValueChange={(encoder) =>
										setDefaults((c) => ({ ...c, encoder }))
									}
								>
									<SelectTrigger id="default-encoder">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="auto">Auto</SelectItem>
										<SelectItem value="libx264">H.264</SelectItem>
										<SelectItem value="h264_nvenc">NVENC H.264</SelectItem>
										<SelectItem value="hevc_nvenc">NVENC HEVC</SelectItem>
									</SelectContent>
								</Select>
							</Field>
							<Field orientation="horizontal">
								<Switch
									id="default-audio"
									checked={defaults.audioNormalize}
									onCheckedChange={(audioNormalize) =>
										setDefaults((c) => ({ ...c, audioNormalize }))
									}
								/>
								<FieldLabel htmlFor="default-audio">Normalize audio</FieldLabel>
							</Field>
						</div>
						<div className="flex gap-2">
							<Button onClick={saveDefaults}>Save</Button>
							<Button variant="outline" onClick={resetDefaults}>
								Reset
							</Button>
						</div>
					</FieldGroup>
				</TabsContent>

				<TabsContent value="tools" className="mt-6 flex flex-col gap-6">
					{error && (
						<Alert variant="destructive">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}
					<div className="overflow-hidden rounded-xl border border-border/80">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Binary</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Notes</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{Object.entries(binaries).map(([name, check]) => (
									<TableRow key={name}>
										<TableCell className="font-medium">{name}</TableCell>
										<TableCell>
											<Badge variant={check.available ? "default" : "destructive"}>
												{check.available ? "OK" : "Missing"}
											</Badge>
										</TableCell>
										<TableCell className="text-muted-foreground">
											{check.detail}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
					<Separator />
					<div className="grid gap-4 md:grid-cols-3">
						{[
							{ name: "yt-dlp", cmd: "pip install yt-dlp" },
							{ name: "ffmpeg", cmd: "brew install ffmpeg" },
							{ name: "fonts", cmd: "apt install fonts-liberation" },
						].map(({ name, cmd }) => (
							<div key={name} className="flex flex-col gap-1">
								<span className="text-sm font-medium">{name}</span>
								<code className="rounded-md border bg-muted/30 px-2 py-1.5 text-xs">
									{cmd}
								</code>
							</div>
						))}
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
