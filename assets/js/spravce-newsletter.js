// Správce: záložky Rezervace / Newsletter a celá správa newsletteru.
// Ostrý režim volá api/newsletter-admin.php (PHP, přihlášení heslem). Na GitHub Pages, z lokálního souboru
// nebo když PHP neodpovídá, běží ukázkový režim se smyšlenými odběrateli a nic se neodesílá.
(() => {
  'use strict';
  const API = 'api/newsletter-admin.php';
  const TEMPLATE = 'assets/email/newsletter.html';
  const SABLONY = 'assets/email/sablony.json';
  const DEMO_DISCOUNT = 5;   // jen pro ukázku bez PHP; ostrá hodnota přijde ze serveru (config sleva_procent)
  const DEMO_KEY = 'mkb-nl-ukazka';
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' });
  const fmtDateTime = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const STATUS = { confirmed: 'Potvrzený', pending: 'Čeká na potvrzení', unsubscribed: 'Odhlášený' };
  const SOURCE = { web: 'web', rezervace: 'rezervace' };

  /* ---------- záložky ---------- */
  const tabs = [...document.querySelectorAll('.admin-tabs [role="tab"]')];
  let started = false;
  const showTab = (id, focus) => {
    tabs.forEach((t) => {
      const on = t.id === id;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      if (on && focus) t.focus();
    });
    if (id === 't-newsletter') { if (!started) { started = true; start(); } history.replaceState(null, '', '#newsletter'); }
    else history.replaceState(null, '', location.pathname + location.search);
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => showTab(t.id));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      showTab(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].id, true);
    });
  });

  /* ---------- stav ---------- */
  let demo = /github\.io$/.test(location.hostname) || location.protocol === 'file:';
  let csrf = '';
  let data = { odberatele: [], kampane: [], test_email: '', davka: 25, sleva_procent: 0 };
  let filter = '';
  let template = '';

  async function api(action, fields = {}) {
    const body = new FormData();
    body.set('a', action);
    for (const [k, v] of Object.entries(fields)) body.set(k, v);
    const res = await fetch(API, { method: 'POST', body, credentials: 'same-origin', headers: { Accept: 'application/json', 'X-CSRF': csrf } });
    const json = await res.json().catch(() => null);
    if (!json) { const e = new Error('Server neodpovídá.'); e.noApi = true; throw e; }
    if (res.status === 401 && action !== 'prihlasit') { showLogin(); throw new Error('Přihlášení vypršelo.'); }
    if (!res.ok || !json.ok) throw new Error(json.error || 'Něco se nepovedlo.');
    return json;
  }

  /* ---------- ukázková data ---------- */
  const day = 86400;
  const now = () => Math.floor(Date.now() / 1000);
  function demoData() {
    try { const saved = JSON.parse(localStorage.getItem(DEMO_KEY)); if (saved?.odberatele) return { ...saved, sleva_procent: DEMO_DISCOUNT }; } catch { /* bez úložiště */ }
    const t = now();
    const names = ['adam.novotny', 'petr.vesely', 'lukas.horak', 'jakub.dvorak', 'filip.cerny', 'david.prochazka', 'matej.kucera', 'ondrej.marek', 'vojta.pokorny', 'daniel.kral', 'simon.benes', 'michal.fiala'];
    const st = ['confirmed', 'confirmed', 'confirmed', 'pending', 'confirmed', 'confirmed', 'unsubscribed', 'confirmed', 'confirmed', 'pending', 'confirmed', 'confirmed'];
    return {
      odberatele: names.map((n, i) => ({ id: i + 1, email: `${n}@example.cz`, status: st[i], source: i % 3 ? 'web' : 'rezervace', created_at: t - (i * 4 + 1) * day })),
      kampane: [{ id: 1, subject: 'Listopad: volné termíny ve čtvrtek', status: 'done', created_at: t - 9 * day, finished_at: t - 9 * day + 60, total: 7, sent: 7, failed: 0 }],
      test_email: 'info@marcuskoky.cz', davka: 3, sleva_procent: DEMO_DISCOUNT,
    };
  }
  const saveDemo = () => { try { localStorage.setItem(DEMO_KEY, JSON.stringify(data)); } catch { /* bez úložiště */ } };

  /* ---------- start a přihlášení ---------- */
  async function start() {
    loadTemplate();
    loadSablony();
    if (!demo) {
      try {
        const s = await api('stav');
        if (!s.prihlasen) { showLogin(s.nastaveno ? '' : 'Na serveru zatím není nastavené heslo (api/config.php).'); return; }
        csrf = s.csrf;
        await openApp();
        return;
      } catch (err) {
        if (!err.noApi) { showLogin(err.message); return; }
        demo = true;   // PHP tu neběží (např. python http.server): ukázka
      }
    }
    data = demoData();
    $('#nl-demo-note').hidden = false;
    openApp();
  }
  function showLogin(msg = '') {
    $('#nl-app').hidden = true;
    $('#nl-login').hidden = false;
    $('#nl-login .nl-amsg').textContent = msg;
    $('#nl-login input').focus();
  }
  $('#nl-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const out = $('#nl-login .nl-amsg');
    const btn = e.target.querySelector('button');
    btn.disabled = true; out.textContent = '';
    try {
      const r = await api('prihlasit', { heslo: e.target.elements.heslo.value });
      csrf = r.csrf;
      e.target.reset();
      await openApp();
    } catch (err) { out.textContent = err.message; } finally { btn.disabled = false; }
  });
  $('#nl-logout').addEventListener('click', async () => {
    try { await api('odhlasit'); } catch { /* i tak zpět na přihlášení */ }
    csrf = '';
    showLogin('Odhlášeno.');
  });

  async function openApp() {
    if (!demo) data = await api('prehled');
    $('#nl-login').hidden = true;
    $('#nl-app').hidden = false;
    $('#nl-logout').hidden = demo;
    $('#nl-test').textContent = `Poslat test na ${data.test_email || 'můj e-mail'}`;
    syncDiscountUi();
    render();
    preview();
  }
  const reload = async () => { if (!demo) data = await api('prehled'); else saveDemo(); render(); };

  /* ---------- výpis ---------- */
  function render() {
    const subs = data.odberatele;
    const count = (s) => subs.filter((x) => x.status === s).length;
    const confirmed = count('confirmed');
    $('#nl-stats').innerHTML = [
      ['Potvrzení odběratelé', confirmed], ['Čekají na potvrzení', count('pending')],
      ['Odhlášení', count('unsubscribed')], ['Odeslaných e-mailů', data.kampane.reduce((a, c) => a + Number(c.sent), 0)],
    ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    $('#nl-send').textContent = `Odeslat všem (${confirmed})`;
    $('#nl-send').disabled = confirmed === 0;

    const rows = subs.filter((s) => !filter || s.status === filter);
    $('#nl-subs').innerHTML = rows.length ? rows.map((s) => `<tr>
      <td class="nl-email">${esc(s.email)}</td>
      <td><span class="nl-badge nl-badge--${esc(s.status)}">${STATUS[s.status] || esc(s.status)}</span></td>
      <td>${fmtDate.format(new Date(s.created_at * 1000))}</td>
      <td>${SOURCE[s.source] || esc(s.source)}</td>
      <td class="nl-row-act"><button type="button" class="nl-del" data-del="${Number(s.id)}" aria-label="Smazat ${esc(s.email)}">Smazat</button></td>
    </tr>`).join('') : '<tr><td colspan="5" class="nl-empty">Zatím tu nikdo není.</td></tr>';

    const camps = data.kampane;
    $('#nl-history').innerHTML = camps.length ? camps.map((c) => `<li>
      <div><strong>${esc(c.subject)}</strong><span>${fmtDateTime.format(new Date(c.created_at * 1000))}</span></div>
      <div class="nl-hist-side">${c.status === 'done'
        ? `<span class="nl-badge nl-badge--confirmed">Odesláno ${Number(c.sent)}/${Number(c.total)}</span>${Number(c.failed) ? `<span class="nl-badge nl-badge--unsubscribed">Chyba ${Number(c.failed)}</span>` : ''}`
        : `<span class="nl-badge nl-badge--pending">Rozesílá se ${Number(c.sent)}/${Number(c.total)}</span><button type="button" class="nl-del" data-resume="${Number(c.id)}">Pokračovat</button>`}</div>
    </li>`).join('') : '<li class="nl-empty">Zatím nic neodešlo.</li>';
  }

  $('#nl-filter').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    filter = b.dataset.f;
    $('#nl-filter').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    render();
  });

  // Smazat: první klik se zeptá, druhý do 4 s smaže (bez systémového okna).
  $('#nl-subs').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-del]'); if (!b) return;
    if (!b.classList.contains('is-armed')) {
      b.classList.add('is-armed'); b.textContent = 'Opravdu smazat?';
      setTimeout(() => { if (b.isConnected) { b.classList.remove('is-armed'); b.textContent = 'Smazat'; } }, 4000);
      return;
    }
    const id = Number(b.dataset.del);
    try {
      if (demo) data.odberatele = data.odberatele.filter((s) => s.id !== id);
      else await api('smazat', { id });
      await reload();
      say('Odběratel smazán i s historií souhlasu.', true);
    } catch (err) { say(err.message, false); }
  });
  $('#nl-history').addEventListener('click', (e) => {
    const b = e.target.closest('[data-resume]');
    if (b) sendAll(Number(b.dataset.resume));
  });

  /* ---------- editor: šablony, varianty předmětu a preheader ----------
     Pole se vkládají odsud, aby se nemuselo sahat do spravce.html. */
  const editor = $('#nl-editor');
  const frame = $('#nl-frame');
  const style = document.createElement('style');
  style.textContent = `
    .nl-tpl-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 4px; }
    .nl-tpl-row button, .nl-alt button { min-height: 40px; padding: 0 14px; border: 1px solid rgba(244,239,230,.2); border-radius: 2px; background: none; color: var(--muted); font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; transition: border-color .2s, color .2s, background .2s; }
    .nl-tpl-row button:hover, .nl-alt button:hover { border-color: var(--gold); color: var(--text); }
    .nl-tpl-row button[aria-pressed="true"] { border-color: var(--gold); background: var(--gold); color: var(--black); }
    .nl-alt { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: -8px; color: var(--muted); font-size: 13px; }
    .nl-alt button { min-height: 32px; padding: 0 10px; font-size: 13px; font-weight: 600; }
    .nl-alt button[aria-pressed="true"] { border-color: var(--gold); color: var(--gold); }
    .nl-warn { padding: 10px 14px; border: 1px dashed rgba(255,212,0,.7); background: rgba(255,212,0,.08); color: var(--yellow); font-size: 14px; }
  `;
  document.head.append(style);
  editor.insertAdjacentHTML('afterbegin', `<div class="nl-afield"><span id="nl-tpl-label">Hotová šablona</span>
    <div class="nl-tpl-row" role="group" aria-labelledby="nl-tpl-label" id="nl-tpl"><button type="button" aria-pressed="true" data-tpl="">Prázdný e-mail</button></div></div>`);
  // varianty předmětu stojí mimo <label>, aby klik na ně neaktivoval pole předmětu
  editor.elements.predmet.closest('label').insertAdjacentHTML('afterend', `<div class="nl-alt" id="nl-alt" role="group" aria-label="Jiný předmět" hidden></div>
    <label class="nl-afield"><span>Náhledový text (preheader)</span>
    <input name="preheader" maxlength="150" placeholder="Krátká věta, kterou schránka ukáže vedle předmětu"><small>Ve schránce se zobrazí šedě za předmětem. Prázdné = první řádek textu.</small></label>`);
  editor.elements.tlacitko.closest('label').insertAdjacentHTML('afterend', '<p class="nl-warn" id="nl-disc-warn" hidden></p>');
  let sablony = [];
  const pct = () => Number(data.sleva_procent) || 0;
  const fill = (t) => t.replace(/\{sleva\}/g, String(pct() || DEMO_DISCOUNT));
  async function loadSablony() {
    try { const r = await fetch(SABLONY); if (r.ok) sablony = (await r.json()).sablony || []; } catch { /* bez šablon */ }
    $('#nl-tpl').insertAdjacentHTML('beforeend', sablony.map((t) => `<button type="button" aria-pressed="false" data-tpl="${esc(t.id)}">${esc(t.nazev)}</button>`).join(''));
  }
  function syncDiscountUi() {
    const label = editor.elements.tlacitko.nextElementSibling;
    label.textContent = pct() ? `Přidat velké tlačítko „Rezervovat se slevou ${pct()} %“` : 'Přidat velké tlačítko „Rezervovat termín“';
    const warn = $('#nl-disc-warn');
    warn.hidden = !!pct();
    warn.textContent = 'Sleva z newsletteru je vypnutá: v api/config.php chybí secret (min. 32 znaků). Tlačítko povede na obyčejnou rezervaci, uprav proto text šablony.';
  }
  $('#nl-tpl').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $('#nl-tpl').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const t = sablony.find((x) => x.id === b.dataset.tpl);
    const alt = $('#nl-alt');
    if (!t) { editor.reset(); alt.hidden = true; preview(); return; }
    editor.elements.predmet.value = fill(t.predmety[0]);
    editor.elements.preheader.value = fill(t.preheader || '');
    editor.elements.text.value = fill(t.text);
    editor.elements.tlacitko.checked = t.tlacitko !== false;
    alt.hidden = t.predmety.length < 2;
    alt.innerHTML = 'Jiný předmět: ' + t.predmety.map((p, i) => `<button type="button" aria-pressed="${i === 0}" data-alt="${esc(fill(p))}">${esc(fill(p))}</button>`).join('');
    say(/\[DOPLŇ/.test(t.text) ? 'Šablona má místa [DOPLŇ …], přepiš je před odesláním.' : '', true);
    preview();
  });
  $('#nl-alt').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $('#nl-alt').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    editor.elements.predmet.value = b.dataset.alt;
    preview();
  });

  /* ---------- náhled (stejná šablona jako PHP) ---------- */
  async function loadTemplate() {
    try { const r = await fetch(TEMPLATE); if (r.ok) template = await r.text(); } catch { /* bez šablony */ }
    preview();
  }
  const bodyHtml = (text) => text.replace(/\r/g, '').trim().split(/\n{2,}/).filter((p) => p.trim())
    .map((p) => `<p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#f4efe6;">${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');
  function preview() {
    if (!template) { frame.srcdoc = '<p style="font-family:sans-serif;color:#999;padding:20px">Náhled se načítá…</p>'; return; }
    const site = new URL('./', location.href).href;
    const subject = editor.elements.predmet.value.trim() || 'Předmět e-mailu';
    const text = editor.elements.text.value || 'Sem napiš text pro klienty.';
    const button = editor.elements.tlacitko.checked;
    const block = (html, name, keep) => (keep ? html.replace(new RegExp(`<!--/?${name}-->`, 'g'), '')
      : html.replace(new RegExp(`<!--${name}-->[\\s\\S]*?<!--/${name}-->`, 'g'), ''));
    let html = block(block(template, 'POZN', button && pct() > 0), 'TLACITKO', button);
    const pre = editor.elements.preheader.value.trim() || text.trim().split('\n')[0];
    const map = {
      predmet: esc(subject), preheader: esc(pre.slice(0, 150)), obsah: bodyHtml(text),
      tlacitko_text: pct() ? `Rezervovat se slevou ${pct()} %` : 'Rezervovat termín',
      tlacitko_url: esc(`${site}${pct() ? '?nl=ukazka' : ''}#rezervace`),
      tlacitko_pozn: 'Sleva platí pro rezervaci přes tento e-mail.',
      odhlasit_url: '#', web_url: esc(site),
      hero_url: esc(`${site}assets/img/email-hero.jpg`), wordmark_url: esc(`${site}assets/img/wordmark-gold.png`),
      poznamka: 'Dostáváš tento e-mail, protože ses přihlásil(a) k odběru novinek na webu Marcus Koky Barber.',
    };
    html = html.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in map ? map[k] : m));
    frame.srcdoc = html;
  }
  let pt;
  editor.addEventListener('input', () => { clearTimeout(pt); pt = setTimeout(preview, 150); });
  document.querySelector('.nl-preview .seg').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    b.parentElement.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    frame.style.width = `${b.dataset.w}px`;
  });

  /* ---------- test a rozeslání ---------- */
  const msg = $('#nl-msg');
  const say = (t, ok) => { msg.textContent = t; msg.className = `nl-amsg ${ok ? 'is-ok' : 'is-err'}`; };
  const fields = () => ({
    predmet: editor.elements.predmet.value.trim(), preheader: editor.elements.preheader.value.trim(), text: editor.elements.text.value.trim(),
    tlacitko: editor.elements.tlacitko.checked ? '1' : '',
  });
  const validate = () => {
    const f = fields();
    if (f.predmet.length < 3) { editor.elements.predmet.focus(); say('Doplň předmět.', false); return null; }
    if (f.text.length < 10) { editor.elements.text.focus(); say('Text je moc krátký.', false); return null; }
    if (/\[DOPLŇ/.test(`${f.predmet} ${f.preheader} ${f.text}`)) { editor.elements.text.focus(); say('V textu zůstalo [DOPLŇ …]. Přepiš ho, ať klienti nedostanou nedodělaný e-mail.', false); return null; }
    return f;
  };

  $('#nl-test').addEventListener('click', async (e) => {
    const f = validate(); if (!f) return;
    e.target.disabled = true;
    try {
      if (demo) { await new Promise((r) => setTimeout(r, 500)); say(`Ukázka: test by teď odešel na ${data.test_email}.`, true); }
      else { const r = await api('test', f); say(`Test odeslán na ${r.komu}. Zkontroluj schránku.`, true); }
    } catch (err) { say(err.message, false); } finally { e.target.disabled = false; }
  });

  const confirmBox = $('#nl-confirm');
  $('#nl-send').addEventListener('click', () => {
    if (!validate()) return;
    const n = data.odberatele.filter((s) => s.status === 'confirmed').length;
    confirmBox.querySelector('p').textContent = `Opravdu poslat „${fields().predmet}“ ${n} potvrzeným odběratelům? Odeslání nejde vzít zpět.`;
    confirmBox.hidden = false;
    $('#nl-confirm-yes').focus();
  });
  $('#nl-confirm-no').addEventListener('click', () => { confirmBox.hidden = true; $('#nl-send').focus(); });
  $('#nl-confirm-yes').addEventListener('click', async () => {
    confirmBox.hidden = true;
    const f = validate(); if (!f) return;
    try {
      let id;
      if (demo) {
        const total = data.odberatele.filter((s) => s.status === 'confirmed').length;
        id = Math.max(0, ...data.kampane.map((c) => c.id)) + 1;
        data.kampane.unshift({ id, subject: f.predmet, status: 'sending', created_at: now(), total, sent: 0, failed: 0 });
      } else id = (await api('kampan', f)).id;
      await reload();
      await sendAll(id);
    } catch (err) { say(err.message, false); }
  });

  let sending = false;
  async function sendAll(id) {
    if (sending) return;
    sending = true;
    const prog = $('#nl-progress');
    const bar = prog.querySelector('span');
    const label = prog.querySelector('p');
    const buttons = [$('#nl-send'), $('#nl-test')];
    buttons.forEach((b) => { b.disabled = true; });
    prog.hidden = false; say('', true);
    try {
      for (;;) {
        let c;
        if (demo) {
          await new Promise((r) => setTimeout(r, 450));
          c = data.kampane.find((x) => x.id === id);
          c.sent = Math.min(c.total, c.sent + data.davka);
          if (c.sent >= c.total) { c.status = 'done'; c.finished_at = now(); }
        } else c = (await api('davka', { id })).kampan;
        const pct = c.total ? Math.round(((Number(c.sent) + Number(c.failed)) / c.total) * 100) : 100;
        bar.style.width = `${pct}%`;
        label.textContent = `Odesláno ${c.sent} z ${c.total}${Number(c.failed) ? `, nepovedlo se ${c.failed}` : ''}`;
        if (c.status === 'done') break;
        await new Promise((r) => setTimeout(r, 300));   // dávky po sobě, ať hosting nezahltíme
      }
      editor.reset(); preview();
      say(demo ? 'Ukázka: rozesílání doběhlo, ve skutečnosti nic neodešlo.' : 'Hotovo, newsletter je rozeslaný.', true);
    } catch (err) {
      say(`${err.message} Rozesílání můžeš dokončit v historii tlačítkem Pokračovat.`, false);
    } finally {
      sending = false;
      buttons.forEach((b) => { b.disabled = false; });
      setTimeout(() => { prog.hidden = true; bar.style.width = '0'; }, 1500);
      await reload().catch(() => {});
    }
  }

  if (location.hash === '#newsletter') showTab('t-newsletter');
})();
