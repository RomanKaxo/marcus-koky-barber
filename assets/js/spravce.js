// Návrh správy rezervací pro Marcuse. Ukázková data jsou smyšlená a odpovídají obsazenosti
// na rezervace.html (stejný výpočet). Rezervace vytvořené na rezervace.html v tomto prohlížeči
// a změny stavu se ukládají do localStorage.
(() => {
  'use strict';

  const HOURS = { 1: [14, 20], 2: [9, 20], 3: [9, 20], 4: [9, 20], 5: [9, 20] };
  const WEEK_HOURS = [9, 20];
  const SERVICES = [
    ['Klasický střih', 640], ['Střih strojkem', 540], ['Střih dlouhých vlasů', 860],
    ['Úprava vousů HOT TOWEL', 560], ['Úprava vousů strojkem', 430], ['Holení celé tváře HOT TOWEL', 590],
    ['Klasický střih a úprava vousů HOT TOWEL', 1120], ['Klasický střih a úprava vousů strojkem', 1050],
    ['Střih strojkem a úprava vousů HOT TOWEL', 1020], ['Klasický střih a holení celé tváře', 1090],
    ['Dětský střih', 390], ['Klasický střih (první návštěva)', 499],
    ['Klasický střih a úprava vousů HOT TOWEL (první návštěva)', 799], ['Klasický střih (14denní restart)', 499],
  ];
  // smyšlení klienti pro ukázku
  const NAMES = ['Adam Novotný', 'Petr Veselý', 'Lukáš Horák', 'Jakub Dvořák', 'Filip Černý', 'David Procházka',
    'Matěj Kučera', 'Ondřej Marek', 'Vojtěch Pokorný', 'Daniel Král', 'Šimon Beneš', 'Michal Fiala',
    'Radek Sedláček', 'Kryštof Doležal', 'Jan Zeman', 'Patrik Kolář'];
  const NOTES = ['Jako minule, jen víc nahoře zkrátit.', 'Přinesu fotku střihu.', 'Poprvé, doporučil mě kamarád.', 'Vousy hlavně upravit linku.'];

  const STORE = { bookings: 'mkb-rezervace', blocks: 'mkb-blokace', status: 'mkb-stav' };
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* bez úložiště jen v paměti */ } };
  let blocks = new Set(load(STORE.blocks, []));
  let statuses = load(STORE.status, {});

  const $ = (s) => document.querySelector(s);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fmtTitle = new Intl.DateTimeFormat('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtShort = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'long' });
  const fmtWd = new Intl.DateTimeFormat('cs-CZ', { weekday: 'short' });
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const kc = (n) => `${n.toLocaleString('cs-CZ')} Kč`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // stejný výpočet jako rezervace.html
  const busy = (d, h) => {
    let x = d.getFullYear() * 1000 + d.getMonth() * 50 + d.getDate() * 7 + h * 13;
    x = (x ^ (x >>> 7)) * 2654435761 >>> 0;
    return x % 100 < 45;
  };
  const pick = (arr, seed) => arr[seed % arr.length];

  function bookingsFor(d) {
    const out = [];
    const range = HOURS[d.getDay()];
    const day = iso(d);
    if (range) {
      for (let h = range[0]; h < range[1]; h++) {
        if (!busy(d, h)) continue;
        const seed = (d.getDate() * 31 + d.getMonth() * 7 + h * 17) >>> 0;
        const [service, price] = pick(SERVICES, seed);
        const name = pick(NAMES, seed * 3 + h);
        const id = `demo-${day}-${h}`;
        out.push({
          id, date: day, hour: h, name, service, price,
          phone: `+420 600 000 ${String(100 + (seed % 900)).padStart(3, '0')}`,
          email: `${name.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}@example.cz`,
          voucher: seed % 7 === 0 ? `SLV${String(seed * 977).slice(0, 7)}` : '',
          note: seed % 4 === 0 ? pick(NOTES, seed) : '',
          demo: true,
        });
      }
    }
    for (const b of load(STORE.bookings, [])) if (b.date === day) out.push({ ...b, isNew: true });
    return out
      .map((b) => ({ ...b, status: statuses[b.id] || b.status || 'ok' }))
      .filter((b) => b.status !== 'cancelled')
      .sort((a, b) => a.hour - b.hour);
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const state = { view: 'day', date: new Date(today), selected: null };
  if (!HOURS[today.getDay()]) { // v neděli/sobotu otevři nejbližší pracovní den
    while (!HOURS[state.date.getDay()]) state.date.setDate(state.date.getDate() + 1);
  }
  const mondayOf = (d) => { const m = new Date(d); m.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return m; };

  function render() {
    document.querySelector('.admin-layout').classList.toggle('is-week', state.view === 'week');
    document.querySelectorAll('.seg button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === state.view)));
    if (state.view === 'day') renderDay(); else renderWeek();
    renderDetail();
  }

  const klient = (n) => `${n} ${n === 1 ? 'klient' : n >= 2 && n <= 4 ? 'klienti' : 'klientů'}`;
  function stats(days, label) {
    const now = new Date();
    let count = 0; let money = 0; let free = 0; let vouchers = 0; let next = null;
    for (const d of days) {
      const list = bookingsFor(d);
      const r = HOURS[d.getDay()];
      count += list.length;
      money += list.filter((b) => !b.voucher).reduce((s, b) => s + b.price, 0);
      vouchers += list.filter((b) => b.voucher).length;
      if (r) for (let h = r[0]; h < r[1]; h++) {
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h);
        if (start > now && !list.some((b) => b.hour === h) && !blocks.has(`${iso(d)}|${h}`)) free++;
      }
      if (!next) next = list.find((b) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), b.hour + 1) > now) && { d, b: list.find((b) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), b.hour + 1) > now) };
    }
    const nextLabel = next ? (days.length > 1 ? `${fmtWd.format(next.d).replace('.', '')} ${next.b.hour}:00` : `${next.b.hour}:00`) : '';
    const [cn, ...cw] = klient(count).split(' ');
    $('#stats').innerHTML = `
      <div><dt>${label}</dt><dd>${cn}<small>${cw.join(' ')}</small></dd></div>
      <div><dt>Odhad tržby</dt><dd>${money.toLocaleString('cs-CZ')}<small>Kč${vouchers ? ` + ${vouchers} voucher${vouchers > 1 ? 'y' : ''}` : ''}</small></dd></div>
      <div><dt>Volné časy</dt><dd>${free}</dd></div>
      <div><dt>Další klient</dt><dd>${next ? `${nextLabel}<small>${esc(next.b.name.split(' ')[0])}</small>` : '—'}</dd></div>`;
  }

  function renderDay() {
    const d = state.date;
    const isToday = iso(d) === iso(today);
    $('#today-eyebrow').textContent = isToday ? 'Dnes' : d < today ? 'Proběhlo' : 'Den';
    $('#day-title').textContent = cap(fmtTitle.format(d));
    const list = bookingsFor(d);
    stats([d], isToday ? 'Dnes objednáno' : 'Objednáno');
    const range = HOURS[d.getDay()];
    if (!range) {
      $('#schedule').innerHTML = '<div class="closed-day"><strong>Víkend dle domluvy</strong>Online rezervace jsou zavřené. Domluvené klienty si zapiš do volného času v týdnu nebo sem doplníme ruční zápis.</div>';
      return;
    }
    const now = new Date();
    const rows = [];
    for (let h = range[0]; h < range[1]; h++) {
      const b = list.find((x) => x.hour === h);
      const key = `${iso(d)}|${h}`;
      const past = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h + 1) <= now;
      const isNow = isToday && now.getHours() === h;
      let body;
      if (b) {
        body = `<button type="button" class="booking-card ${b.status === 'arrived' ? 'is-arrived' : ''} ${b.status === 'noshow' ? 'is-noshow' : ''}" data-id="${b.id}" aria-pressed="${state.selected === b.id}">
          <span class="bc-name">${esc(b.name)}</span>
          <span class="bc-service">${esc(b.service)}</span>
          <span class="bc-side"><span class="bc-price">${b.voucher ? 'voucher' : kc(b.price)}</span>
          ${b.isNew ? '<span class="badge badge--new">Nová</span>' : ''}
          ${b.voucher ? '<span class="badge badge--voucher">Slevomat</span>' : ''}
          ${b.status === 'arrived' ? '<span class="badge badge--arrived">Přišel</span>' : ''}
          ${b.status === 'noshow' ? '<span class="badge badge--noshow">Nepřišel</span>' : ''}</span>
        </button>`;
      } else if (blocks.has(key)) {
        body = `<div class="blocked-slot">Zablokováno<button type="button" data-unblock="${key}">Uvolnit</button></div>`;
      } else {
        body = `<div class="free-slot">${past ? 'Nevyužito' : 'Volno'}${past ? '' : `<button type="button" data-block="${key}">Zablokovat</button>`}</div>`;
      }
      rows.push(`<div class="row ${past && !isNow ? 'is-past' : ''} ${isNow ? 'is-now' : ''}"><span class="row-time">${h}:00</span><div class="row-body">${body}</div></div>`);
    }
    $('#schedule').innerHTML = `<div class="timeline">${rows.join('')}</div>`;
  }

  function renderWeek() {
    const mon = mondayOf(state.date);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    $('#today-eyebrow').textContent = 'Týden';
    $('#day-title').textContent = `${fmtShort.format(mon)} – ${fmtShort.format(sun)}`;
    const days = [...Array(7)].map((_, i) => { const x = new Date(mon); x.setDate(mon.getDate() + i); return x; });
    const lists = days.map(bookingsFor);
    stats(days, 'Za týden');
    const cells = ['<div class="wk-head"></div>'];
    days.forEach((d, i) => {
      cells.push(`<div class="wk-head ${iso(d) === iso(today) ? 'is-today' : ''}">${fmtWd.format(d).replace('.', '')}<b>${d.getDate()}.</b><small>${HOURS[d.getDay()] ? klient(lists[i].length) : 'dle domluvy'}</small></div>`);
    });
    for (let h = WEEK_HOURS[0]; h < WEEK_HOURS[1]; h++) {
      cells.push(`<div class="wk-time">${h}:00</div>`);
      days.forEach((d, i) => {
        const r = HOURS[d.getDay()];
        const open = r && h >= r[0] && h < r[1];
        const b = lists[i].find((x) => x.hour === h);
        if (!open) { cells.push('<div class="wk-closed"></div>'); return; }
        if (b) cells.push(`<div><button type="button" class="chip ${b.voucher ? 'is-voucher' : ''} ${b.isNew ? 'is-new' : ''}" data-id="${b.id}" data-date="${b.date}"><b>${esc(b.name)}</b><span>${esc(b.service)}</span></button></div>`);
        else if (blocks.has(`${iso(d)}|${h}`)) cells.push('<div><span class="chip-blocked">blok</span></div>');
        else cells.push('<div></div>');
      });
    }
    $('#schedule').innerHTML = `<div class="week-wrap"><div class="week">${cells.join('')}</div></div>`;
  }

  function findSelected() {
    if (!state.selected) return null;
    const date = state.selected.replace(/^demo-/, '').slice(0, 10);
    const [y, m, d] = (state.selectedDate || date).split('-').map(Number);
    return bookingsFor(new Date(y, m - 1, d)).find((b) => b.id === state.selected) || null;
  }

  function renderDetail() {
    const b = findSelected();
    const box = $('#detail');
    if (!b) { box.hidden = true; return; }
    box.hidden = false;
    const [y, m, d] = b.date.split('-').map(Number);
    const when = cap(fmtTitle.format(new Date(y, m - 1, d)));
    const statusLabel = { ok: 'Objednán', arrived: 'Přišel', noshow: 'Nepřišel' }[b.status];
    $('#detail-body').innerHTML = `
      <p class="eyebrow">${statusLabel}${b.isNew ? ' · nová online' : ''}</p>
      <h2>${esc(b.name)}</h2>
      <p class="d-when">${when}, ${b.hour}:00–${b.hour + 1}:00</p>
      <dl>
        <div><dt>Služba</dt><dd>${esc(b.service)}</dd></div>
        <div><dt>Cena</dt><dd>${b.voucher ? `Voucher Slevomat · ${esc(b.voucher)}<div class="d-voucher">V provozu: ověřeno přes Slevomat, uplatní se po příchodu.</div>` : kc(b.price)}</dd></div>
        <div><dt>Telefon</dt><dd><a href="tel:${esc(b.phone.replace(/\s/g, ''))}">${esc(b.phone)}</a></dd></div>
        <div><dt>E-mail</dt><dd><a href="mailto:${esc(b.email)}">${esc(b.email)}</a></dd></div>
        ${b.note ? `<div><dt>Poznámka klienta</dt><dd class="d-note">${esc(b.note)}</dd></div>` : ''}
      </dl>
      <div class="d-actions">
        <a class="button button--yellow button--wide" href="tel:${esc(b.phone.replace(/\s/g, ''))}">Zavolat<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 3 4 5-2 3c1 3 2 4 5 5l3-2 5 4c-1 4-4 4-7 3C8 19 4 15 3 9 2 6 3 4 6 3Z"/></svg></a>
        <button type="button" class="button button--outline" data-status="arrived">${b.status === 'arrived' ? '✓ Přišel' : 'Přišel'}</button>
        <button type="button" class="button button--outline" data-status="noshow">${b.status === 'noshow' ? '✓ Nepřišel' : 'Nepřišel'}</button>
        <button type="button" class="button button--danger button--wide" data-status="cancelled">Zrušit rezervaci</button>
      </div>`;
  }

  // události
  document.querySelector('.seg').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    state.view = b.dataset.view; render();
  });
  $('#prev').addEventListener('click', () => { state.date.setDate(state.date.getDate() - (state.view === 'day' ? 1 : 7)); render(); });
  $('#next').addEventListener('click', () => { state.date.setDate(state.date.getDate() + (state.view === 'day' ? 1 : 7)); render(); });
  $('#today').addEventListener('click', () => { state.date = new Date(today); render(); });
  $('#schedule').addEventListener('click', (e) => {
    const card = e.target.closest('[data-id]');
    if (card) {
      state.selected = card.dataset.id;
      state.selectedDate = card.dataset.date || iso(state.date);
      render();
      $('#detail-close').focus();
      return;
    }
    const bl = e.target.closest('[data-block]');
    if (bl) { blocks.add(bl.dataset.block); save(STORE.blocks, [...blocks]); render(); return; }
    const ub = e.target.closest('[data-unblock]');
    if (ub) { blocks.delete(ub.dataset.unblock); save(STORE.blocks, [...blocks]); render(); }
  });
  $('#detail').addEventListener('click', (e) => {
    const s = e.target.closest('[data-status]'); if (!s) return;
    const v = s.dataset.status;
    const cur = findSelected();
    statuses[state.selected] = cur && cur.status === v ? 'ok' : v;
    save(STORE.status, statuses);
    if (v === 'cancelled') state.selected = null;
    render();
  });
  $('#detail-close').addEventListener('click', () => { state.selected = null; render(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.selected) { state.selected = null; render(); } });

  render();
})();
