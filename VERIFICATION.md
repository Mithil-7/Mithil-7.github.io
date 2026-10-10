# Redesign verification

Verified locally on October 5, 2026 against the supplied portfolio folder.

## Mobile Lighthouse

Measured on a local Python HTTP server using Lighthouse’s default mobile simulation and Chromium:

| Category | Score |
| --- | ---: |
| Performance | 98 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |

- First contentful paint: **1.7 s**
- Largest contentful paint: **2.0 s**
- Total blocking time: **0 ms**
- Cumulative layout shift: **0.005**

These are local lab measurements; deployed performance also depends on hosting, caching, fonts, and the visitor’s device.

## Browser checks

- Both pages checked at **320, 390, 768, 1024, and 1440px** with no horizontal overflow.
- Both themes passed automated axe checks for WCAG 2 A/AA, 2.1 A/AA, and 2.2 AA.
- No JavaScript runtime errors in the tested flows.
- Verified mobile menu, Escape handling, active navigation, and hash targets.
- Verified all skill filters, six puzzle tabs, arrow-key tab navigation, and selected-puzzle links into the lab.
- Verified real cube turns, wide turns, keyboard turns, undo, reset, scramble reversal, and cancellation with valid remaining move history.
- Verified Pyraminx and Clock kinetic controls, Clock camera projection, and camera reset.
- Verified visual pause/resume, system reduced motion, and no-JavaScript content/navigation fallback.
- Verified opt-in sound, volume accessibility, and the sound-off control.
- Verified copy-email, required form validation, email draft composition, and the clearly dated contribution fallback.
- Verified unique HTML IDs, internal anchors, local assets, SVG validity, and sitemap XML.

## Mathematical checks

Run:

```bash
node scripts/check_puzzles.cjs
```

Every cube size passes sticker conservation, surface geometry, inverse and half-turn identities, four-quarter-turn identity, the six-repeat commutator, and reversal of a 120-move mixed sequence.
