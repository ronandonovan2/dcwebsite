# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Single-page static website for the Dromtrasna Challenge, an annual charity run in Abbeyfeale, Co. Limerick, Ireland. Supports Milford Care Centre and St. Ita's Community Hospital.

## Technology Stack

- Plain HTML5, CSS3, and vanilla JavaScript
- No build tools, bundlers, or frameworks
- Custom font: Plane Crash (display titles) - **lowercase only**
- Google Fonts: Montserrat (UI/body), Permanent Marker (hero title)

## Development

**Preview the site:**
```bash
open index.html
```
Or use any local server (e.g., `python3 -m http.server 8000`).

## Architecture

### File Structure
```
├── index.html              # Single-page layout (13 sections)
├── css/styles.css          # All styling with CSS custom properties
├── js/main.js              # Interactive features (DOMContentLoaded init)
├── fonts/
│   └── PlaneCrash.ttf      # Custom display font (lowercase only!)
├── images/
│   ├── dromtrasna challenge.png      # Nav logo (default/top of page)
│   ├── dromtrasna challenge (3).svg  # Nav logo (scrolled state)
│   ├── hero.jpg                      # Hero background
│   ├── route-map.jpg                 # Route map image
│   ├── cheque-milford.jpg            # Charity presentation photo
│   ├── cheque-stitas.jpg             # Charity presentation photo
│   ├── gallery/                      # Event photos (gallery-1.jpg to gallery-32.jpg)
│   ├── sponsors/                     # Main sponsor logos (sponsor-1.png to sponsor-3.png)
│   └── Charity Logo's/              # Beneficiary logos (milford-logo.png, Friends-of-st-ita-logo.webp)
└── CLAUDE.md               # This file
```

### HTML Sections (in order)
nav, hero, about, events, route, impact, gallery, results, register/donate CTAs, sponsors, FAQ, contact, footer

### CSS Design System
CSS variables defined in `:root` for consistent theming:
- Colors: `--color-primary` (Deep Navy #1A237E), `--color-secondary` (Vibrant Red #E53935), `--color-accent` (Sun Yellow #FFC107)
- Gradients: `--gradient-atmospheric` (radial navy), `--gradient-energy` (plum to red overlay)
- Spacing scale: `--space-xs` through `--space-4xl`
- Responsive breakpoints: 480px, 768px, 900px, 1024px

### JavaScript Modules (main.js)
Each feature is isolated in its own function:
- `initNavigation()` - Sticky header, mobile hamburger menu, dropdown handling, smooth scroll
- `initCountdown()` - Live countdown timer to event date (Oct 18, 2026)
- `initScrollAnimations()` - Intersection Observer-based reveal animations
- `initFAQ()` - Accordion expand/collapse
- `initGallery()` - Lightbox with keyboard navigation, expand/collapse toggle for 32 photos
- `initSponsorMarquee()` - Infinite scroll sponsor names (66 community supporters)
- `initAnimatedCounter()` - Fundraising total animation (€204,658.52)
- `initParallax()` - Hero background parallax effect

### Accessibility Features
- Reduced motion support via `prefers-reduced-motion`
- ARIA attributes on interactive elements
- Keyboard navigation for lightbox (Escape, Arrow keys)
- Minimum 44px touch targets

## Important Notes

### Plane Crash Font
The custom font **only renders lowercase letters correctly**. Any element using `font-family: 'Plane Crash'` should have `text-transform: lowercase` applied.

### Key Data Points
- Event date: October 18, 2026
- Total raised: €204,658.52 (update in HTML `data-target` attribute and impact section)
- 2025 fundraising: €34,145.63

## Remaining Placeholders

The following items still need real URLs:

1. **External Links**
   - Registration URL (Eventmaster) - currently `href="#"` in register CTA
   - Donation URL - currently `href="#"` in donate CTA

## Quick Edits Reference

| To update... | Edit file | Look for |
|--------------|-----------|----------|
| Event date | `index.html` | "October 18, 2026" (hero) |
| Countdown target | `js/main.js` | `new Date('October 18, 2026` |
| Fundraising total | `index.html` | `data-target="204658.52"` |
| 2025 amount | `index.html` | `€34,145.63` in impact section |
| Results/leaderboard | `index.html` | `#results` section |
| Sponsor names | `index.html` | `.marquee-content` divs |
| FAQ content | `index.html` | `.faq-item` elements |
