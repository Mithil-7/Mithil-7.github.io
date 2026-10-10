# Portfolio setup

The portfolio is a static, dependency-free website. All professional content is present in HTML; JavaScript progressively enhances the visuals and controls.

## Preview

From this folder:

```bash
python3 -m http.server 4173
```

Open **http://localhost:4173/** and **http://localhost:4173/interactive-lab.html**.

## Publish to GitHub Pages

Copy these files into the root of the `Mithil-7/Mithil-7.github.io` site repository:

```text
index.html
interactive-lab.html
site.css
site.js
lab.css
lab.js
puzzles.js
ambient.js
robots.txt
sitemap.xml
assets/
```

There is no build step. Keep the relative paths intact. `assets/social-card.png` is the 1200×630 social preview; `assets/social-card.svg` is its editable source.

## Interactive features

- **State-space observatory:** original canvas geometry, numerical orbits, a rotating cube, and real face-turn permutations. Small Pyraminx, Clock, and 2×2 illustrations orbit the main scene.
- **Puzzle explorer:** 2×2, 3×3, 4×4, 5×5, Pyraminx, and Clock. Arrow keys navigate the tabs. Opening the full lab preserves the selected puzzle.
- **Puzzle Lab:** real cube sticker models support outer turns, prime turns, scrambles, undo, reset, and reversing move history. The 4×4 and 5×5 also have wide-turn controls. Pyraminx and Clock are labeled kinetic illustrations, not full simulators.
- **Camera:** drag the lab canvas, use the view buttons, or focus the canvas and use arrow keys. Home resets the view; U/D/L/R/F/B turn faces, and Shift makes the turn counterclockwise.
- **Display preferences:** light/dark theme and animation pause are shared across both pages and saved locally. System reduced-motion preferences are respected. Visual work stops offscreen and while the tab is hidden.
- **Sound:** synthesized locally and off by default. Enable it through the music-note control. Playback pauses while the tab is hidden.
- **Skills:** all nine domains are readable in the HTML; optional filter buttons organize them by learning, engineering, and mathematical/data work.
- **Contact:** the form composes a draft in the visitor’s email application. The direct email and copy-email controls remain available.
- **GitHub activity:** requested only when approaching the activity section, with an eight-second timeout and a clearly dated local fallback.

## Verify the puzzle mathematics

```bash
node scripts/check_puzzles.cjs
node --check puzzles.js
node --check site.js
node --check lab.js
node --check ambient.js
```

The checks verify sticker conservation, legal surface geometry, move/inverse identities, four quarter turns, half turns, the order-six commutator, and long mixed-scramble reversal on every cube size.

## Content sources

- WCA highlight: [2022ADHI01](https://www.worldcubeassociation.org/persons/2022ADHI01), checked October 5, 2026. Official single records shown: 3×3 **37.70s**, 2×2 **13.17s**, Pyraminx **6.61s**. Other puzzle previews are not presented as official competition results.
- Traffic architecture and the 43-test count are documented in the linked project repository. The illustrated diagrams are architecture sketches, not screenshots or production measurements.
- Research status remains **submitted / under peer review**. The reported forecasting result is described in its expandable status note rather than promoted as a verified published benchmark.
- `assets/contributions.svg` is a fallback snapshot dated September 28, 2026. Current contributions are requested from the public contribution API.

## Profile README and older artwork

For the `Mithil-7/Mithil-7` profile repository, copy `README.md` and `assets/`.
`scripts/build_art.py` generates the original README hero/project SVGs and dated contribution artwork using Python’s standard library:

```bash
python3 scripts/build_art.py
```

The website uses the newer state-space artwork and does not require running that script.
