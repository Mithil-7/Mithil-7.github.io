/* Original, dependency-free puzzle geometry. Cube stickers use integer coordinates;
   face turns are real permutations, independent of the animation and camera. */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;
  const COLORS = { U: '#f1ce76', D: '#edf1e9', F: '#77d5a7', B: '#82aef0', R: '#ec7b81', L: '#efa970' };
  const NORMALS = { U: [0, 1, 0], D: [0, -1, 0], F: [0, 0, 1], B: [0, 0, -1], R: [1, 0, 0], L: [-1, 0, 0] };
  const SPECS = {
    U: { axis: 1, layer: 1, direction: -1 }, D: { axis: 1, layer: -1, direction: 1 },
    R: { axis: 0, layer: 1, direction: -1 }, L: { axis: 0, layer: -1, direction: 1 },
    F: { axis: 2, layer: 1, direction: -1 }, B: { axis: 2, layer: -1, direction: 1 }
  };
  const add = (a, b) => a.map((value, i) => value + b[i]);
  const multiply = (a, k) => a.map(value => value * k);
  const subtract = (a, b) => a.map((value, i) => value - b[i]);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const ease = value => value < .5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;

  function rotate(vector, axis, angle) {
    const [x, y, z] = vector;
    const c = Math.cos(angle), s = Math.sin(angle);
    if (axis === 0) return [x, c * y - s * z, s * y + c * z];
    if (axis === 1) return [c * x + s * z, y, -s * x + c * z];
    return [c * x - s * y, s * x + c * y, z];
  }

  function parseMove(token, size = 3) {
    const match = /^([UDRLFB])(w)?(2|['′])?$/.exec(token);
    if (!match) throw new Error(`Invalid face turn: ${token}`);
    if (match[2] && size < 3) throw new Error('Wide turns require a cube with at least three layers.');
    const spec = SPECS[match[1]];
    const turns = match[3] === '2' ? 2 : match[3] ? -1 : 1;
    return { ...spec, face: match[1], wide: Boolean(match[2]), turns, angle: spec.direction * turns * Math.PI / 2 };
  }

  function inverseMove(token) {
    if (token.endsWith('2')) return token;
    return /['′]$/.test(token) ? token.slice(0, -1) : `${token}'`;
  }

  class CubeState {
    constructor(size = 3) {
      if (!Number.isInteger(size) || size < 2 || size > 5) throw new Error('Cube size must be 2, 3, 4, or 5.');
      this.size = size;
      this.reset();
    }

    reset() {
      this.stickers = [];
      const edge = this.size - 1;
      for (const [face, normal] of Object.entries(NORMALS)) {
        const axis = normal.findIndex(value => value !== 0);
        const tangents = [0, 1, 2].filter(index => index !== axis);
        for (let row = 0; row < this.size; row += 1) {
          for (let col = 0; col < this.size; col += 1) {
            const pos = [0, 0, 0];
            pos[axis] = normal[axis] * edge;
            pos[tangents[0]] = row * 2 - edge;
            pos[tangents[1]] = col * 2 - edge;
            this.stickers.push({ pos, normal: normal.slice(), face, color: COLORS[face] });
          }
        }
      }
    }

    selected(sticker, spec) {
      const distance = sticker.pos[spec.axis] * spec.layer;
      return distance === this.size - 1 || (spec.wide && distance === this.size - 3);
    }

    move(token) {
      const spec = parseMove(token, this.size);
      for (const sticker of this.stickers) {
        if (!this.selected(sticker, spec)) continue;
        sticker.pos = rotate(sticker.pos, spec.axis, spec.angle).map(value => Math.round(value) || 0);
        sticker.normal = rotate(sticker.normal, spec.axis, spec.angle).map(value => Math.round(value) || 0);
      }
    }

    isSolved() {
      const faceColors = new Map();
      for (const sticker of this.stickers) {
        const key = sticker.normal.join(',');
        if (faceColors.has(key) && faceColors.get(key) !== sticker.color) return false;
        faceColors.set(key, sticker.color);
      }
      return true;
    }

    signature() {
      return this.stickers.map(sticker => `${sticker.pos.join(',')}/${sticker.normal.join(',')}/${sticker.face}`).sort().join('|');
    }
  }

  const API = { CubeState, parseMove, inverseMove };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  global.PuzzleStudio = API;
  if (typeof document === 'undefined') return;

  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const views = new Set();
  let frame = 0;
  let palette = null;
  const canAnimate = () => !motionPreference.matches && document.documentElement.dataset.motion !== 'paused' && !document.hidden;

  function getPalette() {
    if (palette) return palette;
    const style = getComputedStyle(document.documentElement);
    palette = {
      accent: style.getPropertyValue('--accent').trim() || '#81e5bd',
      line: style.getPropertyValue('--line').trim() || '#293543',
      muted: style.getPropertyValue('--muted').trim() || '#a0aebd',
      light: document.documentElement.dataset.theme === 'light'
    };
    return palette;
  }

  function schedule() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
  }

  function tick(now) {
    frame = 0;
    let again = false;
    for (const view of views) {
      if (!view.visible) continue;
      again = view.tick(now) || again;
    }
    if (again) schedule();
  }

  function camera(point, pose) {
    return rotate(rotate(point, 1, pose.yaw), 0, pose.pitch);
  }

  function polygon(ctx, points, color, stroke, width = 1) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (const point of points.slice(1)) ctx.lineTo(point[0], point[1]);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  }

  function drawCube(ctx, model, pose, cx, cy, scale, active = null) {
    const project = point => {
      const p = camera(point, pose);
      const perspective = 5.8 / (5.8 - p[2]);
      return [cx + p[0] * scale * perspective, cy - p[1] * scale * perspective, p[2]];
    };
    const polygons = [];
    for (const sticker of model.stickers) {
      const affected = active && model.selected(sticker, active.spec);
      const angle = affected ? active.spec.angle * ease(active.progress) : 0;
      let normal = sticker.normal;
      if (affected) normal = rotate(normal, active.spec.axis, angle);
      const viewNormal = camera(normal, pose);
      if (viewNormal[2] < .015) continue;
      const u = sticker.normal[0] ? [0, 1, 0] : [1, 0, 0];
      const v = cross(sticker.normal, u);
      const center = add(sticker.pos, sticker.normal);
      const corners = padding => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => {
        let point = add(center, add(multiply(u, a * padding), multiply(v, b * padding)));
        point = multiply(point, 1 / model.size);
        if (affected) point = rotate(point, active.spec.axis, angle);
        return project(point);
      });
      const background = corners(.994);
      const face = corners(.875);
      polygons.push({ background, face, depth: background.reduce((sum, point) => sum + point[2], 0) / 4, color: sticker.color, shade: clamp(1 - viewNormal[2], 0, .8) });
    }
    polygons.sort((a, b) => a.depth - b.depth);
    for (const tile of polygons) {
      polygon(ctx, tile.background, '#111b24', '#25303b', .6);
      polygon(ctx, tile.face, tile.color, '#ffffff22', .65);
      if (tile.shade > .1) polygon(ctx, tile.face, `rgba(4, 12, 20, ${tile.shade * .18})`);
      ctx.beginPath();
      ctx.moveTo(tile.face[0][0], tile.face[0][1]);
      ctx.lineTo(tile.face[1][0], tile.face[1][1]);
      ctx.strokeStyle = '#ffffff45';
      ctx.lineWidth = Math.max(.5, scale / 140);
      ctx.stroke();
    }
  }

  function drawPyraminx(ctx, pose, cx, cy, scale) {
    const vertices = [[0, 1.35, 0], [-1.18, -.76, .68], [1.18, -.76, .68], [0, -.76, -1.36]];
    const faces = [[0, 1, 2], [0, 2, 3], [0, 3, 1], [1, 3, 2]];
    const colors = ['#ec7b81', '#f1ce76', '#82aef0', '#77d5a7'];
    const triangles = [];
    faces.forEach((face, faceIndex) => {
      const [a, b, c] = face.map(index => vertices[index]);
      const n = camera(cross(subtract(b, a), subtract(c, a)), pose);
      if (n[2] < 0) return;
      const point = (i, j) => add(a, add(multiply(subtract(b, a), i / 3), multiply(subtract(c, a), j / 3)));
      const store = triangle => {
        const center = multiply(triangle.reduce((sum, p) => add(sum, p), [0, 0, 0]), 1 / 3);
        const outer = triangle.map(p => camera(p, pose));
        const inner = triangle.map(p => camera(add(center, multiply(subtract(p, center), .91)), pose));
        const projection = p => [cx + p[0] * scale, cy - p[1] * scale];
        triangles.push({ outer: outer.map(projection), inner: inner.map(projection), color: colors[faceIndex], depth: outer.reduce((sum, p) => sum + p[2], 0) / 3 });
      };
      for (let i = 0; i < 3; i += 1) {
        for (let j = 0; j < 3 - i; j += 1) {
          store([point(i, j), point(i + 1, j), point(i, j + 1)]);
          if (i + j < 2) store([point(i + 1, j), point(i + 1, j + 1), point(i, j + 1)]);
        }
      }
    });
    triangles.sort((a, b) => a.depth - b.depth);
    triangles.forEach(triangle => {
      polygon(ctx, triangle.outer, '#111b24', '#25303b', .5);
      polygon(ctx, triangle.inner, triangle.color, '#ffffff30', .7);
    });
  }

  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, width, height, radius);
    else ctx.rect(x, y, width, height);
  }

  function drawClock(ctx, cx, cy, scale, phase, light = false, tilt = -.05, pose = null) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tilt);
    ctx.scale(scale, scale);
    if (pose) {
      // Orthographic projection of the dial plate: camera controls change its
      // orientation just as they do for the solid cube and tetrahedron models.
      ctx.transform(Math.cos(pose.yaw), -Math.sin(pose.yaw) * Math.sin(pose.pitch), 0, Math.cos(pose.pitch), 0, 0);
    }
    roundRect(ctx, -1.4, -1.5, 2.8, 3, .24);
    ctx.fillStyle = '#172f43'; ctx.fill();
    ctx.strokeStyle = '#82aef0'; ctx.lineWidth = .035; ctx.stroke();
    roundRect(ctx, -1.29, -1.39, 2.58, 2.78, .18);
    ctx.fillStyle = '#23435e'; ctx.fill();
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const x = (col - 1) * .84, y = (row - 1) * .84;
        ctx.beginPath(); ctx.arc(x, y, .355, 0, TAU);
        ctx.fillStyle = light ? '#ecefe9' : '#dce4dd'; ctx.fill();
        ctx.strokeStyle = '#07121a'; ctx.lineWidth = .028; ctx.stroke();
        for (let tick = 0; tick < 12; tick += 1) {
          const a = tick / 12 * TAU;
          ctx.beginPath();
          ctx.moveTo(x + Math.sin(a) * .28, y - Math.cos(a) * .28);
          ctx.lineTo(x + Math.sin(a) * .31, y - Math.cos(a) * .31);
          ctx.strokeStyle = '#41536a'; ctx.lineWidth = tick % 3 === 0 ? .025 : .012; ctx.stroke();
        }
        const angle = (phase + row * 2 + col * 3) * TAU / 12;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.lineTo(x + Math.sin(angle) * .235, y - Math.cos(angle) * .235);
        ctx.strokeStyle = '#bd6741'; ctx.lineWidth = .043; ctx.lineCap = 'round'; ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, .04, 0, TAU); ctx.fillStyle = '#b86435'; ctx.fill();
      }
    }
    for (const x of [-.42, .42]) for (const y of [-.42, .42]) {
      ctx.beginPath(); ctx.arc(x, y, .07, 0, TAU); ctx.fillStyle = '#f1ce76'; ctx.fill();
      ctx.strokeStyle = '#795929'; ctx.lineWidth = .02; ctx.stroke();
    }
    for (const x of [-1.52, 1.52]) {
      roundRect(ctx, x - .06, -.8, .12, .36, .025);
      ctx.fillStyle = '#f1ce76'; ctx.fill();
      roundRect(ctx, x - .06, .44, .12, .36, .025); ctx.fill();
    }
    ctx.restore();
  }

  class View {
    constructor(canvas, options = {}) {
      if (!canvas) throw new Error('A canvas is required.');
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      if (!this.ctx) throw new Error('2D canvas is unavailable.');
      this.hero = Boolean(options.hero);
      this.type = options.type || '3';
      this.model = new CubeState(Number(this.type) || 3);
      this.miniCube = new CubeState(2);
      this.history = [];
      this.active = null;
      this.rotate = options.rotate !== false;
      this.autoMoves = Boolean(options.autoMoves);
      this.interactive = Boolean(options.interactive);
      this.onChange = options.onChange || (() => {});
      this.yaw = -.6;
      this.pitch = .43;
      this.visualPhase = 0;
      this.visualTween = null;
      this.visible = true;
      this.dirty = true;
      this.time = 0;
      this.lastTick = 0;
      this.lastDraw = 0;
      this.nextMove = 0;
      this.autoStep = 0;
      this.dragging = false;
      this.preview = options.preview || false;
      this.resize = this.resize.bind(this);
      this.resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(this.resize) : null;
      this.resizeObserver?.observe(canvas);
      if (!this.resizeObserver) window.addEventListener('resize', this.resize);
      this.observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
        this.visible = entries[0].isIntersecting;
        if (!this.visible) this.finish();
        this.lastTick = 0;
        if (this.visible) { this.dirty = true; schedule(); }
      }, { rootMargin: '50px' }) : null;
      this.observer?.observe(canvas);
      views.add(this);
      this.resize();
      if (this.interactive) this.attachPointer();
      canvas.parentElement.classList.add('canvas-ready');
      document.fonts?.ready.then(() => { this.dirty = true; schedule(); });
    }

    resize() {
      const bounds = this.canvas.getBoundingClientRect();
      this.width = bounds.width || 560;
      this.height = bounds.height || 440;
      this.ratio = Math.min(window.devicePixelRatio || 1, 1.8);
      this.canvas.width = Math.round(this.width * this.ratio);
      this.canvas.height = Math.round(this.height * this.ratio);
      this.dirty = true;
      schedule();
    }

    setType(type) {
      if (!['2', '3', '4', '5', 'pyram', 'clock'].includes(String(type))) return;
      this.finish();
      if (this.visualTween) this.visualTween.resolve(true);
      this.type = String(type);
      this.model = new CubeState(Number(type) || 3);
      this.history = [];
      this.visualPhase = 0;
      this.visualTween = null;
      this.yaw = -.6;
      this.pitch = .43;
      this.dirty = true;
      this.onChange(this);
      schedule();
    }

    turn(token, record = true) {
      if (this.active) return Promise.resolve(false);
      if (this.type === 'pyram' || this.type === 'clock') return this.illustrate();
      const spec = parseMove(token, this.model.size);
      if (!canAnimate() || !this.visible) {
        this.model.move(token);
        if (record) this.history.push(token);
        this.dirty = true;
        this.onChange(this, token);
        schedule();
        return Promise.resolve(true);
      }
      return new Promise(resolve => {
        this.active = { token, spec, record, resolve, start: performance.now(), progress: 0 };
        this.dirty = true;
        this.onChange(this, token);
        schedule();
      });
    }

    finish() {
      if (!this.active) return;
      const { token, record, resolve } = this.active;
      this.model.move(token);
      if (record) this.history.push(token);
      this.active = null;
      this.dirty = true;
      this.onChange(this, token);
      resolve(true);
    }

    illustrate() {
      const step = this.type === 'clock' ? 3 : TAU / 3;
      if (this.visualTween) return Promise.resolve(false);
      if (!canAnimate() || !this.visible) {
        this.visualPhase += step;
        this.dirty = true; schedule(); return Promise.resolve(true);
      }
      return new Promise(resolve => {
        this.visualTween = { start: performance.now(), from: this.visualPhase, to: this.visualPhase + step, resolve };
        schedule();
      });
    }

    reset() {
      this.finish();
      this.model.reset();
      this.history = [];
      this.visualPhase = 0;
      if (this.visualTween) { this.visualTween.resolve(true); this.visualTween = null; }
      this.yaw = -.6;
      this.pitch = .43;
      this.dirty = true;
      this.onChange(this);
      schedule();
    }

    setRotation(value) {
      this.rotate = Boolean(value);
      this.dirty = true;
      schedule();
    }

    adjustView(yaw = 0, pitch = 0) {
      this.yaw += yaw;
      this.pitch = clamp(this.pitch + pitch, -1.35, 1.35);
      this.dirty = true;
      schedule();
    }

    resetView() {
      this.yaw = -.6;
      this.pitch = .43;
      this.dirty = true;
      schedule();
    }

    tick(now) {
      const animated = canAnimate();
      if (this.lastTick) this.time += Math.min(now - this.lastTick, 60) / 1000;
      this.lastTick = now;
      if (this.active) {
        this.active.progress = animated ? clamp((now - this.active.start) / 660, 0, 1) : 1;
        if (this.active.progress >= 1) this.finish();
        this.dirty = true;
      }
      if (this.visualTween) {
        const tween = this.visualTween;
        const progress = animated ? clamp((now - tween.start) / 800, 0, 1) : 1;
        this.visualPhase = tween.from + (tween.to - tween.from) * ease(progress);
        if (progress >= 1) { tween.resolve(true); this.visualTween = null; }
        this.dirty = true;
      }
      if (animated && this.autoMoves && !this.active && now >= this.nextMove) {
        const sequence = ['R', 'U', "R'", "U'"];
        this.nextMove = now + 2600;
        this.turn(sequence[this.autoStep++ % sequence.length]);
      }
      if (this.dirty || (animated && (this.rotate || this.hero) && now - this.lastDraw >= 33)) {
        this.draw(animated);
        this.dirty = false;
        this.lastDraw = now;
      }
      return Boolean(this.active || this.visualTween || (animated && (this.rotate || this.hero || this.autoMoves)));
    }

    draw(animated) {
      const ctx = this.ctx;
      const width = this.hero ? 640 : 560;
      const height = this.hero ? 580 : 440;
      const unit = Math.min(this.width / width, this.height / height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.setTransform(unit * this.ratio, 0, 0, unit * this.ratio, (this.width - width * unit) / 2 * this.ratio, (this.height - height * unit) / 2 * this.ratio);
      const { accent, line, muted, light } = getPalette();
      const phase = animated ? this.time : 0;
      const cx = width / 2, cy = this.hero ? 285 : 205;
      const orbit = this.rotate && !this.dragging && animated ? Math.sin(phase * .18) * .16 : 0;
      const pose = { yaw: this.yaw + orbit, pitch: this.pitch + (this.rotate && animated ? Math.cos(phase * .2) * .025 : 0) };

      ctx.save(); ctx.translate(cx, cy + (this.hero ? 138 : 125)); ctx.scale(1, .2);
      const shadow = ctx.createRadialGradient(0, 0, 5, 0, 0, 150);
      shadow.addColorStop(0, light ? '#254d2a26' : '#00000088'); shadow.addColorStop(1, '#00000000');
      ctx.fillStyle = shadow; ctx.beginPath(); ctx.arc(0, 0, 150, 0, TAU); ctx.fill(); ctx.restore();

      if (this.hero) this.drawOrbits(ctx, phase, accent, line, muted);
      if (this.type === 'pyram') drawPyraminx(ctx, { ...pose, yaw: pose.yaw + this.visualPhase }, cx, cy + 8, 112);
      else if (this.type === 'clock') drawClock(ctx, cx, cy + 12, 83, this.visualPhase, light, -.045 + (animated ? Math.sin(phase * .3) * .018 : 0), { yaw: pose.yaw + .6, pitch: pose.pitch - .43 });
      else drawCube(ctx, this.model, pose, cx, cy, this.hero ? 99 : 92, this.active);

      if (this.hero) {
        drawCube(ctx, this.miniCube, { yaw: -.5, pitch: .4 }, 509, 126 + Math.sin(phase * .7) * 4, 21);
        drawPyraminx(ctx, { yaw: -.35, pitch: .08 }, 105, 378 + Math.sin(phase * .6) * 5, 26);
        drawClock(ctx, 492, 425 + Math.sin(phase * .5) * 4, 18, phase * .15);
        ctx.font = '9px "DM Mono", monospace'; ctx.fillStyle = muted;
        ctx.fillText('2×2 / permutations', 458, 86);
        ctx.fillText('PYRAMINX', 68, 437);
        ctx.fillText('CLOCK / modular time', 426, 481);
      } else {
        ctx.strokeStyle = line; ctx.lineWidth = .75;
        ctx.beginPath(); ctx.ellipse(cx, cy + 146, 167, 29, 0, 0, TAU); ctx.stroke();
        ctx.font = '10px "DM Mono", monospace'; ctx.fillStyle = muted;
        if (Number(this.type)) {
          ctx.fillText(`${this.model.size}³ geometry / ${this.model.size ** 2 * 6} stickers`, 26, 40);
          ctx.textAlign = 'right'; ctx.fillText(this.model.isSolved() ? 'ORDER' : 'SEARCH SPACE', width - 26, 40); ctx.textAlign = 'left';
        } else ctx.fillText(this.type === 'pyram' ? 'tetrahedral symmetry / 120°' : 'nine dials / arithmetic mod 12', 26, 40);
      }
    }

    drawOrbits(ctx, phase, accent, line, muted) {
      ctx.strokeStyle = line; ctx.lineWidth = .9;
      const ellipses = [[252, 149, -.36], [244, 122, .6], [151, 231, .32]];
      for (const [rx, ry, rotation] of ellipses) {
        ctx.beginPath(); ctx.ellipse(320, 285, rx, ry, rotation, 0, TAU); ctx.stroke();
        const angle = phase * .16 + rotation * 4;
        const x = Math.cos(angle) * rx, y = Math.sin(angle) * ry;
        const px = 320 + x * Math.cos(rotation) - y * Math.sin(rotation);
        const py = 285 + x * Math.sin(rotation) + y * Math.cos(rotation);
        ctx.beginPath(); ctx.arc(px, py, 3, 0, TAU); ctx.fillStyle = accent; ctx.fill();
      }
      ctx.setLineDash([1, 10]); ctx.beginPath(); ctx.arc(320, 285, 254, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = .55;
      for (let i = 0; i < 28; i += 1) {
        const angle = i * TAU / 28 + phase * .015;
        const x = 320 + Math.cos(angle) * (220 + i % 3 * 10);
        const y = 285 + Math.sin(angle) * (211 + i % 4 * 7);
        ctx.fillStyle = i % 4 === 0 ? accent : muted;
        ctx.font = '7px "DM Mono", monospace';
        ctx.fillText(String((i * 37) % 97).padStart(2, '0'), x, y);
      }
      ctx.globalAlpha = 1;
      ctx.font = '12px "DM Mono", monospace'; ctx.fillStyle = accent;
      ctx.fillText('∇θ J(θ)', 57, 178);
      ctx.fillStyle = muted; ctx.font = '10px "DM Mono", monospace';
      ctx.fillText('P(s′ | s, a)', 393, 325);
      ctx.fillText('γ ∈ [0, 1)', 192, 504);
      ctx.strokeStyle = accent; ctx.globalAlpha = .4;
      for (const [x, y] of [[60, 252], [577, 314], [312, 51]]) {
        ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    attachPointer() {
      let pointer = null;
      const canvas = this.canvas;
      canvas.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        this.dragging = true;
        pointer = { x: event.clientX, y: event.clientY };
        canvas.setPointerCapture(event.pointerId);
      });
      canvas.addEventListener('pointermove', event => {
        if (!this.dragging || !pointer) return;
        this.yaw += (event.clientX - pointer.x) * .008;
        this.pitch = clamp(this.pitch + (event.clientY - pointer.y) * .008, -1.35, 1.35);
        pointer = { x: event.clientX, y: event.clientY };
        this.dirty = true; schedule();
      });
      const release = event => {
        this.dragging = false; pointer = null;
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      };
      canvas.addEventListener('pointerup', release);
      canvas.addEventListener('pointercancel', release);
      canvas.addEventListener('lostpointercapture', () => { this.dragging = false; pointer = null; });
    }
  }

  function refresh() {
    for (const view of views) {
      view.lastTick = 0;
      view.dirty = true;
      if (!canAnimate()) {
        view.finish();
        if (view.visualTween) {
          view.visualPhase = view.visualTween.to;
          view.visualTween.resolve(true);
          view.visualTween = null;
        }
      }
    }
    schedule();
  }
  motionPreference.addEventListener('change', refresh);
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('portfolio:motion', refresh);
  window.addEventListener('portfolio:theme', () => { palette = null; refresh(); });
  API.View = View;
  API.canAnimate = canAnimate;
  API.refresh = refresh;
})(typeof globalThis !== 'undefined' ? globalThis : window);
