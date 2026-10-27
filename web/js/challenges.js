/* Dhara Rakshak — challenge cards: timers, card renderers and multi-stage trials.
 * Challenge.run(spec) opens a card modal and resolves with { success, bonus, results }.
 * spec: { deck, title, kicker, scenario, intro, stages: [card], mode: 'single' | 'all' | 'grand',
 *         overall: seconds | null, player, keeper, allowBonus } */
(function (DR) {
  'use strict';

  const { UI, Cards } = DR;
  const { esc, sleep } = UI;
  const { shuffle } = Cards.util;
  const CIRC = 2 * Math.PI * 19;

  let timeScale = 1; // 1 standard, 2 relaxed, 0 untimed

  function fmtTime(sec) {
    sec = Math.ceil(sec);
    return sec >= 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : String(sec);
  }

  class Timer {
    constructor(root) {
      this.root = root;
      this.ring = root.querySelector('.ring-fg');
      this.label = root.querySelector('.timer-num');
      this.id = null;
    }
    start(seconds, onExpire) {
      this.stop();
      this.root.classList.remove('low', 'expired', 'idle');
      if (!timeScale) {
        this.root.classList.add('off');
        this.label.textContent = '∞';
        this.ring.style.strokeDashoffset = '0';
        return;
      }
      const total = seconds * timeScale * 1000;
      const end = performance.now() + total;
      const tick = () => {
        const left = Math.max(0, end - performance.now());
        this.label.textContent = fmtTime(left / 1000);
        this.ring.style.strokeDashoffset = String(CIRC * (1 - left / total));
        this.root.classList.toggle('low', left < 6000);
        if (left <= 0) {
          this.stop();
          this.root.classList.add('expired');
          if (onExpire) onExpire();
        }
      };
      tick();
      this.id = setInterval(tick, 200);
    }
    stop() {
      clearInterval(this.id);
      this.id = null;
    }
    idle(text) {
      this.stop();
      this.root.classList.remove('low', 'expired');
      this.root.classList.add('idle');
      this.label.textContent = text || '';
      this.ring.style.strokeDashoffset = '0';
    }
  }

  // ---------- shared pieces ----------

  function qHtml(card) {
    const deva = UI.hasDevanagari(card.q) ? ' deva' : '';
    return `<p class="ch-q${deva}">${esc(card.q)}</p>${card.h ? `<p class="ch-hint">${esc(card.h)}</p>` : ''}`;
  }

  function feedback(ctx, pass, title, detail) {
    const f = ctx.body.querySelector('.ch-feedback') || ctx.body.appendChild(Object.assign(document.createElement('div'), { className: 'ch-feedback' }));
    f.className = 'ch-feedback show ' + (pass ? 'good' : 'bad');
    f.innerHTML = `<strong>${pass ? '✓' : '✗'} ${esc(title)}</strong>${detail ? `<span>${esc(detail)}</span>` : ''}`;
  }

  // After a card is decided: wait for "Continue", or move on automatically during a timed trial.
  function settle(ctx, resolve, result) {
    if (ctx.auto && result.pass) {
      setTimeout(() => resolve(result), 900);
      return;
    }
    ctx.foot.innerHTML = `<button class="btn btn-primary" data-autofocus>${esc(ctx.nextLabel || 'Continue')}</button>`;
    const b = ctx.foot.querySelector('button');
    b.addEventListener('click', () => resolve(result), { once: true });
    UI.focusFirst(ctx.foot);
  }

  function countdown(ctx, seconds, label, contentHtml) {
    return new Promise((resolve) => {
      ctx.body.innerHTML = `
        <div class="phase">
          <div class="phase-label">${esc(label)} <b class="phase-num">${seconds}</b></div>
          <div class="phase-bar"><i style="animation-duration:${seconds}s"></i></div>
          ${contentHtml}
        </div>`;
      ctx.foot.innerHTML = '';
      const num = ctx.body.querySelector('.phase-num');
      let left = seconds;
      const id = setInterval(() => {
        left -= 1;
        if (num) num.textContent = Math.max(0, left);
        if (left <= 0) { clearInterval(id); resolve(); }
      }, 1000);
      ctx.onAbort(() => { clearInterval(id); resolve(); });
    });
  }

  // ---------- renderers ----------

  /* Multiple choice. `preHtml` is shown above the question (grids, sequences…). */
  function mcq(card, ctx, preHtml) {
    return new Promise((resolve) => {
      const correct = String(card.o[0]);
      const opts = shuffle([...new Set(card.o.map(String))]);
      const emojiOpts = opts.every((o) => o.length <= 4 && /\p{Extended_Pictographic}/u.test(o));
      ctx.body.innerHTML = `
        ${preHtml || ''}
        ${card.display ? `<div class="ch-show">${esc(card.display)}</div>` : ''}
        ${qHtml(card)}
        <div class="ch-options${emojiOpts ? ' emoji' : ''}">
          ${opts.map((o, i) => `<button class="opt${UI.hasDevanagari(o) ? ' deva' : ''}" data-i="${i}"><span class="opt-key">${'ABCD'[i]}</span><span class="opt-text">${esc(o)}</span></button>`).join('')}
        </div>
        <div class="ch-feedback"></div>`;
      ctx.foot.innerHTML = '';
      const buttons = [...ctx.body.querySelectorAll('.opt')];
      let done = false;
      const finish = (chosen, timeout) => {
        if (done) return;
        done = true;
        ctx.stopTimer();
        const pass = chosen != null && opts[chosen] === correct;
        buttons.forEach((b, i) => {
          b.disabled = true;
          if (opts[i] === correct) b.classList.add('correct');
        });
        if (chosen != null && !pass) buttons[chosen].classList.add('wrong');
        feedback(ctx, pass, timeout ? "Time's up!" : pass ? 'Correct!' : 'Not quite.', card.x || (pass ? '' : 'Correct answer: ' + correct));
        settle(ctx, resolve, { pass, timeout: !!timeout });
      };
      buttons.forEach((b, i) => b.addEventListener('click', () => finish(i)));
      ctx.startTimer(card.time || 30, () => finish(null, true));
      ctx.onAbort(() => finish(null, true));
      UI.focusFirst(ctx.body);
    });
  }

  /* Open task judged by the Game Keeper (Action, Eco-Mission, Teamwork, slogans). */
  function judge(card, ctx) {
    return new Promise((resolve) => {
      const who = ctx.team ? 'the team' : esc(ctx.player);
      ctx.body.innerHTML = `
        ${qHtml(card)}
        ${card.time ? `<p class="ch-note">Time limit: ${fmtTime(card.time * (timeScale || 1))}${timeScale ? '' : ' (untimed game)'}${ctx.team ? ' · Everyone may help' : ''}</p>` : ''}
        ${card.input ? `<textarea class="ch-input${UI.hasDevanagari(card.q) ? ' deva' : ''}" rows="3" placeholder="${esc(card.placeholder || 'Type your answer here, or say it aloud…')}"></textarea>` : ''}
        ${card.sample ? `<details class="keeper-guide"><summary>Game Keeper's guide</summary><p class="${UI.hasDevanagari(card.sample) ? 'deva' : ''}">${esc(card.sample)}</p><p class="small">Accept any answer that is accurate and reasonable, even if worded differently (Rule 7).</p></details>` : ''}
        <div class="judge">
          <p class="judge-q"><b>Game Keeper${ctx.keeper ? ' (' + esc(ctx.keeper) + ')' : ''}:</b> did ${who} complete the task?</p>
          <div class="judge-btns">
            <button class="btn btn-good" data-v="yes">✓ Completed</button>
            <button class="btn btn-bad" data-v="no">✗ Not completed</button>
          </div>
        </div>
        <div class="bonus-ask" hidden>
          <p><b>Environmental bonus:</b> was the solution practical and creative? (+1 token)</p>
          <div class="judge-btns">
            <button class="btn btn-good" data-b="yes">Yes, +1 bonus</button>
            <button class="btn btn-secondary" data-b="no">No bonus</button>
          </div>
        </div>
        <div class="ch-feedback"></div>`;
      ctx.foot.innerHTML = '';
      let done = false;
      const finish = (pass, bonus, timeout) => {
        if (done) return;
        done = true;
        ctx.stopTimer();
        ctx.body.querySelectorAll('.judge button, .bonus-ask button').forEach((b) => { b.disabled = true; });
        const ta = ctx.body.querySelector('.ch-input');
        if (ta) ta.readOnly = true;
        feedback(ctx, pass, timeout ? "Time's up!" : pass ? (bonus ? 'Task completed — with a bonus!' : 'Task completed!') : 'Task not completed.', '');
        settle(ctx, resolve, { pass, bonus: !!bonus, timeout: !!timeout });
      };
      ctx.body.querySelector('[data-v="yes"]').addEventListener('click', () => {
        if (card.bonus && ctx.allowBonus) {
          ctx.body.querySelector('.judge').hidden = true;
          ctx.body.querySelector('.bonus-ask').hidden = false;
        } else finish(true, false);
      });
      ctx.body.querySelector('[data-v="no"]').addEventListener('click', () => finish(false));
      ctx.body.querySelectorAll('[data-b]').forEach((b) => b.addEventListener('click', () => finish(true, b.dataset.b === 'yes')));
      ctx.startTimer(card.time || 60, () => {
        const q = ctx.body.querySelector('.judge-q');
        if (q && !done) q.innerHTML = `<b>Time's up!</b> Game Keeper: was the task completed within the time limit?`;
      });
      ctx.onAbort(() => finish(false, false, true));
      const ta = ctx.body.querySelector('.ch-input');
      if (ta) setTimeout(() => ta.focus({ preventScroll: true }), 80);
    });
  }

  /* Memorise a word sequence, optionally wait, then rebuild it in order. */
  async function memSeq(card, ctx) {
    const chips = card.words.map((w, i) => `<span class="chip big"><i>${i + 1}</i>${esc(w)}</span>`).join('');
    ctx.stopTimer();
    if (ctx.idle) ctx.idle('👁');
    await countdown(ctx, card.show, 'Memorise these words in order:', `<div class="chips">${chips}</div>`);
    if (card.delay && !ctx.aborted()) await countdown(ctx, card.delay, 'Hold them in your mind…', '<div class="hold">🧘</div>');
    if (ctx.aborted()) return { pass: false, timeout: true };
    return new Promise((resolve) => {
      const picked = [];
      ctx.body.innerHTML = `
        <p class="ch-q">Tap the words in the order they were shown.</p>
        <div class="slots">${card.words.map((_, i) => `<span class="slot" data-s="${i}"><i>${i + 1}</i><b></b></span>`).join('')}</div>
        <div class="pool">${card.pool.map((w, i) => `<button class="chip-btn" data-i="${i}">${esc(w)}</button>`).join('')}</div>
        <div class="row-end"><button class="btn btn-link undo" disabled>↶ Undo</button></div>
        <div class="ch-feedback"></div>`;
      ctx.foot.innerHTML = '';
      const slots = [...ctx.body.querySelectorAll('.slot b')];
      const pool = [...ctx.body.querySelectorAll('.chip-btn')];
      const undo = ctx.body.querySelector('.undo');
      let done = false;
      const finish = (timeout) => {
        if (done) return;
        done = true;
        ctx.stopTimer();
        pool.forEach((b) => { b.disabled = true; });
        undo.disabled = true;
        const pass = !timeout && picked.length === card.words.length && picked.every((w, i) => w === card.words[i]);
        ctx.body.querySelectorAll('.slot').forEach((s, i) => s.classList.add(picked[i] === card.words[i] ? 'ok' : 'bad'));
        feedback(ctx, pass, timeout ? "Time's up!" : pass ? 'Perfect recall!' : 'Not quite.', pass ? '' : 'Correct order: ' + card.words.join(' – '));
        settle(ctx, resolve, { pass, timeout: !!timeout });
      };
      const paint = () => {
        slots.forEach((s, i) => { s.textContent = picked[i] || ''; });
        pool.forEach((b) => { b.disabled = picked.includes(card.pool[Number(b.dataset.i)]); });
        undo.disabled = !picked.length;
      };
      pool.forEach((b) => b.addEventListener('click', () => {
        if (done) return;
        picked.push(card.pool[Number(b.dataset.i)]);
        paint();
        if (picked.length === card.words.length) finish(false);
      }));
      undo.addEventListener('click', () => { picked.pop(); paint(); });
      ctx.startTimer(card.time || 30, () => finish(true));
      ctx.onAbort(() => finish(true));
    });
  }

  async function showThenAsk(card, ctx, label, showHtml, preHtml) {
    ctx.stopTimer();
    if (ctx.idle) ctx.idle('👁');
    await countdown(ctx, card.show, label, showHtml);
    if (ctx.aborted()) return { pass: false, timeout: true };
    return mcq(card, ctx, preHtml);
  }

  function emojiGrid(cells, cols, cls) {
    return `<div class="egrid ${cls || ''}" style="--cols:${cols}">${cells.map((c) => `<span>${c}</span>`).join('')}</div>`;
  }

  function memMissing(card, ctx) {
    return showThenAsk(card, ctx, 'Remember these:', `<div class="erow">${card.shown.map((e) => `<span>${e}</span>`).join('')}</div>`);
  }

  function memGrid(card, ctx) {
    const hidden = card.cells.map((_, i) => (i === card.ask ? '❓' : ''));
    return showThenAsk(card, ctx, 'Remember where each picture is:', emojiGrid(card.cells, 3, 'big'), emojiGrid(hidden, 3, 'big ask'));
  }

  function memNumber(card, ctx) {
    return showThenAsk(card, ctx, 'Read and remember:', `<p class="fact">${esc(card.fact)}</p>`);
  }

  function conCount(card, ctx) {
    return mcq(card, ctx, emojiGrid(card.cells, 6, ''));
  }

  /* Tap-to-find tasks: odd one out, or the difference between two rows. */
  function tapFind(card, ctx, html, prompt, target, cellsSel) {
    return new Promise((resolve) => {
      ctx.body.innerHTML = `<p class="ch-q">${esc(prompt)}</p>${html}<div class="ch-feedback"></div>`;
      ctx.foot.innerHTML = '';
      const cells = [...ctx.body.querySelectorAll(cellsSel)];
      let done = false;
      const finish = (i, timeout) => {
        if (done) return;
        done = true;
        ctx.stopTimer();
        cells.forEach((c) => { c.disabled = true; });
        cells[target].classList.add('hit');
        if (i != null && i !== target) cells[i].classList.add('miss');
        const pass = i === target;
        feedback(ctx, pass, timeout ? "Time's up!" : pass ? 'Sharp eyes!' : 'Missed it.', pass ? '' : 'The highlighted one was the answer.');
        settle(ctx, resolve, { pass, timeout: !!timeout });
      };
      cells.forEach((c, i) => c.addEventListener('click', () => finish(i)));
      ctx.startTimer(card.time || 20, () => finish(null, true));
      ctx.onAbort(() => finish(null, true));
    });
  }

  function conOdd(card, ctx) {
    const n = card.cols * card.rows;
    const cells = Array.from({ length: n }, (_, i) => `<button class="ecell">${i === card.at ? card.odd : card.base}</button>`).join('');
    return tapFind(card, ctx, `<div class="egrid tap" style="--cols:${card.cols}">${cells}</div>`, 'One picture is different from all the others. Tap it!', card.at, '.ecell');
  }

  function conSpot(card, ctx) {
    const row1 = `<div class="erow fixed">${card.row.map((e) => `<span>${e}</span>`).join('')}</div>`;
    const row2 = `<div class="erow tap">${card.row2.map((e) => `<button class="ecell">${e}</button>`).join('')}</div>`;
    return tapFind(card, ctx, `<div class="spot"><small>Row A</small>${row1}<small>Row B — tap the difference</small>${row2}</div>`, 'Row B is a copy of Row A with one change. Tap the picture in Row B that is different.', card.at, '.erow.tap .ecell');
  }

  /* Grand Challenge memory: pick the Dhara Rules that were revealed during the game. */
  function rulesRecall(card, ctx) {
    return new Promise((resolve) => {
      if (!card.need) {
        feedback(ctx, true, 'No rules have been revealed yet — this stage is passed.', '');
        settle(ctx, resolve, { pass: true });
        return;
      }
      ctx.body.innerHTML = `
        <p class="ch-q">Which ${card.need} of these waste-management rules were revealed as <b>Dhara Rules</b> during the game?</p>
        <p class="ch-hint">Select exactly ${card.need}.</p>
        <div class="rules-pick">${card.options.map((r, i) => `<label class="rule-opt"><input type="checkbox" data-i="${i}"><span>${esc(r)}</span></label>`).join('')}</div>
        <div class="ch-feedback"></div>`;
      ctx.foot.innerHTML = '<button class="btn btn-primary submit" disabled>Submit</button>';
      const boxes = [...ctx.body.querySelectorAll('input')];
      const submit = ctx.foot.querySelector('.submit');
      let done = false;
      boxes.forEach((b) => b.addEventListener('change', () => {
        submit.disabled = boxes.filter((x) => x.checked).length !== card.need;
      }));
      const finish = (timeout) => {
        if (done) return;
        done = true;
        ctx.stopTimer();
        const chosen = boxes.filter((b) => b.checked).map((b) => card.options[Number(b.dataset.i)]);
        const pass = !timeout && chosen.length === card.need && chosen.every((r) => card.correct.includes(r));
        boxes.forEach((b) => {
          b.disabled = true;
          const lab = b.closest('.rule-opt');
          if (card.correct.includes(card.options[Number(b.dataset.i)])) lab.classList.add('correct');
          else if (b.checked) lab.classList.add('wrong');
        });
        feedback(ctx, pass, timeout ? "Time's up!" : pass ? 'You remembered the Dhara Rules!' : 'Not quite.', pass ? '' : 'The revealed rules are highlighted.');
        settle(ctx, resolve, { pass, timeout: !!timeout });
      };
      submit.addEventListener('click', () => finish(false));
      ctx.startTimer(card.time || 45, () => finish(true));
      ctx.onAbort(() => finish(true));
    });
  }

  const RENDERERS = {
    mcq: (c, ctx) => mcq(c, ctx),
    judge,
    'mem-seq': memSeq,
    'mem-missing': memMissing,
    'mem-grid': memGrid,
    'mem-number': memNumber,
    'con-odd': conOdd,
    'con-count': conCount,
    'con-spot': conSpot,
    'rules-recall': rulesRecall,
  };

  // ---------- the challenge modal ----------

  function shell(spec, deck) {
    const steps = spec.stages.length > 1
      ? `<ol class="ch-steps">${spec.stages.map((s, i) => `<li data-step="${i}"><span>${i + 1}</span>${esc(s.label || 'Stage ' + (i + 1))}</li>`).join('')}</ol>`
      : '';
    return `
      <div class="ch" style="--deck:${deck.color};--deck-ink:${deck.ink || '#fff'}">
        <header class="ch-head">
          <div class="ch-badge">${UI.badge(deck)}</div>
          <div class="ch-titles">
            <div class="ch-kicker">${esc(spec.kicker || '')}</div>
            <h2 class="ch-title">${esc(spec.title || deck.name)}</h2>
          </div>
          <div class="ch-timer" role="timer" aria-label="Time left">
            <svg viewBox="0 0 44 44" aria-hidden="true"><circle class="ring-bg" cx="22" cy="22" r="19"></circle><circle class="ring-fg" cx="22" cy="22" r="19" stroke-dasharray="${CIRC.toFixed(2)}"></circle></svg>
            <span class="timer-num"></span>
          </div>
        </header>
        <div class="ch-meta">${spec.team ? 'Teamwork Bridge — everyone plays' : `Dhara Rakshak: <b>${esc(spec.player)}</b>`}${spec.keeper ? ` · Game Keeper: <b>${esc(spec.keeper)}</b>` : ''}</div>
        ${steps}
        <div class="ch-body" aria-live="polite"></div>
        <footer class="ch-foot"></footer>
      </div>`;
  }

  function grandFailed(results) {
    const subjectFails = results.slice(0, 5).filter((r) => !r.pass).length;
    return subjectFails >= 2 || (results[5] && !results[5].pass) || (results[6] && !results[6].pass);
  }

  function summarise(spec, results) {
    if (spec.mode === 'grand') {
      const subjects = results.slice(0, 5).filter((r) => r.pass).length;
      const success = results.length === spec.stages.length && subjects >= 4 && results[5].pass && results[6].pass;
      return { success, bonus: false, results, subjects };
    }
    const success = results.length === spec.stages.length && results.every((r) => r.pass);
    return { success, bonus: results.length === 1 && !!results[0].bonus, results, timeout: results.some((r) => r.timeout) };
  }

  function waitButton(foot, label, cls) {
    return new Promise((resolve) => {
      foot.innerHTML = `<button class="btn ${cls || 'btn-primary'}" data-autofocus>${esc(label)}</button>`;
      foot.querySelector('button').addEventListener('click', resolve, { once: true });
      UI.focusFirst(foot);
    });
  }

  async function run(spec) {
    const deck = Cards.DECKS[spec.deck] || Cards.DECKS.grand;
    const m = UI.openModal({ cls: 'challenge', html: shell(spec, deck), label: spec.title || deck.name });
    const body = m.box.querySelector('.ch-body');
    const foot = m.box.querySelector('.ch-foot');
    const timer = new Timer(m.box.querySelector('.ch-timer'));
    const single = spec.stages.length === 1;
    const aborters = new Set();
    let expired = false;

    const ctx = {
      body, foot,
      player: spec.player, keeper: spec.keeper, team: spec.team, allowBonus: spec.allowBonus,
      startTimer: (sec, onExpire) => { if (!spec.overall) timer.start(sec, onExpire); },
      stopTimer: () => { if (!spec.overall) timer.stop(); },
      idle: (t) => { if (!spec.overall) timer.idle(t); },
      onAbort: (fn) => aborters.add(fn),
      aborted: () => expired,
    };

    if (spec.intro) {
      timer.idle(spec.overall ? fmtTime(spec.overall * (timeScale || 1)) : '');
      body.innerHTML = spec.intro;
      await waitButton(foot, spec.overall ? 'Begin — start the clock' : 'Begin');
    } else {
      timer.idle('');
    }

    if (spec.overall) {
      timer.start(spec.overall, () => {
        expired = true;
        aborters.forEach((f) => f());
      });
    }

    const results = [];
    for (let i = 0; i < spec.stages.length; i++) {
      aborters.clear();
      const card = spec.stages[i];
      const stepEl = m.box.querySelector(`[data-step="${i}"]`);
      if (stepEl) stepEl.classList.add('current');
      if (!single) m.box.querySelector('.ch-kicker').textContent = `Stage ${i + 1} of ${spec.stages.length}${card.label ? ' · ' + card.label : ''}`;
      ctx.auto = !!spec.overall;
      ctx.nextLabel = single ? 'Continue' : (i < spec.stages.length - 1 ? 'Next stage ▶' : 'See the result');
      const r = expired ? { pass: false, timeout: true } : await RENDERERS[card.kind](card, ctx);
      results.push(r);
      if (stepEl) { stepEl.classList.remove('current'); stepEl.classList.add(r.pass ? 'pass' : 'fail'); }
      if (!r.pass && spec.mode === 'all') break;
      if (spec.mode === 'grand' && grandFailed(results)) break;
    }
    timer.stop();
    const outcome = summarise(spec, results);

    if (!single) {
      m.box.querySelector('.ch-kicker').textContent = 'Result';
      const passed = results.filter((r) => r.pass).length;
      let line;
      if (spec.mode === 'grand') {
        line = outcome.success
          ? `Subjects correct: ${outcome.subjects} of 5 · Memory ✓ · Creative Action ✓`
          : 'You need 4 of 5 subject stages plus the Memory and Creative Action tasks. You can try again on your next turn.';
      } else {
        line = outcome.success ? `All ${spec.stages.length} stages passed!` : (outcome.timeout ? 'The time ran out.' : `Stage ${results.length} was not passed.`) + ` (${passed} of ${spec.stages.length} stages passed)`;
      }
      body.innerHTML = `
        <div class="summary ${outcome.success ? 'good' : 'bad'}">
          <div class="summary-icon">${outcome.success ? '🌟' : '🌧️'}</div>
          <h3>${outcome.success ? esc(spec.successTitle || 'Challenge complete!') : esc(spec.failTitle || 'Challenge failed')}</h3>
          <p>${esc(line)}</p>
          ${outcome.success && spec.successText ? `<p class="summary-reward">${esc(spec.successText)}</p>` : ''}
          ${!outcome.success && spec.failText ? `<p class="summary-penalty">${esc(spec.failText)}</p>` : ''}
        </div>`;
      await waitButton(foot, 'Continue');
    }
    m.close();
    await sleep(120);
    return outcome;
  }

  DR.Challenge = {
    run,
    setTimeScale: (s) => { timeScale = s; },
    getTimeScale: () => timeScale,
  };
})(window.DR = window.DR || {});
