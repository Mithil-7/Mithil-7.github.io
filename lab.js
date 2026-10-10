(() => {
  'use strict';
  if (!window.PuzzleStudio?.View) return;
  const $ = id => document.getElementById(id);
  const tabs = [...document.querySelectorAll('[data-lab-type]')];
  const moveButtons = [...document.querySelectorAll('[data-move]')];
  const label = move => move.replace("'", '′');
  const names = { '2': '2×2×2 cube', '3': '3×3×3 cube', '4': '4×4×4 cube', '5': '5×5×5 cube', pyram: 'Pyraminx', clock: 'Clock puzzle' };
  const kickers = { '2': 'Eight corners, one challenge', '3': 'The classic', '4': 'Centers, pairing, and parity', '5': 'Scale the method', pyram: 'Tetrahedral symmetry', clock: 'Modular time' };
  let running = false;
  let stopRequested = false;
  let lastMove = '';

  function sync(view, token) {
    if (token) lastMove = token;
    const cube = Number(view.type) > 0;
    const busy = Boolean(view.active || view.visualTween || running);
    $('lab-move-count').textContent = String(view.history.length);
    $('lab-last-move').textContent = lastMove ? label(lastMove) : '—';
    $('lab-sticker-count').textContent = cube ? `${view.model.size ** 2 * 6} stickers` : 'Kinetic illustration';
    $('lab-model-label').textContent = cube ? `${view.type}×${view.type} / permutation engine` : `${names[view.type]} / geometry study`;
    $('lab-status').textContent = running ? 'Running sequence…' : busy ? 'Moving…' : cube ? view.model.isSolved() ? 'Solved' : 'Exploring' : 'Illustration ready';
    $('lab-history').textContent = cube ? view.history.length ? view.history.map(label).join('  ') : 'Your next move goes here.' : 'Geometry and motion illustration / use the controls to explore.';
    moveButtons.forEach(button => { button.disabled = busy; });
    tabs.forEach(button => { button.disabled = busy; });
    ['lab-scramble', 'lab-algorithm', 'lab-reset', 'lab-illustrate', 'lab-kinetic-reset'].forEach(id => { $(id).disabled = busy; });
    $('lab-undo').disabled = busy || !view.history.length;
    $('lab-reverse').disabled = busy || !view.history.length;
    $('lab-cancel').hidden = !running;
  }

  let view;
  try {
    view = new PuzzleStudio.View($('lab-canvas'), { type: '3', interactive: true, onChange: sync });
  } catch (error) {
    $('lab-status').textContent = 'Static illustration';
    console.warn('Using the static puzzle illustration.', error);
    return;
  }

  function choose(tab) {
    if (running || view.active || view.visualTween) return;
    const type = tab.dataset.labType;
    const cube = Boolean(Number(type));
    tabs.forEach(other => { other.setAttribute('aria-selected', String(other === tab)); other.tabIndex = other === tab ? 0 : -1; });
    $('lab-panel').setAttribute('aria-labelledby', tab.id);
    $('lab-title').textContent = names[type];
    $('lab-kicker').textContent = kickers[type];
    $('cube-controls').hidden = !cube;
    $('kinetic-controls').hidden = cube;
    $('wide-controls').hidden = !cube || Number(type) < 4;
    $('lab-description').textContent = cube ? `Real ${type}×${type} sticker permutations. Quarter turns, inverse turns${Number(type) >= 4 ? ', wide turns,' : ','} and the option to retrace every move back to the start.` : type === 'pyram' ? 'Explore triangular faces and threefold rotational symmetry. This is a kinetic geometry illustration.' : 'Nine dials move through a cycle of twelve. Explore modular arithmetic through this coupled-dial illustration.';
    $('kinetic-formula').textContent = type === 'pyram' ? '120° × 3 = 360°' : 't ≡ t + 12  (mod 12)';
    $('lab-illustrate').textContent = type === 'pyram' ? 'Rotate the geometry ↗' : 'Turn the dials ↗';
    $('kinetic-note').textContent = type === 'pyram' ? 'A geometric illustration of tetrahedral symmetry, rather than a full Pyraminx move simulator.' : 'A modular-time illustration, rather than a complete Clock solving simulator.';
    $('lab-canvas').setAttribute('aria-label', `${names[type]}. Drag to inspect, or use arrow keys to rotate the view. ${cube ? 'Use labeled face-turn buttons to change the puzzle.' : 'Use the illustration controls to explore the geometry.'}`);
    lastMove = '';
    view.setType(type);
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => choose(tab));
    tab.addEventListener('keydown', event => {
      if (running || view.active || view.visualTween) return;
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault(); choose(tabs[next]); tabs[next].focus();
    });
  });

  async function turn(token, record = true) {
    if (running || view.active || !Number(view.type)) return;
    await view.turn(token, record);
    sync(view);
  }
  moveButtons.forEach(button => {
    button.setAttribute('aria-label', `${label(button.dataset.move)} — ${button.getAttribute('aria-label')}`);
    button.addEventListener('click', () => turn(button.dataset.move));
  });

  async function sequence(moves, record = true) {
    if (running || view.active) return;
    running = true; stopRequested = false; sync(view);
    try {
      for (const token of moves) {
        if (stopRequested) break;
        await view.turn(token, record);
      }
    } finally { running = false; sync(view); }
  }
  $('lab-algorithm').addEventListener('click', () => sequence(['R', 'U', "R'", "U'"]));
  $('lab-scramble').addEventListener('click', () => {
    if (running || view.active) return;
    const faces = ['U', 'D', 'L', 'R', 'F', 'B'];
    const modifiers = ['', "'", '2'];
    const moves = [];
    const length = Number(view.type) === 2 ? 12 : 20;
    let previous = '';
    while (moves.length < length) {
      const face = faces[Math.floor(Math.random() * faces.length)];
      if (face === previous) continue;
      previous = face;
      const wide = Number(view.type) >= 4 && Math.random() > .72 ? 'w' : '';
      moves.push(face + wide + modifiers[Math.floor(Math.random() * modifiers.length)]);
    }
    sequence(moves);
  });
  $('lab-undo').addEventListener('click', async () => {
    if (running || view.active || !view.history.length) return;
    const token = view.history.pop();
    await turn(PuzzleStudio.inverseMove(token), false);
  });
  $('lab-reverse').addEventListener('click', async () => {
    if (running || view.active || !view.history.length) return;
    // Pop each original move only after its inverse completes. Cancellation keeps
    // the remaining history valid, so a later reversal can still reach the start.
    running = true; stopRequested = false; sync(view);
    try {
      while (view.history.length && !stopRequested) {
        const original = view.history[view.history.length - 1];
        await view.turn(PuzzleStudio.inverseMove(original), false);
        view.history.pop();
        sync(view);
      }
    } finally { running = false; sync(view); }
  });
  $('lab-cancel').addEventListener('click', () => { stopRequested = true; view.finish(); });
  $('lab-reset').addEventListener('click', () => { if (!running && !view.active) { lastMove = ''; view.reset(); } });
  $('lab-kinetic-reset').addEventListener('click', () => { if (!view.visualTween) view.reset(); });
  $('lab-illustrate').addEventListener('click', async () => {
    if (view.visualTween) return;
    const promise = view.illustrate();
    sync(view);
    await promise;
    sync(view);
  });

  const directions = { left: [-.2, 0], right: [.2, 0], up: [0, -.14], down: [0, .14] };
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => view.adjustView(...directions[button.dataset.view])));
  $('reset-view').addEventListener('click', () => view.resetView());
  $('orbit-toggle').addEventListener('click', event => {
    view.setRotation(!view.rotate);
    event.currentTarget.setAttribute('aria-pressed', String(!view.rotate));
    event.currentTarget.textContent = view.rotate ? 'Pause camera' : 'Resume camera';
  });
  $('lab-canvas').addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toUpperCase();
    const direction = { ARROWLEFT: 'left', ARROWRIGHT: 'right', ARROWUP: 'up', ARROWDOWN: 'down' }[key];
    if (direction) { event.preventDefault(); view.adjustView(...directions[direction]); return; }
    if (key === 'HOME') { event.preventDefault(); view.resetView(); return; }
    if ('UDLRFB'.includes(key) && key.length === 1 && Number(view.type)) {
      event.preventDefault(); turn(key + (event.shiftKey ? "'" : ''));
    }
  });
  const requestedType = new URLSearchParams(window.location.search).get('puzzle');
  choose(tabs.find(tab => tab.dataset.labType === requestedType) || tabs.find(tab => tab.dataset.labType === '3'));
  sync(view);
})();
