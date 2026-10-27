/* Dhara Rakshak — small UI helpers: escaping, icons, modals, choices and toasts. */
(function (DR) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function icon(name, cls) {
    return `<svg class="ic ${cls || ''}" aria-hidden="true"><use href="#ic-${name}"></use></svg>`;
  }

  // Badge for a deck or space definition: an SVG icon, or a text glyph (π, अ).
  function badge(def, cls) {
    if (!def) return '';
    if (def.glyph) return `<span class="glyph ${cls || ''}" aria-hidden="true">${esc(def.glyph)}</span>`;
    return icon(def.icon, cls);
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const hasDevanagari = (s) => /[ऀ-ॿ]/.test(String(s));

  function openModal({ cls, html, label }) {
    const root = document.getElementById('modalRoot');
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    const box = document.createElement('div');
    box.className = 'modal ' + (cls || '');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    if (label) box.setAttribute('aria-label', label);
    box.innerHTML = html;
    wrap.appendChild(box);
    root.appendChild(wrap);
    document.body.classList.add('has-modal');
    requestAnimationFrame(() => wrap.classList.add('show'));
    return {
      wrap, box,
      close() {
        wrap.classList.remove('show');
        wrap.classList.add('hide');
        setTimeout(() => {
          wrap.remove();
          if (!root.children.length) document.body.classList.remove('has-modal');
        }, 220);
      },
    };
  }

  function focusFirst(box) {
    const b = box.querySelector('[data-autofocus], button:not([disabled])');
    if (b) setTimeout(() => b.focus({ preventScroll: true }), 60);
  }

  /* choices: [{ label, value, primary, disabled, note }] → resolves with the chosen value. */
  function choice({ title, kicker, body, choices, tone, iconName }) {
    return new Promise((resolve) => {
      const m = openModal({
        cls: 'choice tone-' + (tone || 'parchment'),
        label: title,
        html: `
          <header class="choice-head">
            ${iconName ? `<div class="choice-icon">${icon(iconName)}</div>` : ''}
            <div>${kicker ? `<div class="kicker">${esc(kicker)}</div>` : ''}<h2>${esc(title)}</h2></div>
          </header>
          <div class="choice-body">${body || ''}</div>
          <div class="choice-actions">
            ${choices.map((c, i) => `
              <button class="btn ${c.primary ? 'btn-primary' : 'btn-secondary'}" data-i="${i}" ${c.disabled ? 'disabled' : ''}>
                <span>${esc(c.label)}</span>${c.note ? `<small>${esc(c.note)}</small>` : ''}
              </button>`).join('')}
          </div>`,
      });
      m.box.querySelectorAll('.choice-actions .btn').forEach((b) => {
        b.addEventListener('click', () => {
          m.close();
          resolve(choices[Number(b.dataset.i)].value);
        });
      });
      focusFirst(m.box);
    });
  }

  function notice(title, body, opts) {
    return choice(Object.assign({ title, body, choices: [{ label: (opts && opts.button) || 'Continue', value: true, primary: true }] }, opts || {}));
  }

  function toast(html, tone, ms) {
    const root = document.getElementById('toastRoot');
    const t = document.createElement('div');
    t.className = 'toast tone-' + (tone || 'info');
    t.innerHTML = html;
    root.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 400);
    }, ms || 3200);
  }

  DR.UI = { esc, icon, badge, sleep, hasDevanagari, openModal, focusFirst, choice, notice, toast };
})(window.DR = window.DR || {});
