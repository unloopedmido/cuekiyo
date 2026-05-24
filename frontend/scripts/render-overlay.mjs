#!/usr/bin/env node
/**
 * Render a cinematic lower-third overlay PNG for one song clip.
 *
 * Usage: node render-overlay.mjs <payload.json>
 *
 * renderMode:
 *   "strip" (default) — overlay bar only, for ffmpeg compositing
 *   "frame" — full video frame with bar at top/bottom, for setup preview
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CJK_FONT_DIR = path.join(
  SCRIPT_DIR,
  "..",
  "node_modules",
  "@fontsource",
  "noto-sans-jp",
  "files",
);

const DEFAULT_ACCENT = "#a3e635";

const CJK_LANGUAGE_CODES = new Set([
  "ja",
  "ja-JP",
  "zh-CN",
  "zh-TW",
  "zh-HK",
  "ko-KR",
]);

const FONT_SCALE_MULTIPLIER = {
  compact: 0.88,
  default: 1,
  large: 1.12,
};

function isCjkLanguageCode(code) {
  return (
    CJK_LANGUAGE_CODES.has(code) ||
    code.startsWith("ja") ||
    code.startsWith("zh") ||
    code.startsWith("ko")
  );
}

function loadBundledCjkFonts() {
  const boldPath = path.join(CJK_FONT_DIR, "noto-sans-jp-japanese-700-normal.woff");
  const regularPath = path.join(CJK_FONT_DIR, "noto-sans-jp-japanese-400-normal.woff");
  if (!fs.existsSync(boldPath) || !fs.existsSync(regularPath)) {
    throw new Error(
      "Missing @fontsource/noto-sans-jp. Run npm ci in frontend/ for Japanese overlay support.",
    );
  }
  return {
    bold: fs.readFileSync(boldPath),
    regular: fs.readFileSync(regularPath),
  };
}

function buildFontOptions(latinBold, latinRegular, cjkFonts) {
  return [
    {
      name: "OverlayBold",
      data: latinBold,
      weight: 700,
      style: "normal",
    },
    {
      name: "OverlayRegular",
      data: latinRegular,
      weight: 400,
      style: "normal",
    },
    {
      name: "OverlayBold",
      data: cjkFonts.bold,
      weight: 700,
      style: "normal",
      lang: "ja-JP",
    },
    {
      name: "OverlayRegular",
      data: cjkFonts.regular,
      weight: 400,
      style: "normal",
      lang: "ja-JP",
    },
  ];
}

function buildCjkFallbackFonts(cjkFonts) {
  return [
    {
      name: "OverlayBold",
      data: cjkFonts.bold,
      weight: 700,
      style: "normal",
      lang: "ja-JP",
    },
    {
      name: "OverlayRegular",
      data: cjkFonts.regular,
      weight: 400,
      style: "normal",
      lang: "ja-JP",
    },
  ];
}

function scale(px, factor) {
  return Math.max(Math.floor(px * factor), 1);
}

function accentGlowColor(accent) {
  if (accent.startsWith("#") && accent.length === 7) {
    const r = parseInt(accent.slice(1, 3), 16);
    const g = parseInt(accent.slice(3, 5), 16);
    const b = parseInt(accent.slice(5, 7), 16);
    return `rgba(${r},${g},${b},0.30)`;
  }
  return "rgba(163,230,53,0.30)";
}

function buildLayout(width, height, options = {}) {
  const {
    style = "default",
    position = "bottom",
    fontScale = "default",
  } = options;
  const typeScale = FONT_SCALE_MULTIPLIER[fontScale] ?? 1;
  const s = Math.max(height / 1080, 0.5) * typeScale;
  const minimal = style === "minimal";

  const barH = scale(minimal ? 96 : 148, s);
  const accentLineH = scale(minimal ? 2 : 3, s);
  const accentLineW = Math.max(
    Math.floor(width * (minimal ? 0.1 : 0.15)),
    scale(minimal ? 40 : 56, s),
  );
  const accentMarginLeft = scale(minimal ? 40 : 52, s);
  const accentMarginTop = scale(minimal ? 12 : 18, s);
  const gapAfterAccent = scale(minimal ? 10 : 14, s);
  const textPadLeft = scale(minimal ? 40 : 52, s);
  const textPadRight = scale(minimal ? 36 : 48, s);
  const animeFs = scale(minimal ? 26 : 30, s);
  const songFs = scale(minimal ? 18 : 20, s);
  const metaFs = scale(minimal ? 12 : 14, s);
  const textGap = scale(minimal ? 4 : 6, s);
  const shadowBlur = scale(minimal ? 6 : 10, s);
  const dotSize = scale(minimal ? 4 : 5, s);
  const dotGap = scale(minimal ? 6 : 8, s);
  const accentRadius = scale(1.5, s);

  const bgGradient =
    position === "top"
      ? minimal
        ? "linear-gradient(to bottom, rgba(10,10,15,0.72) 0%, rgba(10,10,15,0.48) 48%, rgba(10,10,15,0.12) 100%)"
        : "linear-gradient(to bottom, rgba(10,10,15,0.88) 0%, rgba(10,10,15,0.72) 32%, rgba(10,10,15,0.42) 64%, rgba(10,10,15,0.08) 100%)"
      : minimal
        ? "linear-gradient(to top, rgba(10,10,15,0.72) 0%, rgba(10,10,15,0.48) 48%, rgba(10,10,15,0.12) 100%)"
        : "linear-gradient(to top, rgba(10,10,15,0.88) 0%, rgba(10,10,15,0.72) 32%, rgba(10,10,15,0.42) 64%, rgba(10,10,15,0.08) 100%)";

  return {
    barH,
    accentLineH,
    accentLineW,
    accentMarginLeft,
    accentMarginTop,
    gapAfterAccent,
    textPadLeft,
    textPadRight,
    animeFs,
    songFs,
    metaFs,
    textGap,
    shadowBlur,
    dotSize,
    dotGap,
    accentRadius,
    canvasWidth: width,
    bgGradient,
    minimal,
    position,
  };
}

function overlayStripElement(payload, layout, visibility, colors) {
  const { animeName, songLine, metaLine } = payload;
  const { showAnimeName, showSongLine, showMetaLine } = visibility;
  const {
    barH,
    accentLineH,
    accentLineW,
    accentMarginLeft,
    accentMarginTop,
    gapAfterAccent,
    textPadLeft,
    textPadRight,
    animeFs,
    songFs,
    metaFs,
    textGap,
    shadowBlur,
    dotSize,
    dotGap,
    accentRadius,
    canvasWidth,
    bgGradient,
    minimal,
  } = layout;

  const { accent, accentGlow, title, subtitle, meta } = colors;

  const animeShadow = `0 1px 4px rgba(0,0,0,0.95), 0 0 ${shadowBlur}px rgba(0,0,0,0.6)`;
  const songShadow = `0 1px 3px rgba(0,0,0,0.90), 0 0 ${shadowBlur}px rgba(0,0,0,0.55)`;
  const metaShadow = `0 1px 2px rgba(0,0,0,0.85), 0 0 ${shadowBlur}px rgba(0,0,0,0.45)`;

  const textBlockTop = accentMarginTop + accentLineH + gapAfterAccent;

  const textChildren = [
    ...(showAnimeName && animeName
      ? [
          {
            type: "div",
            props: {
              style: {
                color: title,
                fontSize: animeFs,
                fontWeight: 700,
                fontFamily: "OverlayBold",
                textShadow: animeShadow,
                lineHeight: 1.15,
                letterSpacing: -0.02 * animeFs,
              },
              children: animeName,
            },
          },
        ]
      : []),
    ...(showSongLine && songLine
      ? [
          {
            type: "div",
            props: {
              style: {
                color: subtitle,
                fontSize: songFs,
                fontWeight: 400,
                fontFamily: "OverlayRegular",
                textShadow: songShadow,
                lineHeight: 1.2,
              },
              children: songLine,
            },
          },
        ]
      : []),
    ...(showMetaLine && metaLine
      ? [
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: dotGap,
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      width: dotSize,
                      height: dotSize,
                      backgroundColor: accent,
                      borderRadius: dotSize,
                      flexShrink: 0,
                    },
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      color: meta,
                      fontSize: metaFs,
                      fontWeight: 400,
                      fontFamily: "OverlayRegular",
                      textShadow: metaShadow,
                      lineHeight: 1.3,
                    },
                    children: metaLine,
                  },
                },
              ],
            },
          },
        ]
      : []),
  ];

  return {
    type: "div",
    props: {
      style: {
        width: canvasWidth,
        height: barH,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        position: "relative",
        backgroundImage: bgGradient,
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              left: accentMarginLeft,
              top: accentMarginTop,
              width: accentLineW,
              height: accentLineH,
              backgroundColor: accent,
              boxShadow: minimal ? "none" : `0 0 ${shadowBlur}px ${accentGlow}`,
              borderRadius: accentRadius,
            },
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              paddingTop: textBlockTop,
              paddingLeft: textPadLeft,
              paddingRight: textPadRight,
              gap: textGap,
            },
            children: textChildren,
          },
        },
      ],
    },
  };
}

function framePreviewElement(stripElement, width, height, position) {
  return {
    type: "div",
    props: {
      style: {
        width,
        height,
        display: "flex",
        flexDirection: "column",
        justifyContent: position === "top" ? "flex-start" : "flex-end",
        backgroundColor: "#0c0c12",
        backgroundImage:
          "radial-gradient(ellipse 90% 70% at 50% 42%, rgba(48,48,62,0.95) 0%, rgba(12,12,18,1) 72%)",
        position: "relative",
      },
      children: [stripElement],
    },
  };
}

async function main() {
  const payloadPath = process.argv[2];
  if (!payloadPath) {
    console.error("Usage: node render-overlay.mjs <payload.json>");
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
  for (const key of [
    "width",
    "height",
    "animeName",
    "songLine",
    "metaLine",
    "fontBold",
    "fontRegular",
    "output",
  ]) {
    if (payload[key] === undefined || payload[key] === null) {
      throw new Error(`Missing required field: ${key}`);
    }
  }

  const cjkFonts = loadBundledCjkFonts();
  const fonts = buildFontOptions(
    fs.readFileSync(payload.fontBold),
    fs.readFileSync(payload.fontRegular),
    cjkFonts,
  );

  const style = payload.style ?? "default";
  const position = payload.position ?? "bottom";
  const fontScale = payload.fontScale ?? "default";
  const renderMode = payload.renderMode ?? "strip";
  const showAnimeName = payload.showAnimeName ?? true;
  const showSongLine = payload.showSongLine ?? true;
  const showMetaLine = payload.showMetaLine ?? true;

  const accent = payload.accentColor ?? DEFAULT_ACCENT;
  const colors = {
    accent,
    accentGlow: accentGlowColor(accent),
    title: payload.titleColor ?? "#ffffff",
    subtitle: payload.subtitleColor ?? "rgba(255,255,255,0.88)",
    meta: payload.metaColor ?? "rgba(255,255,255,0.65)",
  };

  const layout = buildLayout(payload.width, payload.height, {
    style,
    position,
    fontScale,
  });
  const stripElement = overlayStripElement(
    payload,
    layout,
    { showAnimeName, showSongLine, showMetaLine },
    colors,
  );

  const element =
    renderMode === "frame"
      ? framePreviewElement(stripElement, payload.width, payload.height, position)
      : stripElement;

  const canvasWidth = renderMode === "frame" ? payload.width : layout.canvasWidth;
  const canvasHeight = renderMode === "frame" ? payload.height : layout.barH;

  const svg = await satori(element, {
    width: canvasWidth,
    height: canvasHeight,
    fonts,
    loadAdditionalAsset: async (code) => {
      if (code === "emoji") {
        return undefined;
      }
      if (isCjkLanguageCode(code)) {
        return buildCjkFallbackFonts(cjkFonts);
      }
      return undefined;
    },
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: canvasWidth },
  });
  const png = resvg.render().asPng();

  fs.mkdirSync(path.dirname(payload.output), { recursive: true });
  fs.writeFileSync(payload.output, png);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
