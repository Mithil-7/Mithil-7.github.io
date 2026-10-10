(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch (_) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (_) { /* In-page controls still work. */ } }
  };

  const themeToggle = document.getElementById('theme-toggle');
  function syncTheme() {
    const light = root.dataset.theme === 'light';
    themeToggle?.setAttribute('aria-pressed', String(light));
    themeToggle?.setAttribute('aria-label', `Switch to ${light ? 'dark' : 'light'} theme`);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#d7d9d1' : '#0b0b0e');
    window.dispatchEvent(new Event('portfolio:theme'));
  }
  themeToggle?.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    storage.set('mithil-theme', root.dataset.theme);
    syncTheme();
  });
  syncTheme();

  const motionToggle = document.getElementById('motion-toggle');
  function syncMotion() {
    const paused = root.dataset.motion === 'paused' || reduced.matches;
    root.dataset.motion = paused ? 'paused' : 'running';
    motionToggle?.setAttribute('aria-pressed', String(paused));
    motionToggle?.setAttribute('aria-label', reduced.matches ? 'Reduced motion is enabled in your system settings' : paused ? 'Resume visual animations' : 'Pause visual animations');
    motionToggle?.setAttribute('title', reduced.matches ? 'System reduced-motion preference is active' : paused ? 'Resume visual animations' : 'Pause visual animations');
    if (motionToggle) motionToggle.disabled = reduced.matches;
    const icon = document.getElementById('motion-icon');
    if (icon) icon.textContent = paused ? '▷' : 'Ⅱ';
    window.dispatchEvent(new Event('portfolio:motion'));
  }
  motionToggle?.addEventListener('click', () => {
    root.dataset.motion = root.dataset.motion === 'paused' ? 'running' : 'paused';
    storage.set('mithil-motion', root.dataset.motion);
    syncMotion();
  });
  reduced.addEventListener('change', () => { root.dataset.motion = storage.get('mithil-motion') === 'paused' ? 'paused' : 'running'; syncMotion(); });
  syncMotion();

  const menu = document.querySelector('.menu-toggle');
  const nav = document.getElementById('main-nav');
  function closeMenu(returnFocus = false) {
    nav?.classList.remove('is-open');
    menu?.setAttribute('aria-expanded', 'false');
    if (menu) menu.innerHTML = 'Menu <span aria-hidden="true">+</span>';
    if (returnFocus) menu?.focus();
  }
  menu?.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    menu.setAttribute('aria-expanded', String(open));
    menu.innerHTML = open ? 'Close <span aria-hidden="true">×</span>' : 'Menu <span aria-hidden="true">+</span>';
  });
  const navigationLinks = [...(nav?.querySelectorAll('a[href^="#"]') || [])];
  navigationLinks.forEach(link => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (nav?.classList.contains('is-open')) closeMenu(true);
    const sound = document.querySelector('.sound-settings');
    if (sound?.open) { sound.open = false; sound.querySelector('summary')?.focus(); }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) closeMenu();
    const sound = document.querySelector('.sound-settings');
    if (sound?.open && !sound.contains(event.target)) sound.open = false;
  });
  const mobileNav = window.matchMedia('(max-width: 900px)');
  mobileNav.addEventListener('change', () => closeMenu());

  let scrollFrame = 0;
  const progress = document.getElementById('scroll-progress-bar');
  const trackedSections = navigationLinks.map(link => ({ link, section: document.getElementById(link.hash.slice(1)) })).filter(entry => entry.section);
  function updateProgress() {
    scrollFrame = 0;
    const available = root.scrollHeight - innerHeight;
    const readingLine = Math.max(110, innerHeight * .26);
    const active = trackedSections.find(({ section }) => {
      const bounds = section.getBoundingClientRect();
      return bounds.top <= readingLine && bounds.bottom > readingLine;
    });
    if (progress) progress.style.transform = `scaleX(${available > 0 ? Math.min(1, scrollY / available) : 0})`;
    navigationLinks.forEach(link => {
      if (link === active?.link) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function requestProgress() { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateProgress); }
  window.addEventListener('scroll', requestProgress, { passive: true });
  window.addEventListener('resize', requestProgress);
  document.addEventListener('toggle', requestProgress, true);
  document.fonts?.ready.then(requestProgress);
  updateProgress();

  // The visual layer follows the same rule as the portfolio: observe a state,
  // make a move, then show the result. Everything is progressive enhancement;
  // the page remains readable if any of these effects are unavailable.
  const finePointer = window.matchMedia('(pointer: fine)');
  if (finePointer.matches) {
    let pointerFrame = 0;
    let pointerX = innerWidth * .72;
    let pointerY = innerHeight * .3;
    const paintPointer = () => {
      pointerFrame = 0;
      root.style.setProperty('--pointer-x', `${pointerX}px`);
      root.style.setProperty('--pointer-y', `${pointerY}px`);
      document.body.classList.add('has-pointer');
    };
    window.addEventListener('pointermove', event => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!pointerFrame) pointerFrame = requestAnimationFrame(paintPointer);
    }, { passive: true });
  }

  const revealTargets = [...new Set([
    ...document.querySelectorAll('main > .section, .proof-strip > a, .footer'),
    ...document.querySelectorAll('.thinking-grid article, .project-card, .project-note, .research-card, .skill-card, .timeline-item, .milestone-board, .puzzle-explorer, .wca-record, .education-card, .learning-list article, .community-grid article, .activity-panel, .contact-form')
  ])];
  const revealKinds = ['rise', 'left', 'right', 'zoom', 'soft'];
  revealTargets.forEach((element, index) => {
    element.classList.add('reveal', `reveal-${revealKinds[index % revealKinds.length]}`);
    if (index % 4) element.dataset.revealDelay = String(index % 4);
  });
  if (reduced.matches || !('IntersectionObserver' in window)) {
    revealTargets.forEach(element => element.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -9% 0px', threshold: .02 });
    revealTargets.forEach(element => revealObserver.observe(element));
  }

  const tiltTargets = [...document.querySelectorAll('.observatory, .project-card, .project-note, .research-card, .skill-card, .education-card, .milestone-board, .contact-form')];
  if (finePointer.matches && !reduced.matches) {
    tiltTargets.forEach(element => {
      element.addEventListener('pointermove', event => {
        if (root.dataset.motion === 'paused') return;
        const bounds = element.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - .5;
        const y = (event.clientY - bounds.top) / bounds.height - .5;
        element.style.setProperty('--tilt-x', `${(y * -3).toFixed(2)}deg`);
        element.style.setProperty('--tilt-y', `${(x * 3).toFixed(2)}deg`);
      });
      element.addEventListener('pointerleave', () => {
        element.style.setProperty('--tilt-x', '0deg');
        element.style.setProperty('--tilt-y', '0deg');
      });
    });
  }

  document.querySelectorAll('.button, .nav-cta, .text-button, .card-links a').forEach(element => {
    element.addEventListener('click', event => {
      const bounds = element.getBoundingClientRect();
      element.style.setProperty('--burst-x', `${event.clientX - bounds.left}px`);
      element.style.setProperty('--burst-y', `${event.clientY - bounds.top}px`);
      element.classList.remove('is-bursting');
      void element.offsetWidth;
      element.classList.add('is-bursting');
      window.setTimeout(() => element.classList.remove('is-bursting'), 700);
    });
  });

  if (window.PuzzleStudio?.View) {
    if (document.getElementById('hero-canvas')) try {
      const hero = new PuzzleStudio.View(document.getElementById('hero-canvas'), {
        hero: true, autoMoves: true,
        onChange(view, token) {
          const notation = document.getElementById('hero-notation');
          if (notation && token) notation.textContent = `${token.replace("'", '′')} / state transition`;
        }
      });
      let step = 0;
      document.getElementById('hero-move')?.addEventListener('click', async event => {
        const button = event.currentTarget;
        button.disabled = true;
        await hero.turn(['R', 'U', "R'", "U'"][step++ % 4]);
        button.disabled = false;
      });
    } catch (error) { console.warn('Using the static state-space illustration.', error); }

    const puzzleInfo = {
      '3': { kicker: '01 / The classic', name: '3×3×3 cube', description: 'A small object with an enormous state space. Each legal turn changes the permutation; the challenge is choosing a useful sequence.', math: '8! × 3⁷ × 12! × 2¹⁰', note: '43,252,003,274,489,856,000 reachable states.', mode: 'legal face turns', action: 'Make a move ↗' },
      '2': { kicker: '02 / Small, not simple', name: '2×2×2 cube', description: 'Eight corners. No edges to hide behind. A compact lesson in orientation, permutation, and why a smaller problem can still be interesting.', math: '7! × 3⁶ = 3,674,160', note: 'Distinct reachable states, treating whole-cube rotations as equivalent.', mode: 'legal face turns', action: 'Make a move ↗' },
      '4': { kicker: '03 / More layers, more structure', name: '4×4×4 cube', description: 'Centers move. Edges pair. Reduction becomes a strategy, and parity becomes a reminder that extra structure changes the problem.', math: '4³ − 2³ = 56', note: '56 surface cubies. 96 stickers. Explore outer and wide turns in the lab.', mode: 'legal face turns', action: 'Make a move ↗' },
      '5': { kicker: '04 / Scale the method', name: '5×5×5 cube', description: 'More centers, more edge pieces, and more opportunities to find reusable structure. Break the large state into manageable subproblems.', math: '5³ − 3³ = 98', note: '98 surface cubies. 150 stickers. The same turn model, more layers.', mode: 'legal face turns', action: 'Make a move ↗' },
      pyram: { kicker: '05 / A different symmetry', name: 'Pyraminx', description: 'A tetrahedron trades square faces for triangular geometry. The shape changes; the habit of recognizing structure and planning a sequence stays.', math: '120° × 3 = 360°', note: 'Threefold rotational symmetry. A kinetic geometry illustration.', mode: 'kinetic geometry illustration', action: 'Rotate the geometry ↗' },
      clock: { kicker: '06 / Everything is connected', name: 'Clock puzzle', description: 'Nine dials, four pins, and coupled motion. A beautifully tangible way to think about systems, modular arithmetic, and the effect of one action on many variables.', math: 't ≡ t + 12  (mod 12)', note: 'A modular-time illustration, rather than a full Clock solving simulator.', mode: 'coupled-dial illustration', action: 'Turn the dials ↗' }
    };
    if (document.getElementById('puzzle-canvas')) try {
      const explorer = new PuzzleStudio.View(document.getElementById('puzzle-canvas'), { type: '3' });
      const tabs = [...document.querySelectorAll('.puzzle-tabs [role="tab"]')];
      const button = document.getElementById('puzzle-move');
      const panel = document.getElementById('puzzle-panel');
      let moveStep = 0;
      function selectPuzzle(tab) {
        const type = tab.dataset.puzzle;
        const info = puzzleInfo[type];
        tabs.forEach(other => {
          const selected = other === tab;
          other.setAttribute('aria-selected', String(selected));
          other.tabIndex = selected ? 0 : -1;
        });
        panel.setAttribute('aria-labelledby', tab.id);
        const fields = { 'puzzle-kicker': info.kicker, 'puzzle-name': info.name, 'puzzle-description': info.description, 'puzzle-math': info.math, 'puzzle-math-note': info.note, 'puzzle-visual-mode': info.mode };
        Object.entries(fields).forEach(([id, value]) => { document.getElementById(id).textContent = value; });
        button.textContent = info.action;
        button.disabled = false;
        panel.querySelector('.puzzle-actions a').href = `interactive-lab.html?puzzle=${type}`;
        moveStep = 0;
        explorer.setType(type);
      }
      tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => selectPuzzle(tab));
        tab.addEventListener('keydown', event => {
          let next = index;
          if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
          else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = tabs.length - 1;
          else return;
          event.preventDefault();
          selectPuzzle(tabs[next]); tabs[next].focus();
        });
      });
      button.addEventListener('click', async () => {
        button.disabled = true;
        if (Number(explorer.type)) await explorer.turn(['R', 'U', 'F', "R'", "U'"][moveStep++ % 5]);
        else await explorer.illustrate();
        button.disabled = false;
      });
    } catch (error) { console.warn('Using the static puzzle illustration.', error); }
  }

  const skillCards = [...document.querySelectorAll('[data-skill-domain]')];
  const filters = [...document.querySelectorAll('[data-skill-filter]')];
  filters.forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.skillFilter;
    filters.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    skillCards.forEach(card => { card.hidden = filter !== 'all' && card.dataset.skillDomain !== filter; });
    const count = skillCards.filter(card => !card.hidden).length;
    document.getElementById('skill-filter-status').textContent = `Showing ${count} skill domains: ${button.textContent}.`;
    requestProgress();
  }));

  const activityPanel = document.getElementById('activity-panel');
  async function loadCalendar() {
    const count = document.getElementById('ghContribCount');
    const calendar = document.getElementById('ghCalendar');
    const caption = document.getElementById('gh-calendar-caption');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch('https://github-contributions-api.jogruber.de/v4/Mithil-7?y=last', { signal: controller.signal });
      if (!response.ok) throw new Error('Calendar unavailable');
      const data = await response.json();
      if (!Array.isArray(data.contributions) || !data.contributions.length) throw new Error('No calendar data');
      const total = data.contributions.reduce((sum, day) => sum + (Number(day.count) || 0), 0);
      const graph = document.createElement('div');
      graph.className = 'gh-calendar';
      graph.setAttribute('role', 'img');
      graph.setAttribute('aria-label', `${total.toLocaleString()} GitHub contributions in the displayed year`);
      const colors = ['#25333e', '#315c53', '#39856c', '#55b98b', '#81e5bd'];
      let week = null;
      data.contributions.forEach((day, index) => {
        const weekday = new Date(`${day.date}T12:00:00Z`).getUTCDay();
        if (!Number.isFinite(weekday)) return;
        if (!week || weekday === 0) { week = document.createElement('div'); week.className = 'gh-week'; graph.appendChild(week); }
        if (index === 0) for (let pad = 0; pad < weekday; pad += 1) {
          const blank = document.createElement('span'); blank.className = 'gh-day'; blank.style.visibility = 'hidden'; week.appendChild(blank);
        }
        const cell = document.createElement('span');
        cell.className = 'gh-day';
        cell.style.background = colors[Math.max(0, Math.min(4, Math.floor(Number(day.level) || 0)))];
        cell.title = `${Number(day.count) || 0} contributions on ${day.date}`;
        week.appendChild(cell);
      });
      calendar.replaceChildren(graph);
      count.textContent = `${total.toLocaleString()} contributions / displayed year`;
      caption.textContent = 'Live public GitHub calendar / open profile for details';
    } catch (_) {
      count.textContent = 'Current activity available on GitHub ↗';
      caption.textContent = 'Snapshot: Sep 28, 2026 / live feed unavailable';
    } finally { clearTimeout(timeout); requestProgress(); }
  }
  if (activityPanel && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); loadCalendar(); }
    }, { rootMargin: '250px' });
    observer.observe(activityPanel);
  } else if (activityPanel) loadCalendar();

  document.getElementById('copy-email')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    const status = document.getElementById('copy-status');
    try {
      await navigator.clipboard.writeText('mithilcuber@gmail.com');
      button.textContent = 'Copied ✓';
      status.textContent = 'Email address copied to clipboard.';
      setTimeout(() => { button.textContent = 'Copy email'; }, 2500);
    } catch (_) {
      status.textContent = 'Copy is unavailable. Use the email link to open your email app.';
      button.textContent = 'Use the email link ↑';
    }
  });
  const form = document.getElementById('contact-form');
  form?.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const message = String(data.get('message') || '').trim();
    const subject = String(data.get('subject') || '').trim() || 'Portfolio enquiry';
    const status = document.getElementById('contact-form-status');
    if (!name || !message) { status.textContent = 'Please include your name and a message.'; return; }
    const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
    status.textContent = 'Opening your email app with a draft. Send it there when ready.';
    window.location.href = `mailto:mithilcuber@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
})();
