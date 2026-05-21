import { useEffect, useState } from "react";
import { CheckCircle2, Terminal, TriangleAlert } from "lucide-react";
import { api } from "../api";
import { errorToMessage } from "../lib/errors";

type BinaryCheck = Record<string, { available: boolean; detail: string }>;

export default function SettingsPage() {
  const [binaries, setBinaries] = useState<BinaryCheck>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .binaries()
      .then(setBinaries)
      .catch((e) => setError(errorToMessage(e)));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-medium text-lime">Diagnostics</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Local readiness</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
          These checks explain whether the machine can source, process, overlay, and render videos.
          Project logs stay inside each project workspace.
        </p>
      </div>

      {error && <p className="rounded-xl border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-200">{error}</p>}

      <section className="grid gap-3 md:grid-cols-2">
        {Object.entries(binaries).map(([name, check]) => {
          const Icon = check.available ? CheckCircle2 : TriangleAlert;
          return (
            <article key={name} className="rounded-2xl border border-white/10 bg-panel/70 p-4">
              <div className="flex items-start gap-3">
                <Icon
                  size={20}
                  className={check.available ? "text-lime" : "text-amber-200"}
                  aria-hidden="true"
                />
                <div>
                  <h2 className="font-medium">{name}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted">{check.detail}</p>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-panel/70 p-5">
        <div className="flex items-center gap-2">
          <Terminal size={18} className="text-lime" aria-hidden="true" />
          <h2 className="font-medium">Install hints</h2>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          All four tools must be on the system PATH available to this app's backend process.
        </p>
        <div className="mt-4 space-y-3">
          {[
            { name: "yt-dlp", cmd: "pip install yt-dlp  # or: brew install yt-dlp" },
            { name: "ffmpeg + ffprobe", cmd: "brew install ffmpeg  # or: apt install ffmpeg" },
            { name: "fonts (for overlays)", cmd: "apt install fonts-liberation  # or: brew install --cask font-liberation" },
          ].map(({ name, cmd }) => (
            <div key={name}>
              <p className="text-xs font-medium text-soft">{name}</p>
              <pre className="mt-1 overflow-x-auto rounded-xl border border-white/10 bg-studio/60 px-3 py-2 text-xs leading-5 text-muted">{cmd}</pre>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
