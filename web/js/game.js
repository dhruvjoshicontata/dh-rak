/* Dhara Rakshak — game engine: state, turns, space rules, rendering and setup. */
(function (DR) {
  'use strict';

  const { Board, Cards, UI, Challenge } = DR;
  const { esc, icon, sleep, toast } = UI;
  const { shuffle, rand } = Cards.util;

  const SAVE_KEY = 'dhararakshak.save.v1';
  const FINISH = Board.FINISH_INDEX;
  const TOKENS = [
    { key: 'peacock', label: 'Peacock', color: '#1f5fd6', aspect: 0.561 },
    { key: 'cow', label: 'Cow', color: '#d9d2c3', aspect: 0.714 },
    { key: 'owl', label: 'Owl', color: '#7b4a26', aspect: 0.598 },
    { key: 'turtle', label: 'Turtle', color: '#2e9b3e', aspect: 0.776 },
    { key: 'deer', label: 'Deer', color: '#e8541c', aspect: 0.505 },
    { key: 'tree', label: 'Tree', color: '#f2c12e', aspect: 0.556 },
  ];
  const TIMER_MODES = [
    { key: 'standard', label: 'Standard', note: '30 s per card', scale: 1 },
    { key: 'relaxed', label: 'Relaxed', note: 'double time', scale: 2 },
    { key: 'off', label: 'Untimed', note: 'no clock', scale: 0 },
  ];

  let S = null;     // game state (JSON-serialisable)
  let busy = false; // an action is running

  const $ = (sel) => document.querySelector(sel);

  // ---------- persistence ----------

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ }
  }
  function loadSaved() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const st = raw ? JSON.parse(raw) : null;
      return st && st.v === 1 && st.phase === 'play' ? st : null;
    } catch (e) { return null; }
  }
  function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* storage unavailable */ }
  }

  // ---------- state helpers ----------

  function newState(players, timerKey) {
    return {
      v: 1,
      players: players.map((p, i) => ({ id: i, name: p.name, token: p.token, pos: 0, shakti: 5, karma: 0, emblems: 0, qualified: false, grandBonus: false })),
      current: 0,
      round: 1,
      portals: Object.fromEntries(Board.spaces.filter((s) => s.type === 'mahashakti').map((s) => [s.index, 'open'])),
      piles: {},
      revealed: [],
      mahashaktiNext: rand(Cards.MAHASHAKTI_COUNT),
      finalRound: false,
      phase: 'play',
      turn: null,
      log: [],
      timer: timerKey,
      winner: null,
    };
  }

  const cur = () => S.players[S.current];
  const keeperOf = (p) => S.players[(p.id + 1) % S.players.length];
  const tokenOf = (p) => TOKENS.find((t) => t.key === p.token) || TOKENS[0];
  const pname = (p) => `<b class="pname" style="--pc:${tokenOf(p).color}">${esc(p.name)}</b>`;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  function where(p) {
    const sp = Board.spaces[p.pos];
    const r = sp.realm;
    return `${sp.def.label}${r ? ` · Realm ${r.n} ${r.name}` : ''}`;
  }

  function log(html, tone) {
    S.log.unshift({ html, tone: tone || 'info', r: S.round });
    if (S.log.length > 150) S.log.length = 150;
  }

  function setMsg(html) { S.turn.msg = html; }

  function gain(p, n, why) {
    p.shakti += n;
    floatAt(p, `+${n}`, 'gain');
    log(`${pname(p)} earns <b>${plural(n, 'Shakti Token', 'Shakti Tokens')}</b> — ${why}.`, 'good');
  }

  // Token penalty: pay in full, or surrender everything and take a Karma marker.
  function payPenalty(p, n, why) {
    if (p.shakti >= n) {
      p.shakti -= n;
      floatAt(p, `−${n}`, 'loss');
      log(`${pname(p)} loses <b>${plural(n, 'Shakti Token', 'Shakti Tokens')}</b> — ${why}.`, 'bad');
      return false;
    }
    const had = p.shakti;
    p.shakti = 0;
    p.karma += 1;
    if (had) floatAt(p, `−${had}`, 'loss');
    log(`${pname(p)} could pay only ${had} of ${n} tokens (${why}) and takes a <b>Karma marker</b>.`, 'bad');
    return true;
  }

  function addKarma(p, why) {
    p.karma += 1;
    log(`${pname(p)} takes a <b>Karma marker</b> — ${why}.`, 'bad');
  }

  function drawCard(deck) {
    if (deck === 'memory' || deck === 'concentration') return Cards.drawProcedural(deck);
    let pile = S.piles[deck];
    const size = Cards.POOLS[deck].length;
    if (!pile || pile.i >= pile.order.length) {
      pile = S.piles[deck] = { order: shuffle([...Array(size).keys()]), i: 0 };
    }
    return Cards.cardFrom(deck, pile.order[pile.i++]);
  }

  function deckLeft(deck) {
    if (deck === 'memory' || deck === 'concentration') return '∞';
    const pile = S && S.piles[deck];
    return pile ? pile.order.length - pile.i : Cards.POOLS[deck].length;
  }

  // ---------- movement ----------

  async function moveSteps(p, delta) {
    const startRealm = Board.realmOf(p.pos);
    const target = Math.max(0, Math.min(FINISH, p.pos + delta));
    const dir = Math.sign(target - p.pos);
    const newlyRevealed = [];
    while (p.pos !== target) {
      p.pos += dir;
      const r = Board.realmOf(p.pos);
      if (dir > 0 && r && !S.revealed.includes(r.key)) {
        S.revealed.push(r.key);
        newlyRevealed.push(r);
      }
      renderPawns(p.id);
      renderHighlight();
      followPawn(p);
      await sleep(dir > 0 ? 260 : 210);
    }
    renderAll();
    const endRealm = Board.realmOf(p.pos);
    if (dir > 0 && endRealm && endRealm !== startRealm) {
      toast(`${pname(p)} enters <b>Realm ${endRealm.n} · ${esc(endRealm.name)}</b> — ${esc(endRealm.tagline)}`, 'realm');
    }
    for (const r of newlyRevealed) await revealRule(r);
  }

  async function revealRule(r) {
    const rule = Cards.DHARA_RULES[r.key];
    log(`<span class="rule-tag">Dhara Rule · ${esc(r.name)}</span> ${esc(rule)}`, 'rule');
    renderPanel();
    await UI.notice(`Dhara Rule of ${r.name}`, `
      <p class="realm-line">Realm ${r.n} · <b>${esc(r.name)}</b> — ${esc(r.theme)}. Mission: ${esc(r.mission)}.</p>
      <blockquote class="rule-quote">${esc(rule)}</blockquote>
      <p class="small">Remember this waste-management rule — the Grand Green Challenge will ask you to recall it.</p>`,
    { kicker: `Rule ${S.revealed.length} of 8 revealed`, iconName: 'leaf', tone: 'rule', button: 'I will remember' });
  }

  // Movement penalty, optionally cancelled with a Mahashakti Emblem.
  async function movementPenalty(p, n, why, cancellable) {
    if (cancellable && p.emblems > 0 && p.pos > 0) {
      const use = await UI.choice({
        title: 'Use a Mahashakti Emblem?',
        kicker: why,
        iconName: 'emblem',
        tone: 'mahashakti',
        body: `<p>${pname(p)} must move back <b>${plural(n, 'space', 'spaces')}</b>. A Mahashakti Emblem cancels one movement setback. You hold <b>${p.emblems}</b>.</p>`,
        choices: [{ label: 'Use Emblem — stay here', value: true, primary: true }, { label: `Move back ${n}`, value: false }],
      });
      if (use) {
        p.emblems -= 1;
        log(`${pname(p)} uses a <b>Mahashakti Emblem</b> to cancel moving back ${n}.`, 'good');
        return false;
      }
    }
    if (p.pos === 0) return false;
    log(`${pname(p)} moves back ${plural(n, 'space', 'spaces')} — ${why}.`, 'bad');
    await moveSteps(p, -n);
    return true;
  }

  // ---------- dice ----------

  function setDieFace(v) {
    const die = $('#die');
    die.dataset.v = v;
  }

  async function rollDie() {
    const v = 1 + rand(6);
    const die = $('#die');
    die.classList.add('rolling');
    for (let i = 0; i < 10; i++) {
      setDieFace(1 + rand(6));
      await sleep(60 + i * 9);
    }
    setDieFace(v);
    die.classList.remove('rolling');
    die.classList.add('landed');
    setTimeout(() => die.classList.remove('landed'), 450);
    await sleep(350);
    return v;
  }

  // ---------- space resolution ----------

  async function ordinary(p, deck, kicker) {
    const card = drawCard(deck);
    setActiveDeck(deck);
    const r = await Challenge.run({
      deck, title: Cards.DECKS[deck].name, kicker, stages: [card], mode: 'single',
      player: p.name, keeper: keeperOf(p).name,
    });
    setActiveDeck(null);
    if (r.success) {
      gain(p, 2, `${Cards.DECKS[deck].name} challenge`);
      setMsg(`Well done! ${pname(p)} earns 2 Shakti Tokens.`);
    } else {
      log(`${pname(p)} did not complete the ${esc(Cards.DECKS[deck].name)} challenge — no reward.`);
      setMsg(`No reward this time, ${pname(p)}. Keep going!`);
    }
    return r;
  }

  async function ecoMission(p) {
    const card = drawCard('eco');
    const r = await Challenge.run({
      deck: 'eco', title: 'Eco-Mission', kicker: where(p), stages: [card], mode: 'single',
      player: p.name, keeper: keeperOf(p).name, allowBonus: true,
    });
    if (r.success) {
      gain(p, r.bonus ? 3 : 2, r.bonus ? 'Eco-Mission with a practical, creative solution' : 'Eco-Mission');
      setMsg(`Mission accomplished! ${pname(p)} earns ${r.bonus ? 3 : 2} Shakti Tokens.`);
    } else {
      await movementPenalty(p, 2, 'failed Eco-Mission', true);
      addKarma(p, 'failed Eco-Mission');
      setMsg(`The Eco-Mission failed. ${pname(p)} moves back and takes a Karma marker.`);
    }
  }

  function chooseContributors(p) {
    return new Promise((resolve) => {
      const m = UI.openModal({
        cls: 'choice tone-team',
        label: 'Who contributed?',
        html: `
          <header class="choice-head"><div class="choice-icon">${icon('people')}</div>
            <div><div class="kicker">Teamwork Bridge — success!</div><h2>Who made a meaningful contribution?</h2></div></header>
          <div class="choice-body"><p>Each contributor earns <b>1 Shakti Token</b>.</p>
            <div class="contrib">${S.players.map((q) => `
              <label class="contrib-opt"><input type="checkbox" value="${q.id}" checked>
                <img src="assets/token-${q.token}.png" alt=""><span>${esc(q.name)}</span></label>`).join('')}</div></div>
          <div class="choice-actions"><button class="btn btn-primary">Award tokens</button></div>`,
      });
      m.box.querySelector('.btn-primary').addEventListener('click', () => {
        const ids = [...m.box.querySelectorAll('input:checked')].map((i) => Number(i.value));
        m.close();
        resolve(ids);
      });
      UI.focusFirst(m.box);
    });
  }

  async function teamwork(p) {
    const card = drawCard('teamwork');
    const r = await Challenge.run({
      deck: 'teamwork', title: 'Teamwork Bridge', kicker: where(p), stages: [card], mode: 'single',
      player: p.name, keeper: keeperOf(p).name, team: true,
    });
    if (r.success) {
      const ids = await chooseContributors(p);
      ids.forEach((id) => gain(S.players[id], 1, 'Teamwork Bridge'));
      setMsg(`The bridge holds! ${ids.length ? plural(ids.length, 'contributor earns', 'contributors earn') + ' 1 token each.' : 'No contributors were chosen.'}`);
    } else {
      log('The team could not cross the Teamwork Bridge — no reward.');
      setMsg('The team could not complete the bridge this time.');
    }
  }

  async function divineGrace(p) {
    let take = 'tokens';
    if (p.karma > 0) {
      const canClear = !S.turn.karmaCleared;
      take = await UI.choice({
        title: 'Divine Grace', kicker: where(p), iconName: 'lotus', tone: 'grace',
        body: `<p>The lotus blooms for ${pname(p)}. Choose a blessing.</p>${canClear ? '' : '<p class="warn">You have already cleared a Karma marker this turn.</p>'}`,
        choices: [
          { label: 'Remove one Karma marker', value: 'karma', primary: true, disabled: !canClear },
          { label: 'Take 2 Shakti Tokens', value: 'tokens' },
        ],
      });
    }
    if (take === 'karma') {
      p.karma -= 1;
      S.turn.karmaCleared = true;
      log(`${pname(p)} receives Divine Grace and removes a <b>Karma marker</b>.`, 'good');
      setMsg(`Divine Grace! ${pname(p)} is freed of one Karma marker.`);
    } else {
      gain(p, 2, 'Divine Grace');
      setMsg(`Divine Grace! ${pname(p)} receives 2 Shakti Tokens.`);
    }
  }

  function riskBody(lines, reason, extra) {
    return `
      <p>${lines.intro}</p>
      <ul class="stakes">
        <li class="good"><b>Success:</b> ${lines.win}</li>
        <li class="bad"><b>Failure:</b> ${lines.lose}</li>
      </ul>
      ${reason ? `<p class="warn">${reason}</p>` : ''}
      <p class="small">${extra}</p>`;
  }

  async function tapasyaPortal(p) {
    const reason = p.karma > 0 ? 'You carry Karma markers, so the Tapasya Trial is closed to you.'
      : p.shakti < 3 ? 'You need at least 3 Shakti Tokens to make the wager.' : '';
    const attempt = await UI.choice({
      title: 'Tapasya Portal', kicker: where(p), iconName: 'flame', tone: 'tapasya',
      body: riskBody({
        intro: `Risk <b>3 Shakti Tokens</b> on a three-stage trial — an academic problem, an environmental reasoning task and a memory, concentration or action task — all within <b>2 minutes</b>.`,
        win: '8 Shakti Tokens and 3 spaces forward.',
        lose: 'the wager is lost, 3 spaces back and one Karma marker.',
      }, reason, 'Decide before seeing the card. The ordinary route is a regular subject challenge worth 2 tokens.'),
      choices: [
        { label: 'Attempt the Tapasya Trial', value: true, primary: true, disabled: !!reason, note: 'Wager 3 tokens' },
        { label: 'Take the ordinary route', value: false },
      ],
    });
    if (!attempt) return ordinary(p, Cards.randomSubjectDeck(), 'Tapasya Portal · ordinary route');

    p.shakti -= 3;
    log(`${pname(p)} wagers 3 tokens on the <b>Tapasya Trial</b>.`);
    renderAll();
    const r = await Challenge.run({
      deck: 'tapasya', title: 'Tapasya Trial', stages: Cards.tapasyaStages(() => drawCard('action')),
      mode: 'all', overall: 120, player: p.name, keeper: keeperOf(p).name,
      intro: `<div class="intro"><p>Three stages. <b>2 minutes</b> on the clock. Every stage must be passed.</p>
        <ol class="intro-list"><li>An academic problem</li><li>An environmental reasoning task</li><li>A memory, concentration or action task</li></ol></div>`,
      successTitle: 'Tapasya complete!', successText: '+8 Shakti Tokens and 3 spaces forward.',
      failTitle: 'The trial is lost', failText: 'The wager is lost. Move back 3 spaces and take one Karma marker.',
    });
    if (r.success) {
      gain(p, 8, 'Tapasya Trial');
      await moveSteps(p, 3);
      setMsg(`Tapasya complete! ${pname(p)} earns 8 tokens and leaps 3 spaces ahead.`);
    } else {
      log(`${pname(p)} fails the Tapasya Trial and loses the wager.`, 'bad');
      await movementPenalty(p, 3, 'failed Tapasya Trial', false);
      addKarma(p, 'failed Tapasya Trial');
      setMsg(`The Tapasya Trial was lost. ${pname(p)} moves back 3 spaces and takes a Karma marker.`);
    }
  }

  async function mahashaktiPortal(p) {
    if (S.portals[p.pos] !== 'open') {
      await UI.notice('This portal is closed', '<p>Another Dhara Rakshak has already attempted this Mahashakti Portal. Take the ordinary route instead.</p>', { kicker: where(p), iconName: 'lotus', tone: 'mahashakti' });
      return ordinary(p, Cards.randomSubjectDeck(), 'Mahashakti Portal · ordinary route');
    }
    const reason = p.karma > 0 ? 'You carry Karma markers, so you cannot attempt a Mahashakti Challenge.'
      : p.shakti < 6 ? 'You need at least 6 Shakti Tokens before the wager.' : '';
    const attempt = await UI.choice({
      title: 'Mahashakti Portal', kicker: where(p), iconName: 'lotus', tone: 'mahashakti',
      body: riskBody({
        intro: `The rarest event in Dhara Rakshak. Wager <b>4 Shakti Tokens</b> on five stages — Gyaan, Vigyaan, Vaani, Dharma and Ekagrata — in <b>3 minutes</b>.`,
        win: '12 Shakti Tokens, 6 spaces forward and a Mahashakti Emblem.',
        lose: 'the wager is lost, 4 spaces back and one Karma marker.',
      }, reason, 'This portal closes after one attempt, whatever the result. The ordinary route is a regular subject challenge.'),
      choices: [
        { label: 'Awaken the Mahashakti', value: true, primary: true, disabled: !!reason, note: 'Wager 4 tokens' },
        { label: 'Take the ordinary route', value: false },
      ],
    });
    if (!attempt) return ordinary(p, Cards.randomSubjectDeck(), 'Mahashakti Portal · ordinary route');

    p.shakti -= 4;
    S.portals[p.pos] = 'closed';
    log(`${pname(p)} places 4 tokens in the Mahashakti Pot.`);
    renderAll();
    const card = Cards.mahashaktiCard(S.mahashaktiNext++);
    const r = await Challenge.run({
      deck: 'mahashakti', title: `Mahashakti: ${card.title}`, stages: card.stages,
      mode: 'all', overall: 180, player: p.name, keeper: keeperOf(p).name,
      intro: `<div class="intro"><p class="scenario">${esc(card.scenario)}</p>
        <p>Five stages, <b>3 minutes</b>. All five must be passed.</p>
        <ol class="intro-list"><li><b>Gyaan</b> — Mathematics</li><li><b>Vigyaan</b> — Science</li><li><b>Vaani</b> — English or Hindi</li><li><b>Dharma</b> — Social Science and community</li><li><b>Ekagrata</b> — memory and focus</li></ol></div>`,
      successTitle: 'Mahashakti Awakened!', successText: '+12 Shakti Tokens, 6 spaces forward and a Mahashakti Emblem.',
      failTitle: 'The cost of ambition', failText: 'The wager is lost. Move back 4 spaces and take one Karma marker.',
    });
    if (r.success) {
      gain(p, 12, 'Mahashakti Challenge');
      p.emblems += 1;
      log(`${pname(p)} receives a <b>Mahashakti Emblem</b>.`, 'good');
      await moveSteps(p, 6);
      setMsg(`Mahashakti Awakened! ${pname(p)} earns 12 tokens, an Emblem and moves 6 spaces ahead.`);
    } else {
      log(`${pname(p)} fails the Mahashakti Challenge. The portal closes.`, 'bad');
      await movementPenalty(p, 4, 'failed Mahashakti Challenge', false);
      addKarma(p, 'failed Mahashakti Challenge');
      setMsg(`The Mahashakti Challenge failed. ${pname(p)} moves back 4 spaces and takes a Karma marker.`);
    }
  }

  async function grandChallenge(p) {
    const r = await Challenge.run({
      deck: 'grand', title: 'Grand Green Challenge', stages: Cards.grandStages(S.revealed),
      mode: 'grand', player: p.name, keeper: keeperOf(p).name,
      intro: `<div class="intro"><p class="scenario"><b>Restore Balance to Bharat.</b> An Indian village produces too much waste every day. Some is recyclable, some is organic, and the rest needs proper disposal.</p>
        <p>Seven stages: Mathematics, Science, English, Hindi, Social Science, Memory and a Creative Action.</p>
        <p>To qualify: answer at least <b>4 of the 5</b> subject stages correctly <b>and</b> complete both the Memory and Creative Action tasks.</p></div>`,
      successTitle: 'A true Dhara Rakshak!', successText: p.grandBonus ? '' : '+5 bonus Shakti Tokens. You qualify for victory.',
      failTitle: 'Not yet…',
    });
    if (r.success) {
      p.qualified = true;
      log(`${pname(p)} completes the <b>Grand Green Challenge</b> and qualifies for victory!`, 'good');
      if (!p.grandBonus) {
        p.grandBonus = true;
        gain(p, 5, 'Grand Green Challenge bonus');
      }
      if (!S.finalRound) {
        S.finalRound = true;
        const left = S.players.length - 1 - S.current;
        log(left ? `<b>Final round!</b> The remaining ${plural(left, 'player gets', 'players get')} a last turn.` : '<b>Final round complete</b> — every player has had an equal number of turns.', 'rule');
        toast(left ? '<b>Final round!</b> Everyone else gets one last turn.' : '<b>The quest is complete!</b>', 'realm', 4200);
      }
      setMsg(`${pname(p)} is a qualified Dhara Rakshak!`);
    } else {
      log(`${pname(p)} has not yet passed the Grand Green Challenge and will try again next turn.`);
      setMsg(`${pname(p)} remains at FINISH and may try the Grand Green Challenge again next turn.`);
    }
  }

  async function resolveSpace(p) {
    const sp = Board.spaces[p.pos];
    const def = sp.def;
    switch (def.kind) {
      case 'subject':
      case 'skill':
      case 'rishi':
        return ordinary(p, def.deck, where(p));
      case 'eco':
        return ecoMission(p);
      case 'teamwork':
        return teamwork(p);
      case 'shortcut':
        log(`${pname(p)} finds a <b>Shortcut</b> and moves ahead 2 spaces.`, 'good');
        await sleep(250);
        await moveSteps(p, 2);
        return setMsg(`Shortcut! ${pname(p)} moves ahead 2 spaces.`);
      case 'setback': {
        const moved = await movementPenalty(p, sp.back, 'Setback space', true);
        return setMsg(moved ? `Setback! ${pname(p)} moves back ${plural(sp.back, 'space', 'spaces')}.` : `${pname(p)} holds firm against the setback.`);
      }
      case 'grace':
        return divineGrace(p);
      case 'karmaPit': {
        const tookKarma = payPenalty(p, 2, 'Karma Pit');
        return setMsg(tookKarma ? `${pname(p)} falls into the Karma Pit and takes a Karma marker.` : `${pname(p)} falls into the Karma Pit and loses 2 Shakti Tokens.`);
      }
      case 'tapasya':
        return tapasyaPortal(p);
      case 'mahashakti':
        return mahashaktiPortal(p);
      default:
        return null;
    }
  }

  // ---------- turn flow ----------

  function startTurn() {
    const p = cur();
    S.turn = { phase: 'start', karmaCleared: false, msg: '' };
    if (p.qualified) {
      if (p.karma > 0) setMsg(`${pname(p)} has qualified but still carries Karma. Clear it to stay eligible to win.`);
      else { S.turn.phase = 'rest'; setMsg(`${pname(p)} has completed the Grand Green Challenge and rests at FINISH.`); }
    } else if (p.pos === FINISH) {
      setMsg(`${pname(p)} is at FINISH. Face the Grand Green Challenge!`);
    } else {
      setMsg(`${pname(p)}, roll the die to continue your quest.`);
    }
    save();
    renderAll();
    followPawn(p);
  }

  function availableActions() {
    if (!S || S.phase !== 'play' || !S.turn) return [];
    const p = cur();
    const t = S.turn;
    if (t.phase === 'busy') return [];
    if (t.phase === 'done' || t.phase === 'rest') {
      const last = S.finalRound && S.current === S.players.length - 1;
      return [{ id: 'end', label: last ? 'Finish the game ▶' : 'Next player ▶', primary: true }];
    }
    const list = [];
    if (p.qualified) list.push({ id: 'end', label: 'Pass turn ▶', primary: p.karma === 0 });
    else if (p.pos === FINISH) list.push({ id: 'grand', label: 'Attempt the Grand Green Challenge', primary: true, iconName: 'leaf' });
    else list.push({ id: 'roll', label: 'Roll the die', primary: true, iconName: 'dice' });
    if (p.karma > 0 && !t.karmaCleared) {
      list.push({ id: 'clearQuiz', label: 'Clear Karma: answer a challenge', note: 'No reward · a wrong answer ends your turn' });
      list.push({ id: 'clearPay', label: 'Clear Karma: pay 3 tokens', disabled: p.shakti < 3, note: p.shakti < 3 ? 'Needs 3 Shakti Tokens' : 'Restitution' });
    }
    return list;
  }

  const handlers = {
    async roll() {
      const p = cur();
      S.turn.phase = 'busy';
      setMsg(`${pname(p)} rolls the die…`);
      renderAll();
      followPawn(p, true);
      const v = await rollDie();
      log(`${pname(p)} rolls a <b>${v}</b>.`);
      await moveSteps(p, v);
      if (p.pos === FINISH) {
        log(`${pname(p)} reaches <b>FINISH</b>!`, 'good');
        await grandChallenge(p);
      } else {
        await resolveSpace(p);
      }
      S.turn.phase = 'done';
    },
    async grand() {
      S.turn.phase = 'busy';
      renderAll();
      await grandChallenge(cur());
      S.turn.phase = 'done';
    },
    async clearQuiz() {
      const p = cur();
      S.turn.phase = 'busy';
      renderAll();
      const deck = Cards.randomSubjectDeck();
      const r = await Challenge.run({
        deck: 'karma', title: 'Karma Recovery', kicker: `${Cards.DECKS[deck].name} · no tokens are awarded`,
        stages: [drawCard(deck)], mode: 'single', player: p.name, keeper: keeperOf(p).name,
      });
      if (r.success) {
        p.karma -= 1;
        S.turn.karmaCleared = true;
        S.turn.phase = p.qualified && p.karma === 0 ? 'rest' : 'start';
        log(`${pname(p)} answers wisely and clears a <b>Karma marker</b>.`, 'good');
        setMsg(`Karma marker cleared! ${p.qualified ? '' : 'Now continue your turn.'}`);
      } else {
        S.turn.phase = 'done';
        log(`${pname(p)} could not clear the Karma marker. The turn ends.`, 'bad');
        setMsg('The Karma marker remains and the turn ends.');
      }
    },
    async clearPay() {
      const p = cur();
      if (p.shakti < 3) return;
      p.shakti -= 3;
      p.karma -= 1;
      floatAt(p, '−3', 'loss');
      S.turn.karmaCleared = true;
      if (p.qualified && p.karma === 0) S.turn.phase = 'rest';
      log(`${pname(p)} pays 3 tokens in restitution and clears a <b>Karma marker</b>.`, 'good');
      setMsg(`Restitution made. ${p.qualified ? '' : 'Now continue your turn.'}`);
    },
    async end() {
      if (S.finalRound && S.current === S.players.length - 1) return endGame();
      S.current = (S.current + 1) % S.players.length;
      if (S.current === 0) S.round += 1;
      startTurn();
      const p = cur();
      toast(`${pname(p)}'s turn${S.finalRound ? ' — final round' : ''}`, 'turn', 2200);
    },
  };

  async function act(id) {
    if (busy || !S || S.phase !== 'play') return;
    const a = availableActions().find((x) => x.id === id);
    if (!a || a.disabled) return;
    busy = true;
    try {
      await handlers[id]();
    } catch (err) {
      console.error(err);
      if (S.turn && S.turn.phase === 'busy') S.turn.phase = 'done';
    } finally {
      busy = false;
      if (S.phase === 'play') save();
      renderAll();
    }
  }

  // ---------- end of game ----------

  async function tieBreak(tied) {
    for (let round = 1; ; round++) {
      const deck = Cards.randomSubjectDeck();
      const card = drawCard(deck);
      const v = await UI.choice({
        title: 'Tie-breaker', kicker: `Question ${round} · ${Cards.DECKS[deck].name}`, iconName: 'emblem',
        body: `<p>${tied.map((p) => pname(p)).join(' and ')} are tied on <b>${tied[0].shakti}</b> Shakti Tokens. Read the question aloud — the first to answer correctly wins.</p>
          <p class="ch-q${UI.hasDevanagari(card.q) ? ' deva' : ''}">${esc(card.q)}</p>
          <ol class="tb-opts" type="A">${shuffle(card.o).map((o) => `<li>${esc(o)}</li>`).join('')}</ol>
          <details class="keeper-guide"><summary>Answer key</summary><p>${esc(card.o[0])}</p></details>`,
        choices: tied.map((p) => ({ label: `${p.name} answered first`, value: p.id, primary: true }))
          .concat([{ label: 'Nobody — next question', value: -1 }]),
      });
      if (v !== -1) return S.players[v];
    }
  }

  async function clearFinalKarma(p) {
    while (p.karma > 0) {
      const v = await UI.choice({
        title: `${p.name}: clear your Karma Debt`, kicker: 'Final reckoning', iconName: 'storm', tone: 'karma',
        body: `<p>A player with unresolved Karma cannot win. ${pname(p)} carries <b>${plural(p.karma, 'Karma marker', 'Karma markers')}</b> and holds <b>${p.shakti}</b> Shakti Tokens.</p><p class="small">One recovery challenge is allowed per marker.</p>`,
        choices: [
          { label: 'Answer a recovery challenge', value: 'quiz', primary: true },
          { label: 'Pay 3 Shakti Tokens', value: 'pay', disabled: p.shakti < 3 },
          { label: 'Give up — not eligible', value: 'quit' },
        ],
      });
      if (v === 'quit') return;
      if (v === 'pay') {
        p.shakti -= 3;
        p.karma -= 1;
        log(`${pname(p)} pays 3 tokens to clear a Karma marker.`);
        continue;
      }
      const deck = Cards.randomSubjectDeck();
      const r = await Challenge.run({ deck: 'karma', title: 'Karma Recovery', kicker: `Final reckoning · ${Cards.DECKS[deck].name}`, stages: [drawCard(deck)], mode: 'single', player: p.name, keeper: keeperOf(p).name });
      if (r.success) {
        p.karma -= 1;
        log(`${pname(p)} clears a Karma marker.`, 'good');
      } else {
        const v2 = await UI.choice({
          title: 'The marker remains', kicker: 'Final reckoning', iconName: 'storm', tone: 'karma',
          body: `<p>${pname(p)} still carries ${plural(p.karma, 'Karma marker', 'Karma markers')}.</p>`,
          choices: [{ label: 'Pay 3 Shakti Tokens', value: 'pay', primary: true, disabled: p.shakti < 3 }, { label: 'Give up — not eligible', value: 'quit' }],
        });
        if (v2 === 'quit') return;
        p.shakti -= 3;
        p.karma -= 1;
        log(`${pname(p)} pays 3 tokens to clear a Karma marker.`);
      }
      renderAll();
    }
  }

  async function endGame() {
    S.phase = 'ending';
    clearSave();
    renderAll();
    for (const p of S.players.filter((q) => q.qualified && q.karma > 0)) await clearFinalKarma(p);
    const eligible = S.players.filter((p) => p.qualified && p.karma === 0);
    let winner = null;
    if (eligible.length) {
      const top = Math.max(...eligible.map((p) => p.shakti));
      const tied = eligible.filter((p) => p.shakti === top);
      winner = tied.length > 1 ? await tieBreak(tied) : tied[0];
    }
    S.phase = 'ended';
    S.winner = winner ? winner.id : null;
    if (winner) log(`${pname(winner)} wins Dhara Rakshak with <b>${winner.shakti}</b> Shakti Tokens!`, 'good');
    renderAll();
    showResults();
  }

  function showResults() {
    const winner = S.winner != null ? S.players[S.winner] : null;
    const rows = S.players.slice().sort((a, b) => {
      const ea = a.qualified && a.karma === 0, eb = b.qualified && b.karma === 0;
      if (ea !== eb) return ea ? -1 : 1;
      return b.shakti - a.shakti;
    });
    const m = UI.openModal({
      cls: 'results',
      label: 'Results',
      html: `
        <div class="results-hero">
          ${winner ? `<img src="assets/token-${winner.token}.png" alt="">
            <div><div class="kicker">The Earth has a new guardian</div><h2>${esc(winner.name)} wins!</h2>
            <p>${esc(winner.name)} completed the Grand Green Challenge with <b>${winner.shakti}</b> Shakti Tokens.</p></div>`
          : `<div><div class="kicker">The quest ends</div><h2>No eligible Dhara Rakshak</h2><p>No player finished qualified and free of Karma Debt. Try again — the Earth is waiting!</p></div>`}
        </div>
        <table class="standings">
          <thead><tr><th>#</th><th>Player</th><th>Shakti</th><th>Karma</th><th>Grand Challenge</th></tr></thead>
          <tbody>${rows.map((p, i) => `
            <tr class="${p.id === S.winner ? 'win' : ''}">
              <td>${i + 1}</td>
              <td><img src="assets/token-${p.token}.png" alt=""> ${esc(p.name)}</td>
              <td><b>${p.shakti}</b></td>
              <td>${p.karma}</td>
              <td>${p.qualified ? (p.karma ? 'Passed · Karma Debt' : '✓ Passed') : 'Not passed'}</td>
            </tr>`).join('')}</tbody>
        </table>
        <blockquote class="motto">Knowledge gives us power. Wisdom guides our choices. Responsibility protects our planet.</blockquote>
        <div class="choice-actions">
          <button class="btn btn-secondary view">View the board</button>
          <button class="btn btn-primary again">Play again</button>
        </div>`,
    });
    m.box.querySelector('.again').addEventListener('click', () => { m.close(); showSetup(); });
    m.box.querySelector('.view').addEventListener('click', () => m.close());
    UI.focusFirst(m.box);
  }

  // ---------- rendering ----------

  function pawnOffsets(count, k, roomy) {
    if (count === 1) return [0, 0];
    const gap = roomy ? 24 : Math.max(9, 34 / (count - 1));
    const dx = (k - (count - 1) / 2) * gap;
    const dy = count > 2 ? ((k % 2) ? -5 : 3) : 0;
    return [dx, dy];
  }

  function renderPawns(hopId) {
    const layer = document.getElementById('pawn-layer');
    if (!layer || !S) return;
    const groups = {};
    S.players.forEach((p) => { (groups[p.pos] = groups[p.pos] || []).push(p); });
    S.players.forEach((p) => {
      let g = layer.querySelector(`[data-pid="${p.id}"]`);
      const t = tokenOf(p);
      if (!g || g.dataset.token !== p.token) {
        if (g) g.remove();
        g = Board.svg('g', { class: 'pawn', 'data-pid': p.id, 'data-token': p.token }, layer);
        const inner = Board.svg('g', { class: 'pawn-inner' }, g);
        Board.svg('ellipse', { class: 'pawn-shadow', cx: 0, cy: 4, rx: 15, ry: 5 }, inner);
        Board.svg('ellipse', { class: 'pawn-ring', cx: 0, cy: 4, rx: 18, ry: 6.5, stroke: t.color }, inner);
        const h = 54, w = h * t.aspect;
        Board.svg('image', { href: `assets/token-${p.token}.png`, x: -w / 2, y: -h + 8, width: w, height: h, filter: 'url(#pawn-shadow)' }, inner);
        const title = Board.svg('title', null, g);
        title.textContent = p.name;
      }
      g.querySelector('title').textContent = `${p.name} — space ${p.pos}`;
      const group = groups[p.pos];
      const sp = Board.spaces[p.pos];
      const off = pawnOffsets(group.length, group.indexOf(p), p.pos === 0 || p.pos === FINISH);
      g.style.transform = `translate(${(sp.x + off[0]).toFixed(1)}px, ${(sp.y + off[1]).toFixed(1)}px)`;
      g.classList.toggle('current', S.phase === 'play' && p.id === S.current);
      if (hopId === p.id) {
        g.classList.remove('hop');
        void g.getBoundingClientRect();
        g.classList.add('hop');
      }
    });
    // Draw lower pawns last so they overlap correctly; the active pawn always on top.
    [...layer.children]
      .sort((a, b) => {
        const pa = S.players[a.dataset.pid], pb = S.players[b.dataset.pid];
        if (pa.id === S.current) return 1;
        if (pb.id === S.current) return -1;
        return Board.spaces[pa.pos].y - Board.spaces[pb.pos].y;
      })
      .forEach((n) => layer.appendChild(n));
  }

  // On narrow screens the board is wider than the viewport: keep the moving pawn in view.
  function followPawn(p, bringBoardIntoView) {
    if (!document.body.classList.contains('compact')) return;
    const wrap = document.querySelector('.board-wrap');
    const x = Board.spaces[p.pos].x / Board.VIEW_W * $('#board').clientWidth;
    wrap.scrollTo({ left: x - wrap.clientWidth / 2, behavior: 'smooth' });
    if (bringBoardIntoView) wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderHighlight() {
    const svgEl = document.getElementById('board');
    svgEl.querySelectorAll('.space.is-current').forEach((n) => n.classList.remove('is-current'));
    if (!S || S.phase !== 'play') return;
    const n = svgEl.querySelector(`.space[data-index="${cur().pos}"]`);
    if (n) n.classList.add('is-current');
  }

  function renderPortals() {
    const svgEl = document.getElementById('board');
    Object.keys(S ? S.portals : {}).forEach((idx) => {
      const n = svgEl.querySelector(`.space[data-index="${idx}"]`);
      if (n) n.classList.toggle('closed', S.portals[idx] !== 'open');
    });
  }

  function renderTurnCard() {
    const el = $('#turnCard');
    if (!S || !S.turn) { el.innerHTML = ''; return; }
    const p = S.phase === 'ended' && S.winner != null ? S.players[S.winner] : cur();
    const t = tokenOf(p);
    const sp = Board.spaces[p.pos];
    const realm = sp.realm;
    const place = p.pos === 0 ? 'At START' : p.pos === FINISH ? 'At FINISH' : `Realm ${realm.n} · ${esc(realm.name)} — ${esc(realm.mission)}`;
    el.style.setProperty('--pc', t.color);
    el.innerHTML = `
      <div class="turn-top">
        <span class="chip-round">Round ${S.round}</span>
        ${S.finalRound ? '<span class="chip-final">Final round</span>' : ''}
        <span class="keeper">Game Keeper: <b>${esc(keeperOf(p).name)}</b></span>
      </div>
      <div class="turn-main">
        <img class="turn-token" src="assets/token-${p.token}.png" alt="${esc(t.label)} token">
        <div class="turn-who">
          <div class="turn-label">${S.phase === 'play' ? 'Now playing' : S.winner != null ? 'Winner' : 'Game over'}</div>
          <div class="turn-name">${esc(p.name)}</div>
          <div class="turn-place">${place}</div>
        </div>
      </div>
      <div class="turn-stats">
        <span class="stat" title="Shakti Tokens"><img src="assets/shakti.png" alt=""><b>${p.shakti}</b> Shakti</span>
        <span class="stat${p.karma ? ' warn' : ''}" title="Karma markers"><img src="assets/karma.png" alt=""><b>${p.karma}</b> Karma</span>
        <span class="stat" title="Mahashakti Emblems">${icon('emblem', 'emb')}<b>${p.emblems}</b> Emblem${p.emblems === 1 ? '' : 's'}</span>
        <span class="stat" title="Position">Space <b>${p.pos}</b>/${FINISH}</span>
      </div>`;
  }

  function renderActions() {
    const el = $('#actions');
    const list = availableActions();
    el.innerHTML = list.map((a) => `
      <button class="btn ${a.primary ? 'btn-primary' : 'btn-secondary'} act" data-act="${a.id}" ${a.disabled || busy ? 'disabled' : ''}>
        ${a.iconName === 'dice' ? '<span class="mini-die" aria-hidden="true"></span>' : a.iconName ? icon(a.iconName) : ''}
        <span>${esc(a.label)}</span>${a.note ? `<small>${esc(a.note)}</small>` : ''}
      </button>`).join('');
    if (!list.length && S && S.phase === 'play') el.innerHTML = '<div class="waiting">Challenge in progress…</div>';
    const die = $('#die');
    const canRoll = list.some((a) => a.id === 'roll') && !busy;
    die.disabled = !canRoll;
    die.classList.toggle('ready', canRoll);
    $('#dieHint').textContent = canRoll ? 'click to roll' : 'recycled';
  }

  function renderStatus() {
    $('#status').innerHTML = S && S.turn && S.turn.msg ? S.turn.msg : '';
  }

  function renderLog() {
    $('#log').innerHTML = (S ? S.log : []).map((e) => `<li class="log-${e.tone}"><span class="log-r">R${e.r}</span><span>${e.html}</span></li>`).join('');
  }

  function renderPanel() {
    renderTurnCard();
    renderActions();
    renderStatus();
    renderLog();
  }

  function renderDecks() {
    const row = $('#deckRow');
    if (!row.children.length) {
      row.innerHTML = Object.entries(Cards.DECKS).filter(([, d]) => d.tray).map(([k, d]) => `
        <div class="deck" data-deck="${k}" title="${esc(d.name)} deck">
          <img src="${d.img}" alt="${esc(d.name)} deck">
          <span class="deck-count"></span>
        </div>`).join('');
    }
    row.querySelectorAll('.deck').forEach((n) => {
      const left = deckLeft(n.dataset.deck);
      n.querySelector('.deck-count').textContent = left;
      n.title = `${Cards.DECKS[n.dataset.deck].name} deck — ${left === '∞' ? 'endless puzzles' : left + ' cards left'}`;
    });
  }

  function setActiveDeck(deck) {
    document.querySelectorAll('.deck').forEach((n) => n.classList.toggle('active', n.dataset.deck === deck));
  }

  function renderPlayers() {
    const row = $('#playerRow');
    row.style.setProperty('--n', S ? S.players.length : 6);
    if (!S) {
      row.innerHTML = TOKENS.map((t) => `<div class="pchip ghost"><img src="assets/token-${t.key}.png" alt="${t.label}"></div>`).join('');
      return;
    }
    row.innerHTML = S.players.map((p) => `
      <div class="pchip${p.id === S.current && S.phase === 'play' ? ' current' : ''}${S.winner === p.id ? ' winner' : ''}" data-id="${p.id}" style="--pc:${tokenOf(p).color}" title="${esc(p.name)}: ${p.shakti} Shakti, ${p.karma} Karma, ${p.emblems} Emblems, space ${p.pos}">
        <img src="assets/token-${p.token}.png" alt="">
        <div class="pchip-name">${esc(p.name)}</div>
        <div class="pchip-stats"><span class="s">${p.shakti}</span>${p.karma ? `<span class="k">${p.karma}</span>` : ''}${p.emblems ? `<span class="e">${p.emblems}</span>` : ''}</div>
        ${p.qualified ? '<span class="pchip-badge" title="Passed the Grand Green Challenge">✓</span>' : ''}
      </div>`).join('');
  }

  // Up to ten pieces in two rows of five; the tenth slot becomes "+n" when there are more.
  function pieceStack(n, img, emptyText) {
    if (!n) return `<div class="coins"><span class="none">${emptyText}</span></div>`;
    const shown = n > 10 ? 9 : n;
    return `<div class="coins${n <= 5 ? ' few' : ''}">${`<img src="assets/${img}" alt="">`.repeat(shown)}${n > 10 ? `<span class="more">+${n - 9}</span>` : ''}</div>`;
  }

  function renderPieces() {
    const p = S ? cur() : null;
    const n = p ? p.shakti : 5;
    $('#shaktiView').innerHTML = `${pieceStack(n, 'shakti.png', 'No tokens')}
      <div class="piece-count"><b>${n}</b><span>${p ? esc(p.name) : 'each player starts with 5'}</span></div>`;
    const k = p ? p.karma : 0;
    $('#karmaView').innerHTML = `${pieceStack(k, 'karma.png', 'Clear conscience')}
      <div class="piece-count"><b>${k}</b><span>${k ? 'Clear before high-risk challenges' : 'No Karma Debt'}</span></div>`;
  }

  function renderPortalTray() {
    const ports = Board.spaces.filter((s) => s.type === 'mahashakti');
    const taps = Board.spaces.filter((s) => s.type === 'tapasya');
    $('#portalView').innerHTML = `
      <div class="portal-row">
        ${ports.map((s, i) => {
          const open = !S || S.portals[s.index] === 'open';
          return `<div class="portal ${open ? 'open' : 'closed'}" title="Mahashakti Portal ${i + 1} on space ${s.index}: ${open ? 'open' : 'closed'}">
            <span class="medal">${icon('lotus')}</span><small>Space ${s.index}<br>${open ? 'Open' : 'Closed'}</small></div>`;
        }).join('')}
        <div class="portal tapas" title="Tapasya Portals"><span class="medal">${icon('flame')}</span><small>Tapasya<br>${taps.map((s) => s.index).join(' & ')}</small></div>
      </div>`;
  }

  function renderTray() {
    renderDecks();
    renderPlayers();
    renderPieces();
    renderPortalTray();
  }

  function renderAll() {
    if (!S) return;
    renderPawns();
    renderHighlight();
    renderPortals();
    renderPanel();
    renderTray();
  }

  function floatAt(p, text, tone) {
    // Floats live on the box, not the chip, so re-rendering the chips does not cut them short.
    requestAnimationFrame(() => {
      const box = document.querySelector('.box-players');
      const chip = document.querySelector(`.pchip[data-id="${p.id}"]`);
      if (!box || !chip) return;
      const f = document.createElement('span');
      f.className = 'float ' + tone;
      f.textContent = text;
      f.style.left = `${chip.offsetLeft + chip.offsetWidth / 2}px`;
      box.appendChild(f);
      setTimeout(() => f.remove(), 1400);
    });
  }

  function renderLegend() {
    const kinds = ['math', 'science', 'english', 'hindi', 'social', 'memory', 'concentration', 'action', 'eco', 'rishi', 'teamwork', 'shortcut', 'setback', 'grace', 'karmaPit', 'tapasya', 'mahashakti'];
    $('#legend').innerHTML = kinds.map((k) => {
      const d = Board.SPACE_TYPES[k];
      const count = Board.LAYOUT.filter((e) => e.split(':')[0] === k).length;
      return `<li>
        <span class="swatch${d.medallion ? ' medal' : ''}" style="background:${d.color};color:${d.ink}">${UI.badge(d)}</span>
        <div><b>${esc(d.label)}</b> <small>×${count}</small><p>${esc(d.desc)}</p></div>
      </li>`;
    }).join('');
  }

  // ---------- setup ----------

  function showSetup() {
    const saved = loadSaved();
    let rows = [
      { name: 'Player 1', token: 'peacock' },
      { name: 'Player 2', token: 'owl' },
    ];
    let timerKey = 'standard';

    const m = UI.openModal({
      cls: 'setup',
      label: 'New game',
      html: `
        <div class="setup-hero">
          <img class="setup-coin" src="assets/shakti.png" alt="">
          <div>
            <h1>Dhara Rakshak</h1>
            <p class="setup-sub">Quest for a Greener Bharat</p>
            <p class="setup-tag">Ancient Wisdom • Modern Knowledge • Brighter Tomorrow</p>
          </div>
        </div>
        ${saved ? `<div class="resume"><span>A saved game is waiting — Round ${saved.round}, ${saved.players.map((p) => esc(p.name)).join(', ')}.</span><button class="btn btn-primary resume-btn">Resume game</button></div>` : ''}
        <div class="setup-grid">
          <section>
            <h3>Players or teams <small>2–6 · choose a token and a name</small></h3>
            <ol class="prow-list"></ol>
            <button class="btn btn-secondary add-row">+ Add player</button>
          </section>
          <section>
            <h3>Timer</h3>
            <div class="seg" role="radiogroup" aria-label="Timer">
              ${TIMER_MODES.map((t) => `<label class="seg-opt"><input type="radio" name="timer" value="${t.key}" ${t.key === timerKey ? 'checked' : ''}><span><b>${t.label}</b><small>${t.note}</small></span></label>`).join('')}
            </div>
            <h3>Your quest</h3>
            <ul class="setup-points">
              <li>Travel through <b>eight realms</b> from START to FINISH.</li>
              <li>Earn <b>Shakti Tokens</b> with Maths, Science, English, Hindi and Social Science — plus memory, focus and action.</li>
              <li>Avoid <b>Karma</b>, dare the <b>Tapasya</b> and <b>Mahashakti</b> portals, and remember the Dhara Rules.</li>
              <li>Pass the <b>Grand Green Challenge</b> and finish with the most tokens.</li>
            </ul>
            <p class="small">Play together on one screen. The next player in turn order acts as Game Keeper for open tasks.</p>
          </section>
        </div>
        <div class="setup-actions"><button class="btn btn-primary btn-big start">Begin the Quest</button></div>`,
    });

    const list = m.box.querySelector('.prow-list');
    const addBtn = m.box.querySelector('.add-row');

    function paint() {
      list.innerHTML = rows.map((r, i) => `
        <li class="prow" data-i="${i}">
          <div class="token-pick" role="radiogroup" aria-label="Token for player ${i + 1}">
            ${TOKENS.map((t) => {
              const taken = rows.some((o, j) => j !== i && o.token === t.key);
              return `<label class="tp${r.token === t.key ? ' on' : ''}${taken ? ' taken' : ''}" title="${t.label}${taken ? ' (taken)' : ''}" style="--pc:${t.color}">
                <input type="radio" name="tok${i}" value="${t.key}" ${r.token === t.key ? 'checked' : ''} ${taken ? 'disabled' : ''}>
                <img src="assets/token-${t.key}.png" alt="${t.label}"></label>`;
            }).join('')}
          </div>
          <input class="pname-in" type="text" maxlength="18" value="${esc(r.name)}" aria-label="Name of player ${i + 1}">
          <button class="btn btn-icon remove" title="Remove player" aria-label="Remove player ${i + 1}" ${rows.length <= 2 ? 'disabled' : ''}>✕</button>
        </li>`).join('');
      addBtn.disabled = rows.length >= 6;
      list.querySelectorAll('.prow').forEach((li) => {
        const i = Number(li.dataset.i);
        li.querySelectorAll('input[type=radio]').forEach((inp) => inp.addEventListener('change', () => { rows[i].token = inp.value; paint(); }));
        li.querySelector('.pname-in').addEventListener('input', (e) => { rows[i].name = e.target.value; });
        li.querySelector('.remove').addEventListener('click', () => { rows.splice(i, 1); paint(); });
      });
    }
    paint();

    addBtn.addEventListener('click', () => {
      const free = TOKENS.find((t) => !rows.some((r) => r.token === t.key));
      rows.push({ name: `Player ${rows.length + 1}`, token: free.key });
      paint();
    });
    m.box.querySelectorAll('input[name=timer]').forEach((inp) => inp.addEventListener('change', () => { timerKey = inp.value; }));

    m.box.querySelector('.start').addEventListener('click', () => {
      rows = rows.map((r, i) => ({ token: r.token, name: (r.name || '').trim() || `Player ${i + 1}` }));
      m.close();
      beginGame(newState(rows, timerKey), true);
    });
    const resumeBtn = m.box.querySelector('.resume-btn');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        m.close();
        if (saved.turn && saved.turn.phase === 'busy') saved.turn.phase = 'start';
        beginGame(saved, false);
      });
    }
    UI.focusFirst(m.box);
  }

  function beginGame(state, fresh) {
    S = state;
    busy = false;
    const mode = TIMER_MODES.find((t) => t.key === S.timer) || TIMER_MODES[0];
    Challenge.setTimeScale(mode.scale);
    const layer = document.getElementById('pawn-layer');
    if (layer) layer.innerHTML = '';
    setDieFace(5);
    if (fresh) {
      log(`The quest begins! ${S.players.map((p) => pname(p)).join(', ')} set out from START with 5 Shakti Tokens each.`, 'rule');
      startTurn();
      toast(`${pname(cur())} goes first. Roll the die!`, 'turn', 2600);
    } else {
      if (!S.turn) startTurn();
      else { save(); renderAll(); }
      toast('Welcome back! Your quest continues.', 'turn', 2200);
    }
  }

  // ---------- layout ----------

  function fit() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const scale = Math.min(vw / 1536, vh / 1024);
    const wide = vw >= 980 && scale >= 0.6;
    document.body.classList.toggle('compact', !wide);
    const stage = $('#stage'), viewport = $('#viewport');
    if (wide) {
      stage.style.transform = `scale(${scale})`;
      viewport.style.width = `${1536 * scale}px`;
      viewport.style.height = `${1024 * scale}px`;
    } else {
      stage.style.transform = '';
      viewport.style.width = '';
      viewport.style.height = '';
    }
  }

  function bindUi() {
    document.querySelectorAll('.tab-btn').forEach((b) => b.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((x) => {
        const on = x === b;
        x.classList.toggle('active', on);
        x.setAttribute('aria-selected', String(on));
      });
      document.querySelectorAll('.tab-pane').forEach((p) => { p.hidden = p.dataset.pane !== b.dataset.tab; });
    }));
    $('#actions').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (b) act(b.dataset.act);
    });
    $('#die').addEventListener('click', () => act('roll'));
    $('#newGameBtn').addEventListener('click', async () => {
      if (busy) return;
      if (S && S.phase === 'play') {
        const ok = await UI.choice({
          title: 'Start a new game?', iconName: 'leaf',
          body: '<p>The current quest will be abandoned and its saved progress removed.</p>',
          choices: [{ label: 'Start a new game', value: true, primary: true }, { label: 'Keep playing', value: false }],
        });
        if (!ok) return;
        clearSave();
      }
      showSetup();
    });
    document.addEventListener('keydown', (e) => {
      if (document.body.classList.contains('has-modal')) return;
      if (e.target.closest('input, textarea, button')) return;
      if (e.key === 'r' || e.key === 'R' || e.key === ' ') {
        e.preventDefault();
        act(availableActions().some((a) => a.id === 'roll') ? 'roll' : (availableActions()[0] || {}).id);
      }
    });
    window.addEventListener('resize', fit);
  }

  function init() {
    Board.render(document.getElementById('board'));
    renderLegend();
    renderTray();
    bindUi();
    fit();
    showSetup();
  }

  // Exposed for debugging in the browser console.
  DR.Game = { state: () => S, act, renderAll };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.DR = window.DR || {});
