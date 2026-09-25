---
name: Presence Platform
colors:
  surface: '#fbf8ff'
  surface-dim: '#d7d8f0'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f2ff'
  surface-container: '#ececff'
  surface-container-high: '#e5e6ff'
  surface-container-highest: '#dfe1f9'
  on-surface: '#181a2c'
  on-surface-variant: '#464554'
  inverse-surface: '#2c2f41'
  inverse-on-surface: '#f0efff'
  outline: '#777586'
  outline-variant: '#c7c4d7'
  surface-tint: '#4b4bd2'
  primary: '#4141c8'
  on-primary: '#ffffff'
  primary-container: '#5b5ce2'
  on-primary-container: '#f2efff'
  inverse-primary: '#c1c1ff'
  secondary: '#5354ae'
  on-secondary: '#ffffff'
  secondary-container: '#9d9fff'
  on-secondary-container: '#31318b'
  tertiary: '#4f546e'
  on-tertiary: '#ffffff'
  tertiary-container: '#676c87'
  on-tertiary-container: '#f0efff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1dfff'
  primary-fixed-dim: '#c1c1ff'
  on-primary-fixed: '#08006b'
  on-primary-fixed-variant: '#322fba'
  secondary-fixed: '#e1dfff'
  secondary-fixed-dim: '#c1c1ff'
  on-secondary-fixed: '#08016a'
  on-secondary-fixed-variant: '#3a3b95'
  tertiary-fixed: '#dde1ff'
  tertiary-fixed-dim: '#c1c5e4'
  on-tertiary-fixed: '#151a31'
  on-tertiary-fixed-variant: '#41455f'
  background: '#fbf8ff'
  on-background: '#181a2c'
  surface-variant: '#dfe1f9'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-mobile:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes an elegant, calm, and trustworthy presence platform crafted specifically for higher education institutions, faculty, and students. By rejecting typical utilitarian attendance trackers—often defined by frantic QR scans, harsh warning badges, and noisy dashboards—this design system approaches presence as an ambient, respectful state of engagement.

The aesthetic fuses **Corporate / Modern** precision with **Human-centric Warmth**:
- **Clarity over Surveillance:** Interfaces focus on mutual accountability and ease rather than punitive verification. State indicators feel affirmative rather than interrogative.
- **Architectural Poise:** Generous white space, deliberate horizontal rhythm, and balanced structural panels ground administrative complexity in peaceful order.
- **Micro-Interactions:** Subtle, smooth transitions with natural easing prevent mechanical abruptness during live session state changes.

## Colors

The palette is engineered to convey quiet authority and technological poise, avoiding harsh corporate tropes or eye-straining neons.

- **Primary (`#5B5CE2` Electric Indigo):** The core active accent used for primary workflows, active navigation highlights, and definitive calls to action.
- **Primary Dark (`#4546B8` Deep Indigo):** Used for hover and pressed states of primary interactives to maintain rich optical weight.
- **Brand Navy (`#11162D` Midnight Navy):** Serves as an anchor color for deep context framing, such as persistent institutional sidebars, executive command headers, and contrastive modal frames.
- **Secondary (`#8B8DEB` Soft Lavender):** Adds supportive tonal richness, active indicator halos, and tertiary metadata tags without overwhelming data views.
- **Functional Semantics:**
  - **Success (`#22C7A3` Mint Green):** Verified state, active presence, clean operational health.
  - **Warning (`#F4B740` Warm Amber):** Soft disconnects, session reconciliations, grace periods.
  - **Danger (`#F05D6C` Coral Red):** Geographic or network conflicts, expired sessions, manual review required.
- **Surfaces & Atmosphere:**
  - **Canvas Background (`#F6F7FB` Cloud):** A soft, non-reflective tinted backdrop that reduces retinal fatigue during day-long portal usage.
  - **Surface Container (`#FFFFFF` Pure White):** Clean elevation for primary cards, tables, and modal dialogues.
  - **Surface Secondary (`#EEF0F8` Soft Lavender Gray):** Low-contrast structural grouping for secondary side-drawers, table headers, and inactive wells.
  - **Text Hierarchy:** Text Primary (`#171A2B`) provides accessible optical density; Text Secondary (`#6C728A`) communicates structural guidance and timestamp metadata.
  - **Borders (`#E5E7F0`):** Precise dividing rules ensuring distinct visual separation without hard structural weight.

## Typography

The typographic hierarchy relies on **Inter** to deliver immediate legible clarity across desktop rosters, lecture podium consoles, and student mobile screens.

- **Headings & Hierarchy:** All display and headline levels enforce a `-0.02em` tracking offset alongside a `700` bold weight. This tight, geometric presence delivers premium editorial authority to session titles, metrics, and institutional overviews.
- **Body & Content:** Body typography runs at `400` regular weight with balanced line spacing (`1.42` to `1.5` ratio) to maintain rapid legibility across dense verification logs and audit trails.
- **Numeric & Tabular Data:** Numeric figures across live verification counters and analytics tables should enforce tabular figures (`font-variant-numeric: tabular-nums`) to prevent layout jittering during real-time student count adjustments.

## Layout & Spacing

The layout model is anchored by an 8pt base grid implemented through a flexible 12-column structure on desktop, transitioning seamlessly to 4 columns on mobile.

