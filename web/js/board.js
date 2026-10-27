/* Dhara Rakshak — board geometry, space layout and SVG rendering.
 * Coordinates are pixels of assets/board.jpg (1110 x 722), which is the header + board
 * area cropped from the original board picture. The track is redrawn on top of the
 * painted path so every space is interactive. */
(function (DR) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const VIEW_W = 1110;
  const VIEW_H = 722;

  // Centre-line of the painted path, START side first.
  const TRACK = [
    [108, 280], [135, 268], [190, 256], [242, 251], [295, 257], [345, 280], [395, 305], [450, 333],
    [510, 332], [572, 308], [600, 287], [632, 265], [677, 264], [727, 281], [775, 308], [825, 328],
    [880, 346], [935, 368], [985, 398], [1015, 445], [1008, 515], [958, 556], [887, 570], [829, 571],
    [765, 577], [705, 584], [642, 580], [587, 562], [537, 522], [480, 490], [415, 480], [345, 481],
    [275, 469], [220, 455], [160, 445], [100, 455], [52, 482], [37, 532], [62, 585], [120, 625],
    [187, 650], [257, 668], [325, 681], [387, 688], [450, 691], [525, 692], [585, 692], [650, 692],
    [720, 691], [790, 688], [860, 683], [925, 676],
  ];
  // (The bottom run sits a little above the painted one so its tiles are not clipped by the frame.)

  const BAND_WIDTH = 70;     // parchment band painted under the tiles
  const TILE_HEIGHT = 56;    // tile size across the track
  const TILE_GAP = 2.2;      // half-gap between neighbouring tiles

  const START_SPOT = { x: 99, y: 400 };
  const FINISH_SPOT = { x: 1017, y: 712 };

  // Space types. `kind` drives the game rules; colours follow the board legend and decks.
  const SPACE_TYPES = {
    start: { kind: 'start', label: 'START', desc: 'Every Dhara Rakshak begins here with 5 Shakti Tokens.' },
    finish: { kind: 'finish', label: 'FINISH', desc: 'Complete the Grand Green Challenge to qualify for victory.' },
    math: { kind: 'subject', deck: 'math', label: 'Mathematics Challenge', color: '#f2bf26', ink: '#3b2a00', glyph: 'π', desc: 'Draw a Mathematics card. Correct answer: 2 Shakti Tokens.' },
    science: { kind: 'subject', deck: 'science', label: 'Science Challenge', color: '#3f9e4a', ink: '#ffffff', icon: 'flask', desc: 'Draw a Science card. Correct answer: 2 Shakti Tokens.' },
    english: { kind: 'subject', deck: 'english', label: 'English Challenge', color: '#2878d6', ink: '#ffffff', icon: 'book', desc: 'Draw an English card. Correct answer: 2 Shakti Tokens.' },
    hindi: { kind: 'subject', deck: 'hindi', label: 'Hindi Challenge', color: '#9a5bd6', ink: '#ffffff', glyph: 'अ', desc: 'Draw a Hindi card. Correct answer: 2 Shakti Tokens.' },
    social: { kind: 'subject', deck: 'social', label: 'Social Science Challenge', color: '#f0821e', ink: '#ffffff', icon: 'columns', desc: 'Draw a Social Science card. Correct answer: 2 Shakti Tokens.' },
    memory: { kind: 'skill', deck: 'memory', label: 'Memory Grove', color: '#e2569d', ink: '#ffffff', icon: 'brain', desc: 'Complete a memory task. Success: 2 tokens; failure: no reward.' },
    concentration: { kind: 'skill', deck: 'concentration', label: 'Concentration Cave', color: '#2a9fd8', ink: '#ffffff', icon: 'eye', desc: 'Complete an observation or pattern task in time. Success: 2 tokens.' },
    action: { kind: 'skill', deck: 'action', label: 'Action Space', color: '#e23c32', ink: '#ffffff', icon: 'run', desc: 'Mime, draw, sing or move. Success: 2 tokens.' },
    eco: { kind: 'eco', deck: 'eco', label: 'Eco-Mission', color: '#9fca34', ink: '#203a05', icon: 'bulb', desc: 'Solve a real-world environmental problem. Success: 2 tokens + 1 bonus for a practical, creative solution. Failure: move back 2 spaces and take one Karma marker.' },
    rishi: { kind: 'rishi', deck: 'rishi', label: 'Rishi Gyaan', color: '#a8692e', ink: '#ffe7a8', icon: 'diya', desc: 'Answer a wisdom or responsibility question. Success: 2 tokens. No penalty for failure.' },
    teamwork: { kind: 'teamwork', deck: 'teamwork', label: 'Teamwork Bridge', color: '#3a4fc0', ink: '#ffffff', icon: 'people', desc: 'Everyone collaborates. If the team succeeds, each player who contributed earns 1 token.' },
    shortcut: { kind: 'shortcut', label: 'Shortcut', color: '#1f7a3a', ink: '#ffffff', icon: 'forward', desc: 'Move forward 2 additional spaces. The destination is not activated.' },
    setback: { kind: 'setback', label: 'Setback', color: '#a3231b', ink: '#ffffff', icon: 'back', desc: 'Move back 1–3 spaces as marked. The destination is not activated. A Mahashakti Emblem can cancel it.' },
    grace: { kind: 'grace', label: 'Divine Grace', color: '#fbd3e2', ink: '#c2185b', icon: 'lotus', desc: 'Choose 2 Shakti Tokens or remove one Karma marker.' },
    karmaPit: { kind: 'karmaPit', label: 'Karma Pit', color: '#4a1322', ink: '#ff9c6e', icon: 'storm', desc: 'Lose 2 Shakti Tokens. If you cannot pay in full, surrender what you have and take one Karma marker.' },
    tapasya: { kind: 'tapasya', label: 'Tapasya Portal', color: '#2a1a10', ink: '#ffb347', icon: 'flame', medallion: true, desc: 'Optionally risk 3 tokens on a three-stage, 2-minute trial. Win 8 tokens and move 3 forward.' },
    mahashakti: { kind: 'mahashakti', label: 'Mahashakti Portal', color: '#1c1030', ink: '#ffd54f', icon: 'lotus', medallion: true, desc: 'Rare, one-use portal. Risk 4 tokens (need 6+, no Karma) on a five-stage, 3-minute challenge. Win 12 tokens, 6 spaces and an Emblem.' },
  };

  // The 53 spaces between START and FINISH (rulebook section 17 distribution).
  const LAYOUT = [
    'math', 'science', 'english', 'eco', 'hindi', 'shortcut', 'social', 'rishi', 'karmaPit', 'memory',
    'setback:1', 'teamwork', 'action', 'tapasya', 'math', 'concentration', 'science', 'grace', 'english', 'eco',
    'hindi', 'mahashakti', 'social', 'shortcut', 'memory', 'rishi', 'karmaPit', 'math', 'teamwork', 'science',
    'setback:2', 'english', 'action', 'eco', 'concentration', 'mahashakti', 'hindi', 'social', 'karmaPit', 'math',
    'teamwork', 'tapasya', 'memory', 'shortcut', 'grace', 'science', 'setback:3', 'english', 'mahashakti', 'action',
    'rishi', 'hindi', 'social',
  ];

  // Realms in the order the track visits them (index ranges are space numbers).
  const REALMS = [
    { n: 1, key: 'prithvi', name: 'Prithvi', theme: 'Earth and land', tagline: 'Care for the Land', mission: 'Protect soil and natural resources', from: 1, to: 7 },
    { n: 2, key: 'jal', name: 'Jal', theme: 'Water', tagline: 'Protect the Waters', mission: 'Conserve rivers and freshwater', from: 8, to: 11 },
    { n: 3, key: 'vayu', name: 'Vayu', theme: 'Air', tagline: 'Clean the Air', mission: 'Reduce air pollution', from: 12, to: 16 },
    { n: 4, key: 'agni', name: 'Agni', theme: 'Fire and energy', tagline: 'Use Energy Wisely', mission: 'Use energy wisely', from: 17, to: 20 },
    { n: 5, key: 'vana', name: 'Vana', theme: 'Forests', tagline: 'Preserve Life', mission: 'Protect wildlife and biodiversity', from: 21, to: 28 },
    { n: 8, key: 'akasha', name: 'Akasha', theme: 'The wider world', tagline: 'See the Bigger Picture', mission: 'Understand interconnected systems', from: 29, to: 36 },
    { n: 7, key: 'jana', name: 'Jana', theme: 'People and communities', tagline: 'Stronger Communities', mission: 'Build sustainable communities', from: 37, to: 46 },
    { n: 6, key: 'vidya', name: 'Vidya', theme: 'Knowledge', tagline: 'Build Sustainable Knowledge', mission: 'Apply learning to real problems', from: 47, to: 53 },
  ];

  const FINISH_INDEX = LAYOUT.length + 1;

  // ---------- geometry ----------

  // Catmull-Rom through TRACK, expressed as cubic Bézier segments.
  function toBeziers(pts) {
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      segs.push([
        p1,
        [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
        [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6],
        p2,
      ]);
    }
    return segs;
  }

  function bez(seg, t) {
    const u = 1 - t;
    const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return [
      a * seg[0][0] + b * seg[1][0] + c * seg[2][0] + d * seg[3][0],
      a * seg[0][1] + b * seg[1][1] + c * seg[2][1] + d * seg[3][1],
    ];
  }

  function buildTrack() {
    const segs = toBeziers(TRACK);
    const samples = [{ x: TRACK[0][0], y: TRACK[0][1], s: 0 }];
    let len = 0;
    segs.forEach((seg) => {
      let prev = seg[0];
      for (let k = 1; k <= 24; k++) {
        const p = bez(seg, k / 24);
        len += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
        samples.push({ x: p[0], y: p[1], s: len });
        prev = p;
      }
    });
    const d = 'M' + segs[0][0].join(' ') + segs.map((s) => ' C' + [s[1], s[2], s[3]].map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(', ')).join('');

    function pointAt(s) {
      s = Math.max(0, Math.min(len, s));
      let lo = 0, hi = samples.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (samples[mid].s < s) lo = mid; else hi = mid;
      }
      const a = samples[lo], b = samples[hi];
      const t = b.s === a.s ? 0 : (s - a.s) / (b.s - a.s);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    function angleAt(s) {
      const a = pointAt(s - 3), b = pointAt(s + 3);
      return Math.atan2(b.y - a.y, b.x - a.x);
    }
    return { d, length: len, pointAt, angleAt };
  }

  function parseLayout(entry) {
    const [type, arg] = entry.split(':');
    const space = { type, def: SPACE_TYPES[type] };
    if (type === 'setback') space.back = Number(arg);
    return space;
  }

  function buildSpaces() {
    const track = buildTrack();
    const n = LAYOUT.length;
    const step = track.length / n;
    const spaces = [{ index: 0, type: 'start', def: SPACE_TYPES.start, x: START_SPOT.x, y: START_SPOT.y }];
    for (let i = 1; i <= n; i++) {
      const sp = parseLayout(LAYOUT[i - 1]);
      const s0 = step * (i - 1) + TILE_GAP, s1 = step * i - TILE_GAP;
      const mid = track.pointAt((s0 + s1) / 2);
      let ang = track.angleAt((s0 + s1) / 2) * 180 / Math.PI;
      if (ang > 90) ang -= 180;
      if (ang <= -90) ang += 180;
      const left = [], right = [];
      for (let k = 0; k <= 6; k++) {
        const s = s0 + (s1 - s0) * k / 6;
        const p = track.pointAt(s), a = track.angleAt(s);
        const nx = -Math.sin(a) * TILE_HEIGHT / 2, ny = Math.cos(a) * TILE_HEIGHT / 2;
        left.push([p.x + nx, p.y + ny]);
        right.push([p.x - nx, p.y - ny]);
      }
      const poly = left.concat(right.reverse());
      Object.assign(sp, {
        index: i, x: mid.x, y: mid.y, angle: ang,
        path: 'M' + poly.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L') + ' Z',
        realm: realmOf(i),
      });
      spaces.push(sp);
    }
    spaces.push({ index: n + 1, type: 'finish', def: SPACE_TYPES.finish, x: FINISH_SPOT.x, y: FINISH_SPOT.y });
    return { track, spaces, step };
  }

  function realmOf(index) {
    return REALMS.find((r) => index >= r.from && index <= r.to) || null;
  }

  // ---------- SVG rendering ----------

  function svg(tag, attrs, parent) {
    const node = document.createElementNS(SVG_NS, tag);
    if (attrs) Object.keys(attrs).forEach((k) => node.setAttribute(k, attrs[k]));
    if (parent) parent.appendChild(node);
    return node;
  }

  function drawIcon(g, def, space) {
    const ink = def.ink || '#fff';
    if (def.medallion) {
      svg('circle', { r: 26, class: 'medallion', fill: `url(#grad-${def.kind})` }, g);
      svg('circle', { r: 26, class: 'medallion-ring' }, g);
      if (def.kind === 'mahashakti') svg('circle', { r: 30, class: 'medallion-glow' }, g);
    }
    if (def.glyph) {
      const t = svg('text', { class: 'tile-glyph', fill: ink, 'text-anchor': 'middle', 'dominant-baseline': 'central', y: def.glyph === 'अ' ? 2 : 0 }, g);
      t.textContent = def.glyph;
      return;
    }
    if (def.kind === 'setback' || def.kind === 'shortcut') {
      svg('use', { href: '#ic-' + def.icon, x: -11, y: -21, width: 22, height: 22, style: `color:${ink}` }, g);
      const t = svg('text', { class: 'tile-num', fill: ink, 'text-anchor': 'middle', y: 17 }, g);
      t.textContent = def.kind === 'setback' ? '−' + space.back : '+2';
      return;
    }
    const size = def.medallion ? 30 : 28;
    svg('use', { href: '#ic-' + def.icon, x: -size / 2, y: -size / 2, width: size, height: size, style: `color:${ink}` }, g);
  }

  function render(svgEl, board) {
    svgEl.setAttribute('viewBox', `0 0 ${VIEW_W} ${VIEW_H}`);
    svgEl.innerHTML = '';
    const defs = svg('defs', null, svgEl);
    defs.innerHTML = `
      <radialGradient id="grad-tapasya" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#5a2e12"/><stop offset="1" stop-color="#1a0d06"/></radialGradient>
      <radialGradient id="grad-mahashakti" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#4a2a7a"/><stop offset="1" stop-color="#140a26"/></radialGradient>
      <filter id="pawn-shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="1.6" flood-color="#000" flood-opacity=".55"/></filter>
      <filter id="tile-shadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#2b1606" flood-opacity=".45"/></filter>`;

    svg('image', { href: 'assets/board.jpg', x: 0, y: 0, width: VIEW_W, height: VIEW_H, preserveAspectRatio: 'none' }, svgEl);

    const bandG = svg('g', { class: 'band' }, svgEl);
    svg('path', { d: board.track.d, class: 'band-edge', 'stroke-width': BAND_WIDTH + 6 }, bandG);
    svg('path', { d: board.track.d, class: 'band-fill', 'stroke-width': BAND_WIDTH }, bandG);

    const tilesG = svg('g', { class: 'tiles', filter: 'url(#tile-shadow)' }, svgEl);
    board.spaces.forEach((sp) => {
      if (!sp.path) return;
      const def = sp.def;
      const g = svg('g', { class: `space k-${def.kind}`, 'data-index': sp.index, tabindex: -1 }, tilesG);
      svg('path', { d: sp.path, class: 'tile', fill: def.color }, g);
      const ig = svg('g', { class: 'tile-icon', transform: `translate(${sp.x.toFixed(1)} ${sp.y.toFixed(1)}) rotate(${sp.angle.toFixed(1)})` }, g);
      drawIcon(ig, def, sp);
      const title = svg('title', null, g);
      title.textContent = `Space ${sp.index} · ${def.label}${sp.back ? ' (back ' + sp.back + ')' : ''} — ${sp.realm.name} realm`;
    });

    svg('g', { id: 'hl-layer', class: 'hl-layer' }, svgEl);
    svg('g', { id: 'pawn-layer', class: 'pawn-layer' }, svgEl);
  }

  const built = buildSpaces();

  DR.Board = {
    VIEW_W, VIEW_H, SPACE_TYPES, REALMS, LAYOUT, FINISH_INDEX,
    spaces: built.spaces,
    track: built.track,
    realmOf,
    render: (svgEl) => render(svgEl, built),
    svg,
  };
})(window.DR = window.DR || {});
