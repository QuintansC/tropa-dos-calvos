---
name: frontend-design
description: Create polished, production-grade frontend websites and applications with restrained visual design, strong typography, responsive layouts, and careful interaction details. Use when building or redesigning HTML, CSS, JavaScript, React, Vite, dashboards, tools, landing pages, or any user-facing UI where layout, visual hierarchy, accessibility, and product-quality execution matter.
---

# Frontend Design

Use this skill to produce frontend work that feels intentionally designed, not assembled from defaults.

## Design Direction

Before coding, choose a focused design direction:

- Identify the core workflow and make it usable on the first screen.
- Pick one clear tone: editorial, refined, Swiss/international, utilitarian, playful, or community-oriented.
- Use visual restraint, but keep the interface complete and usable.
- Make typography, spacing, alignment, and interaction states carry most of the design.

## UI Standards

- Use a responsive layout from the start. Check mobile and desktop constraints while building.
- Prefer CSS Grid and Flexbox with explicit gaps, max widths, and stable dimensions.
- Use a deliberate type scale. Avoid oversized text inside dense panels, cards, forms, and controls.
- Keep border radii consistent. Default to 8px or less unless the existing system uses another radius.
- Use restrained colors with one or two purposeful accents. Avoid generic blue/purple gradient defaults and one-note palettes.
- Add hover, focus, active, empty, and success/error states where users can interact.
- Use real controls for real tasks: forms for submissions, buttons for actions, tabs for views, toggles for binary options, and selects or segmented controls for modes.
- Make the first viewport useful. Do not replace the app with a marketing-only landing page unless explicitly requested.

## Content And Assets

- Use concrete copy that matches the domain. Avoid generic placeholder text.
- Include visual assets when the site benefits from them. Use generated bitmap images for hero or editorial visuals when no project asset exists.
- Use icons only when they improve scanability or clarify an action. Prefer the existing icon library if one is already installed.
- Do not use visible instructional text to explain obvious UI behavior.

## Implementation Workflow

1. Inspect the existing project structure, framework, and styling conventions.
2. Choose the smallest stack that satisfies the request.
3. Build the functional experience first, then refine visual hierarchy and responsiveness.
4. Keep files scoped and avoid unrelated refactors.
5. Run the available checks or a local server when the project needs one.
6. Verify layout visually when possible, especially at mobile and desktop widths.

## Quality Bar

- Text must not overflow or overlap at common viewport sizes.
- Form submissions must give visible feedback.
- Empty states must be handled.
- Interactive elements must have keyboard-visible focus styles.
- Data stored only in the browser must clearly behave consistently after refresh.
