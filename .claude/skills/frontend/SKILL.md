---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with a premium, minimalist, and editorial design aesthetic. Generates highly polished, executive-level code that feels genuinely designed by a premium agency.
license: Complete terms in LICENSE.txt
---

This skill guides the creation of distinctive, production-grade frontend interfaces focused on premium minimalism and professional execution. It avoids generic "AI slop" and over-designed clutter, opting instead for restraint, mathematical precision, and editorial sophistication.

## Design Thinking

Before coding, commit to a REFINED, HIGH-END MINIMALIST direction:
- **Purpose**: Identify the core utility. Strip away anything that does not directly serve this purpose.
- **Tone**: Select a professional archetype: Editorial/Magazine (high contrast, strong grids), Luxury/Refined (generous whitespace, muted tones), Swiss/International Style (functional typography, strict alignment), or Industrial/Utilitarian (functional, sharp, technical).
- **Differentiation**: The differentiator is execution, not decoration. Unforgettable interfaces rely on perfect typography hierarchy, invisible grids, and micro-delights.

**CRITICAL**: Minimalist elegance comes from what you leave out. Focus on high-density utility balanced by massive breathing room (whitespace).

## Frontend Aesthetics Guidelines (Premium Minimalism)

Focus on:
- **Typography as Architecture**: Typography is the primary design element. Avoid generic fonts (Inter, Roboto, Arial) and overused alternatives (Space Grotesk). Instead, pair a sophisticated serif/display font for headings (e.g., Playfair Display, Cormorant, Syne, or sharp geometric grotesques like Cabinet Grotesk) with an ultra-clean, highly readable sans-serif for body text (e.g., Plus Jakarta Sans, Satoshi, General Sans).
- **Sophisticated Monochromatic/Muted Palettes**: Never use default vibrant gradients or high-saturation primary colors. Commit to a 60-30-10 color rule. Use rich, off-black tones (#0B0B0C, #121214) or warm, editorial light backgrounds (#FBFBFA, #F5F5F3). Accents should be surgical and deliberate—a single stark contrast color used only for primary actions.
- **Invisible Grids & Asymmetric Balance**: Use strict layout grids (CSS Grid/Flexbox) but break them intentionally with subtle asymmetry or unexpected alignment (e.g., left-heavy text with immense right-side whitespace). Use deliberate aspect ratios (e.g., 4:3, 16:10) for containers.
- **Fluid & Atmospheric Backdrops**: Instead of flat colors or cheap gradients, use premium textures: micro-grain overlays, CSS-based subtle noise, ultra-soft box shadows (blur-radius > 40px with < 3% opacity), or layered glassmorphism (`backdrop-filter`) that mimics frosted physical materials.
- **Micro-Interactions & Organic Motion**: Avoid flashy, bouncing, or scattered animations. Use high-impact, low-amplitude transitions. Favor custom bezier curves for smooth acceleration (e.g., `cubic-bezier(0.16, 1, 0.3, 1)` for an elegant ease-out). Implement staggered element fades on page load and razor-sharp hover states that feel responsive and tactile.
- **Extreme Precision**: Every border must be intentional (e.g., `1px solid rgba(0,0,0,0.06)`). Every border-radius must be cohesive (either strictly sharp 0px/2px or soft but controlled 8px/12px). Never mix radiuses randomly.

## Anti-Patterns to Avoid
- **NEVER** use generic Tailwind/Bootstrap-looking defaults (e.g., Indigo-600 buttons, generic gray-100 backgrounds).
- **NEVER** overload the viewport with cards, badges, and icons just to fill space. 
- **NEVER** use generic tech-bro purple/blue gradient meshes unless specifically requested.

Execute with restraint, mathematical precision, and meticulous attention to layout spacing. Elegance is the ultimate sophistication.
