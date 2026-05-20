#!/usr/bin/env node
/**
 * Cross-platform setup helper (Node 20+).
 * Prefer scripts/setup.sh or scripts/setup.ps1 for full checks.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";
const py = isWin ? "python" : "python3";
const venvPython = isWin
  ? join(root, "backend", ".venv", "Scripts", "python.exe")
  : join(root, "backend", ".venv", "bin", "python");

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: isWin });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("==> Backend");
if (!existsSync(join(root, "backend", ".venv"))) {
  run(py, ["-m", "venv", ".venv"], join(root, "backend"));
}
run(venvPython, ["-m", "pip", "install", "--upgrade", "pip"], join(root, "backend"));
run(venvPython, ["-m", "pip", "install", "-r", "requirements-dev.txt"], join(root, "backend"));

console.log("==> Frontend");
run(isWin ? "npm.cmd" : "npm", ["ci"], join(root, "frontend"));

console.log("==> Done");