- **Desktop (1024px+):** 12-column layout with fixed or fluid max-width of `1440px`. Column gutter is set to `1.5rem` (`24px`) with outer canvas margin of `2rem` (`32px`). Admin dashboards feature an anchored `260px` Midnight Navy navigation rail, leaving the remaining canvas fluid.
- **Tablet (768px - 1023px):** 8-column layout with `1.25rem` (`20px`) gutters and margins. Navigation collapses into an overlay drawer or a compact icon strip.
- **Mobile (< 768px):** 4-column layout with `1rem` (`16px`) gutters and margins. Layouts reflow vertically; session overviews switch from tabular matrices to card stacks.
- **Internal Component Spacing:**
  - Micro-gaps (badge icons, checkmarks): `space-xs` (4px) to `space-sm` (8px).
  - Form field and card interior padding: `space-md` (16px) to `space-lg` (24px).
  - Section dividers and panel separations: `space-xl` (32px).

## Elevation & Depth

Visual hierarchy rejects exaggerated, harsh shadows in favor of calm atmospheric diffusion, prioritizing a sense of physical weight and natural layer separation.

- **Surface Elevation Scale:**
  - **Flat / Base Level:** Background canvas (`#F6F7FB`) with zero shadow. Secondary surfaces (`#EEF0F8`) rest directly on the base to demarcate toolbars or table headers via flat color boundaries.
  - **Level 1 (Card & Module Surface):** Pure White containers (`#FFFFFF`) framed by a subtle 1px border (`#E5E7F0`) paired with an extra-diffused ambient shadow: `0 8px 30px rgba(17, 22, 45, 0.06)`. This lifts core attendance modules smoothly off the cloud base.
  - **Level 2 (Hover & Active States):** Elevated cards on hover or interactive focus transition to: `0 12px 36px rgba(17, 22, 45, 0.09)` with an outline shift to `#8B8DEB`.
  - **Level 3 (Overlays, Floating Sheets & Modals):** Attendance disputes, detail drawers, and context menus utilize a directional drop shadow: `0 20px 48px rgba(17, 22, 45, 0.14)` combined with a soft backdrop scrim (`rgba(17, 22, 45, 0.4)` with 4px backdrop blur).
- **Surface Boundaries:** Every elevated container pairs its ambient shadow with an explicit 1px stroke (`#E5E7F0`) to ensure high accessibility across varied monitor calibrations.

## Shapes

The design system adopts a balanced, rounded structural form language that softens administrative density while maintaining clean enterprise structure.

- **Radius Scale Rules:**
  - **Small (`8px`):** Applied to form inputs, dropdown selectors, internal list item hovers, and micro interactive controls.
  - **Medium (`14px`):** Applied to secondary cards, contextual flyouts, status panels, and nested content blocks.
  - **Large (`20px`):** Reserved for primary dashboard containers, high-level summary cards, modals, and institutional cohort summaries.
  - **Pill (`999px`):** Exclusively utilized for status chips, continuous connection badges, avatar frames, filter tags, and quick-action icon wraps.

## Components

### Buttons
- **Primary:** Solid `#5B5CE2` background, Pure White text, `8px` corner radius, `space-sm` vertical by `space-md` horizontal padding. Hover triggers `#4546B8`. Focused state features a 3px ring of `#8B8DEB` with 30% opacity.
- **Secondary:** Surface Secondary (`#EEF0F8`) background with Text Primary (`#171A2B`) typography. Subtle `#E5E7F0` border.
- **Ghost / Tertiary:** Transparent fill with `#5B5CE2` text; hover reveals an ultra-soft `#EEF0F8` background tint.

### Status Chips & Badges
- Pill-shaped (`999px`) indicators designed to denote live session verification.
- **Verified / Present:** `#22C7A3` background at 12% opacity with solid `#0E8B70` dark text and an internal `6px` pulsing emerald dot.
- **Review / Disconnect:** `#F4B740` background at 14% opacity with `#8F640E` text.
- **Conflict / Absent:** `#F05D6C` background at 12% opacity with `#B52333` text.

### Cards & Panels
- Constructed on `#FFFFFF` Pure White surfaces with a `14px` or `20px` border radius, bordered by `1px solid #E5E7F0`.
- Includes a dedicated header section with title, contextual metadata, and secondary actions separated by a minimal bottom border or generous `space-lg` separation.

### Form Inputs & Selectors
- Background `#FFFFFF`, border `1px solid #E5E7F0`, radius `8px`, typography `body-md` (`14px`).
- Inactive placeholder styled in `#6C728A`. Focus transition smoothly illuminates the border to `#5B5CE2` with a 2px diffuse outer glow.

### Checkboxes & Radios
- `20px` touch targets with `4px` border radius for checkboxes and full circular curvature for radios.
- Inactive state: `1.5px solid #E5E7F0` on white. Checked state: `#5B5CE2` fill with a crisp white check vector.

### Presence Live Monitor (Domain-Specific)
- A persistent live pulse panel indicating ongoing room verification health.
- Features a subtle radar or concentric aura radiating in Mint Green (`#22C7A3`) against a Soft Lavender Gray (`#EEF0F8`) well, giving faculty instant, ambient assurance of classroom connection without aggressive visual noise.