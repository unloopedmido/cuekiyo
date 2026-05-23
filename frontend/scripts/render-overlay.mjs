#!/usr/bin/env node
/**
 * Render a cinematic lower-third overlay PNG for one song clip.
 *
 * Design: horizontal lime accent line, sophisticated gradient,
 * dramatic type hierarchy, generous spacing, dual-layer text shadows.
 *
 * Usage: node render-overlay.mjs <payload.json>
 *
 * Payload fields:
 *   width, height — target video dimensions (used for proportional scaling)
 *   animeName, songLine, metaLine — text lines
 *   fontBold, fontRegular — absolute paths to TTF files
 *   output — absolute path for PNG output
 */
import fs from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

// Brand accent — lime from Floating Cut Room design system
const LIME = "#a3e635";
const LIME_GLOW = "rgba(163,230,53,0.30)";

function scale(px, factor) {
  return Math.max(Math.floor(px * factor), 1);
}

function buildLayout(width, height) {
  const s = Math.max(height / 1080, 0.5);

  const barH = scale(148, s);
  const accentLineH = scale(3, s);
  const accentLineW = Math.max(Math.floor(width * 0.15), scale(56, s));
  const accentMarginLeft = scale(52, s);
  const accentMarginTop = scale(18, s);
  const gapAfterAccent = scale(14, s);
  const textPadLeft = scale(52, s);
  const textPadRight = scale(48, s);
  const animeFs = scale(30, s);
  const songFs = scale(20, s);
  const metaFs = scale(14, s);
  const textGap = scale(6, s);
  const shadowBlur = scale(10, s);
  const dotSize = scale(5, s);
  const dotGap = scale(8, s);
  const accentRadius = scale(1.5, s);

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
  };
}

function overlayElement(payload, layout) {
  const { animeName, songLine, metaLine } = payload;
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
  } = layout;

  // Sophisticated gradient: strong contrast where text sits, fading above
  const bgGradient =
    "linear-gradient(to top, rgba(10,10,15,0.88) 0%, rgba(10,10,15,0.72) 32%, rgba(10,10,15,0.42) 64%, rgba(10,10,15,0.08) 100%)";

  // Dual-layer text shadows: tight shadow for definition, wider shadow for contrast halo
  const animeShadow = `0 1px 4px rgba(0,0,0,0.95), 0 0 ${shadowBlur}px rgba(0,0,0,0.6)`;
  const songShadow = `0 1px 3px rgba(0,0,0,0.90), 0 0 ${shadowBlur}px rgba(0,0,0,0.55)`;
  const metaShadow = `0 1px 2px rgba(0,0,0,0.85), 0 0 ${shadowBlur}px rgba(0,0,0,0.45)`;

  const textBlockTop = accentMarginTop + accentLineH + gapAfterAccent;

  return {
    type: "div",
    props: {
      style: {
        width: canvasWidth,
        height: barH,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        backgroundImage: bgGradient,
      },
      children: [
        // Horizontal lime accent line with glow
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              left: accentMarginLeft,
              top: accentMarginTop,
              width: accentLineW,
              height: accentLineH,
              backgroundColor: LIME,
              boxShadow: `0 0 ${shadowBlur}px ${LIME_GLOW}`,
              borderRadius: accentRadius,
            },
          },
        },
        // Text block below accent line
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
            children: [
              // Anime name
              {
                type: "div",
                props: {
                  style: {
                    color: "#ffffff",
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
              // Song line
              {
                type: "div",
                props: {
                  style: {
                    color: "rgba(255,255,255,0.88)",
                    fontSize: songFs,
                    fontWeight: 400,
                    fontFamily: "OverlayRegular",
                    textShadow: songShadow,
                    lineHeight: 1.2,
                  },
                  children: songLine,
                },
              },
              // Meta line with lime detail dot
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
                          backgroundColor: LIME,
                          borderRadius: dotSize,
                          flexShrink: 0,
                        },
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          color: "rgba(255,255,255,0.65)",
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
            ],
          },
        },
      ],
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
    if (payload[key] === undefined || payload[key] === null || payload[key] === "") {
      throw new Error(`Missing required field: ${key}`);
    }
  }

  const fonts = [
    {
      name: "OverlayBold",
      data: fs.readFileSync(payload.fontBold),
      weight: 700,
      style: "normal",
    },
    {
      name: "OverlayRegular",
      data: fs.readFileSync(payload.fontRegular),
      weight: 400,
      style: "normal",
    },
  ];

  const layout = buildLayout(payload.width, payload.height);
  const element = overlayElement(payload, layout);

  const svg = await satori(element, {
    width: layout.canvasWidth,
    height: layout.barH,
    fonts,
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: layout.canvasWidth },
  });
  const png = resvg.render().asPng();

  fs.mkdirSync(path.dirname(payload.output), { recursive: true });
  fs.writeFileSync(payload.output, png);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
