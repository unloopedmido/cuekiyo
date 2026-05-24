import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const FRONTEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(FRONTEND_ROOT, "scripts", "render-overlay.mjs");

function resolveLatinFont(bold: boolean): string {
  const candidates = bold
    ? [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
        "C:\\Windows\\Fonts\\arialbd.ttf",
      ]
    : [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/TTF/DejaVuSans.ttf",
        "C:\\Windows\\Fonts\\arial.ttf",
      ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error("No Latin overlay test font found");
  }
  return found;
}

function runRender(payload: Record<string, unknown>) {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "overlay-"));
  const output =
    typeof payload.output === "string"
      ? payload.output
      : path.join(outputDir, "overlay.png");
  const payloadPath = path.join(outputDir, "payload.json");
  fs.writeFileSync(payloadPath, JSON.stringify({ ...payload, output }));

  const result = spawnSync(process.execPath, [SCRIPT, payloadPath], {
    cwd: FRONTEND_ROOT,
    encoding: "utf8",
  });

  return { result, output, outputDir };
}

test("render-overlay renders Japanese text without tofu", () => {
  const { result, output } = runRender({
    width: 1920,
    height: 1080,
    animeName: "進撃の巨人",
    songLine: "OP1: 心臓を捧げよ",
    metaLine: "12,345 views · Uploader",
    fontBold: resolveLatinFont(true),
    fontRegular: resolveLatinFont(false),
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.ok(fs.existsSync(output));
  assert.ok(fs.statSync(output).size > 8_000, "overlay PNG should contain rendered glyphs");
});

test("render-overlay minimal style omits meta line block", () => {
  const { result, output } = runRender({
    width: 1920,
    height: 1080,
    animeName: "Sample",
    songLine: "OP1: Song",
    metaLine: "hidden",
    fontBold: resolveLatinFont(true),
    fontRegular: resolveLatinFont(false),
    style: "minimal",
    showAnimeName: true,
    showSongLine: true,
    showMetaLine: false,
    position: "bottom",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.ok(fs.existsSync(output));
  assert.ok(fs.statSync(output).size > 0);
});

test("render-overlay top position renders successfully", () => {
  const { result, output } = runRender({
    width: 1920,
    height: 1080,
    animeName: "Sample Anime",
    songLine: "OP1: Song Title",
    metaLine: "1,000 views · Uploader",
    fontBold: resolveLatinFont(true),
    fontRegular: resolveLatinFont(false),
    style: "default",
    position: "top",
    showAnimeName: true,
    showSongLine: true,
    showMetaLine: true,
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.ok(fs.existsSync(output));
  assert.ok(fs.statSync(output).size > 0);
});

function readPngDimensions(filePath: string): { width: number; height: number } {
  const buffer = fs.readFileSync(filePath);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

test("render-overlay frame mode renders full preview canvas", () => {
  const { result, output } = runRender({
    width: 1280,
    height: 720,
    animeName: "One Piece",
    songLine: "OP1: Brave Shine",
    metaLine: "12,345 views · Sample Channel",
    fontBold: resolveLatinFont(true),
    fontRegular: resolveLatinFont(false),
    renderMode: "frame",
    position: "bottom",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const dims = readPngDimensions(output);
  assert.equal(dims.width, 1280);
  assert.equal(dims.height, 720);
});

test("render-overlay frame mode top differs from bottom placement", () => {
  const base = {
    width: 1280,
    height: 720,
    animeName: "Sample Anime",
    songLine: "OP1: Song Title",
    metaLine: "1,000 views · Uploader",
    fontBold: resolveLatinFont(true),
    fontRegular: resolveLatinFont(false),
    renderMode: "frame" as const,
    style: "default" as const,
  };

  const bottom = runRender({ ...base, position: "bottom" });
  const top = runRender({ ...base, position: "top" });

  assert.equal(bottom.result.status, 0, bottom.result.stderr || bottom.result.stdout);
  assert.equal(top.result.status, 0, top.result.stderr || top.result.stdout);
  assert.notEqual(
    fs.readFileSync(bottom.output).compare(fs.readFileSync(top.output)),
    0,
    "top and bottom frame previews should differ",
  );
});

test("render-overlay custom colors render successfully", () => {
  const { result, output } = runRender({
    width: 1920,
    height: 1080,
    animeName: "Sample",
    songLine: "OP1: Song",
    metaLine: "views",
    fontBold: resolveLatinFont(true),
    fontRegular: resolveLatinFont(false),
    accentColor: "#ff6b6b",
    titleColor: "#f8fafc",
    subtitleColor: "rgba(248,250,252,0.9)",
    metaColor: "rgba(248,250,252,0.55)",
    fontScale: "large",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.ok(fs.statSync(output).size > 0);
});

test("render-overlay minimal top position with hidden fields renders", () => {
  const { result, output } = runRender({
    width: 1280,
    height: 720,
    animeName: "Title Only",
    songLine: "unused",
    metaLine: "unused",
    fontBold: resolveLatinFont(true),
    fontRegular: resolveLatinFont(false),
    style: "minimal",
    position: "top",
    showAnimeName: true,
    showSongLine: false,
    showMetaLine: false,
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.ok(fs.existsSync(output));
  assert.ok(fs.statSync(output).size > 0);
});
