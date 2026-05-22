---
name: Anime MV Pipeline
description: A calm local creative studio for one-shot anime MV compilation.
---

<!-- SEED: re-run /impeccable document once there's code to capture the actual tokens and components. -->

# Floating Cut Room — Design System

## Vision

The Floating Cut Room is a video editing pipeline interface that feels like working inside a translucent, layered space — where glass panels float at different depths, lime light traces the path of active processes, and every transition is choreographed like film editing itself.

## Design Principles

### 1. Liquid Glass Navigation
- Navigation panels use `backdrop-filter: blur(24px)` with translucent dark surfaces
- Glass surfaces have subtle light gradients (`::before` pseudo-elements) simulating light refraction
- Borders are semi-transparent white (`rgba(255,255,255,0.08)`) creating edge definition without hardness
- Heavy glass variant (`blur(40px)`) for the primary navigation rail
- Lime-tinted glass variant for active/focused panels

### 2. Floating Elevation
- Four elevation levels (`fcr-float-1` through `fcr-float-4`) with layered box-shadows
- Each level uses multiple shadow layers for realistic depth perception
- Elements lift on hover with `translateY(-2px)` / `translateY(-4px)` micro-interactions
- Ambient breathing animation (`fcr-breathe`) for resting state panels
- Z-axis transforms (`translateZ`) for true spatial depth

### 3. Choreographed Transitions
- Entrance animations: `fcr-entrance-fade-up`, `fcr-entrance-fade-left`, `fcr-entrance-scale`
- Staggered delays (`fcr-stagger-1` through `fcr-stagger-6`) for sequential reveals
- Custom easing curves: `fcr-ease-out-expo`, `fcr-ease-spring`, `fcr-ease-out-quart`
- Page-level choreography: panels enter in sequence, not simultaneously
- Glass entrance animation that transitions backdrop-blur from 0 to full

### 4. Lime as Compositional Accent
- Lime (`#a3e635`) is used sparingly — for active states, playheads, and key metrics
- Never used as a dominant surface color
- Lime glow (`rgba(163,230,53,0.25)`) creates halos around interactive elements
- Lime pulse animation for status indicators
- Lime gradient borders on active navigation items
- Text selection and focus rings use lime

## Component Architecture

### Layout
- `Layout` — Orchestrates nav + top rail + main content area
- `Navigation` — Liquid glass sidebar with collapsible sections
- `Dashboard` — Grid of floating stat cards and panels

### Surfaces
- `fcr-glass` — Standard glass panel
- `fcr-glass-heavy` — Heavier blur for navigation
- `fcr-glass-lime` — Lime-tinted glass for active/focused panels
- `fcr-panel` — Glass panel with header + body
- `fcr-card` — Floating card with hover elevation

### Interactive Elements
- `fcr-btn-primary` — Lime gradient button with glow shadow
- `fcr-btn-ghost` — Minimal ghost button with glass border
- `fcr-btn-glass` — Glass surface button
- `fcr-timeline-clip` — Draggable clip on timeline track
- `fcr-timeline-playhead` — Lime playhead with glow

### Status
- `fcr-status-active` — Lime pulsing dot
- `fcr-status-queued` — Muted white dot
- `fcr-status-error` — Red dot with glow

## Color System

| Token | Value | Usage |
|-------|-------|-------|
| `--fcr-lime-400` | `#a3e635` | Primary accent |
| `--fcr-lime-glow` | `rgba(163,230,53,0.25)` | Glow halos |
| `--fcr-lime-subtle` | `rgba(163,230,53,0.08)` | Tinted backgrounds |
| `--fcr-surface-base` | `#0a0a0f` | Page background |
| `--fcr-surface-raised` | `#111118` | Raised surfaces |
| `--fcr-glass-bg` | `rgba(15,15,20,0.55)` | Glass panel fill |
| `--fcr-glass-border` | `rgba(255,255,255,0.08)` | Glass edges |

## Animation Timing

| Token | Duration | Curve | Usage |
|-------|----------|-------|-------|
| `--fcr-duration-instant` | 100ms | — | Hover states |
| `--fcr-duration-fast` | 200ms | out-quart | Button presses |
| `--fcr-duration-normal` | 350ms | out-expo | Panel transitions |
| `--fcr-duration-slow` | 500ms | out-expo | Page entrances |
| `--fcr-duration-grand` | 800ms | out-expo | Layout shifts |

## Accessibility

- `prefers-reduced-motion` disables all animations
- Focus rings use lime accent (`--fcr-lime-400`)
- All interactive elements have proper ARIA attributes
- Color contrast meets WCAG AA for text on dark glass surfaces
- Keyboard navigation supported throughout
