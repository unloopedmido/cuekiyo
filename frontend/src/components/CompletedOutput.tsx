import { useEffect, useState } from "react";
import { api } from "../api";
import type { Project } from "../types";
import { Film, CheckCircle2, FolderOpen, Download, AlertTriangle } from "lucide-react";

export default function CompletedOutput({
  projectId,
  project,
}: {
  projectId: string;
  project: Project;
}) {
  const [out, setOut] = useState<{
    output_path: string | null;
    output_filename: string | null;
    exists: boolean;
  } | null>(null);

  useEffect(() => {
    api.getOutput(projectId).then(setOut);
  }, [projectId]);

  const filename =
    out?.output_filename ??
    (out?.output_path ? out.output_path.split("/").pop() : null) ??
    (project.output_path ? project.output_path.split("/").pop() : null);

  const approxDuration = project.songs_count * project.clip_time;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-brand-border pb-4">
        <div>
          <h3 className="text-sm font-semibold tracking-wider font-mono text-zinc-300">COMPILATION RENDER COMPLETE</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            The final video compilation has been encoded and assembled successfully.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-success/30 bg-brand-success/10 px-3 py-1 font-mono text-xs font-bold text-brand-success">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>RENDER COMPLETED</span>
        </div>
      </div>

      {out?.exists ? (
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Metadata Specs & Actions - Left Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* File Info Card */}
            <div className="border border-brand-border bg-brand-raised/20 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2.5 text-zinc-300">
                <Film className="h-4 w-4 text-brand-amber" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider">File Metadata Specs</span>
              </div>

              {/* Grid of specs */}
              <div className="grid grid-cols-2 gap-3.5 border-t border-brand-border/40 pt-4 font-mono text-[11px]">
                <div>
                  <span className="block text-zinc-500 text-[9px] uppercase tracking-wider">File Name</span>
                  <span className="text-zinc-200 truncate block mt-0.5 max-w-[150px]" title={filename ?? ""}>
                    {filename ?? "unknown.mp4"}
                  </span>
                </div>
                <div>
                  <span className="block text-zinc-500 text-[9px] uppercase tracking-wider">Resolution</span>
                  <span className="text-zinc-200 block mt-0.5">
                    {project.target_width} × {project.target_height}
                  </span>
                </div>
                <div>
                  <span className="block text-zinc-500 text-[9px] uppercase tracking-wider">Frame Rate</span>
                  <span className="text-zinc-200 block mt-0.5">{project.target_fps} FPS</span>
                </div>
                <div>
                  <span className="block text-zinc-500 text-[9px] uppercase tracking-wider">Aspect Ratio</span>
                  <span className="text-zinc-200 block mt-0.5">{project.target_aspect_ratio}</span>
                </div>
                <div>
                  <span className="block text-zinc-500 text-[9px] uppercase tracking-wider">Estimated length</span>
                  <span className="text-zinc-200 block mt-0.5">{approxDuration}s</span>
                </div>
                <div>
                  <span className="block text-zinc-500 text-[9px] uppercase tracking-wider">Encoder codec</span>
                  <span className="text-zinc-200 block mt-0.5 uppercase">{project.encoder}</span>
                </div>
              </div>

              {/* Absolute Path display */}
              <div className="bg-brand-base p-2.5 rounded border border-brand-border font-mono text-[9px] text-zinc-500 break-all select-all">
                <span className="text-brand-amber font-bold mr-1 block uppercase tracking-wider mb-0.5">Local Output Path:</span>
                {out.output_path || "—"}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <a
                href={`/api/projects/${projectId}/output/download`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-amber hover:bg-brand-amber-hover text-brand-base px-5 py-3 text-xs font-bold transition-all cursor-pointer shadow-md shadow-brand-amber/5 uppercase tracking-wider"
                download
              >
                <Download className="h-4 w-4" />
                <span>Download Video File</span>
              </a>

              <button
                onClick={() => api.openOutputFolder(projectId)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-raised hover:bg-brand-raised/80 border border-brand-border text-zinc-300 hover:text-zinc-100 px-5 py-3 text-xs font-semibold transition-all cursor-pointer uppercase tracking-wider"
              >
                <FolderOpen className="h-4 w-4 text-brand-amber" />
                <span>Open Output Folder</span>
              </button>
            </div>
          </div>

          {/* Video Player - Right Column */}
          <div className="lg:col-span-3">
            <div className="relative border border-brand-border bg-black rounded-xl overflow-hidden shadow-2xl aspect-video flex items-center justify-center">
              <video
                className="w-full h-full object-contain"
                controls
                src={`/api/projects/${projectId}/output/download`}
                poster={project.animes[0] ? `https://cdn.myanimelist.net/images/anime/${project.animes[0].anime_mal_id}.jpg` : undefined}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-brand-error/30 bg-brand-error/5 rounded-xl p-6 text-center space-y-4">
          <div className="inline-flex rounded-full bg-brand-error/5 border border-brand-error/20 p-3.5 text-brand-error">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div>
            <h4 className="text-sm font-semibold tracking-wider font-mono text-brand-error uppercase">OUTPUT ASSET NOT DETECTED</h4>
            <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
              The database marks compilation as completed, but the local output video file could not be verified on disk.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => api.getOutput(projectId).then(setOut)}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase text-zinc-400 bg-brand-raised hover:bg-brand-raised/85 border border-brand-border px-3.5 py-2 rounded transition-all cursor-pointer"
            >
              <span>Verify file again</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

