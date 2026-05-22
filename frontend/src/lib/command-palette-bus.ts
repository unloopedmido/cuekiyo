let openPalette: (() => void) | null = null

export function setCommandPaletteOpener(opener: (() => void) | null) {
  openPalette = opener
}

export function openCommandPalette() {
  openPalette?.()
}
