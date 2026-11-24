// Návrh rezervace Marcus Koky Barber: vše běží v prohlížeči, nic se neodesílá.
// Obsazenost termínů je smyšlená (deterministicky podle data), ceny jsou z ceníku na webu.
(() => {
  'use strict';

  const SERVICES = [
    { group: 'První návštěva', note: 'jen poprvé', items: [
      ['first-cut', 'Klasický střih', 'služba od 12 let', 499],
      ['first-cut-beard', 'Klasický střih a úprava vousů HOT TOWEL', '', 777],
    ] },
    { group: 'Střih', items: [
      ['cut', 'Klasický střih', 'služba od 12 let', 640],
      ['clipper', 'Střih strojkem', '', 540],
      ['long', 'Střih dlouhých vlasů', '', 860],
      ['kids', 'Dětský střih', 'fresh cut do školy', 390],
    ] },
    { group: 'Vousy a holení', items: [
      ['beard-hot', 'Úprava vousů HOT TOWEL', '', 560],
      ['beard-clipper', 'Úprava vousů strojkem', '', 430],
      ['shave', 'Holení celé tváře HOT TOWEL', '', 590],
      ['dye', 'Barvení vousů', 'doplňková služba', 220],
    ] },
    { group: 'Full-service', items: [
      ['cut-beard-hot', 'Klasický střih a úprava vousů HOT TOWEL', '', 1120],
      ['cut-beard-clipper', 'Klasický střih a úprava vousů strojkem', '', 1050],
      ['clipper-beard-hot', 'Střih strojkem a úprava vousů HOT TOWEL', '', 1020],
      ['clipper-beard-clipper', 'Střih strojkem a úprava vousů strojkem', '', 950],
      ['cut-shave', 'Klasický střih a holení celé tváře', '', 1090],
      ['clipper-shave', 'Střih strojkem a holení celé tváře', '', 990],
    ] },
    { group: '14denní restart', note: 'návrat do 14 dnů', items: [
      ['restart-cut', 'Klasický střih', '', 499],
      ['restart-cut-beard', 'Klasický střih a úprava vousů HOT TOWEL', '', 849],
    ] },
  ];
  // Otevírací doba z webu: Po 14–20, Út–Pá 9–20, víkend dle domluvy. Začátky po hodině.
  const HOURS = { 1: [14, 20], 2: [9, 20], 3: [9, 20], 4: [9, 20], 5: [9, 20] };
  const WEEKS_AHEAD = 6;

  const $ = (s) => document.querySelector(s);
  const form = $('#booking-form');
  const state = { step: 1, service: null, date: null, hour: null, week: 0, voucher: '' };
  const fmtDay = new Intl.DateTimeFormat('cs-CZ', { weekday: 'short' });
  const fmtLong = new Intl.DateTimeFormat('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtShort = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'long' });
  const price = (n) => `${n.toLocaleString('cs-CZ')} Kč`;
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const allItems = SERVICES.flatMap((g) => g.items.map(([id, name, sub, p]) => ({ id, name, sub, price: p, group: g.group })));

  // 1 — služby
  const list = $('#service-list');
  list.innerHTML = SERVICES.map((g) => `
    <fieldset class="service-group">
      <legend>${g.group}${g.note ? `<small>${g.note}</small>` : ''}</legend>
      <div class="service-options">
        ${g.items.map(([id, name, sub, p]) => `
          <label class="option">
            <input type="radio" name="service" value="${id}">
            <span class="option-name">${name}${sub ? `<small>${sub}</small>` : ''}</span>
            <span class="option-price">${p}<small>Kč</small></span>
          </label>`).join('')}
      </div>
    </fieldset>`).join('');
  list.addEventListener('change', (e) => {
    state.service = allItems.find((s) => s.id === e.target.value);
    render();
  });

  // 2 — kalendář
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const busy = (d, h) => { // smyšlená obsazenost, stabilní pro daný den a hodinu
    let x = d.getFullYear() * 1000 + d.getMonth() * 50 + d.getDate() * 7 + h * 13;
    x = (x ^ (x >>> 7)) * 2654435761 >>> 0;
    return x % 100 < 45;
  };
  // rezervace a blokace uložené v tomto prohlížeči (sdílí je spravce.html)
  const stored = (k) => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
  const taken = (d, h) => {
    const key = `${iso(d)}|${h}`;
    return stored('mkb-blokace').includes(key) || stored('mkb-rezervace').some((b) => `${b.date}|${b.hour}` === key);
  };
  const slotsFor = (d) => {
    const range = HOURS[d.getDay()];
    if (!range) return null;
    const now = new Date();
    const out = [];
    for (let h = range[0]; h < range[1]; h++) {
      const start = new Date(d); start.setHours(h);
      out.push({ h, free: start > now && !busy(d, h) && !taken(d, h) });
    }
    return out;
  };
  function renderWeek() {
    const start = new Date(monday); start.setDate(monday.getDate() + state.week * 7);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    $('#week-label').textContent = `${fmtShort.format(start)} – ${fmtShort.format(end)}`;
    $('#week-prev').disabled = state.week === 0;
    $('#week-next').disabled = state.week >= WEEKS_AHEAD - 1;
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const slots = slotsFor(d);
      const free = slots ? slots.filter((s) => s.free).length : 0;
      const past = d < today;
      const weekend = !slots;
      const sel = state.date && iso(state.date) === iso(d);
      days.push(`<button type="button" class="day" role="radio" aria-checked="${sel}" data-date="${iso(d)}" ${past ? 'disabled' : ''}
        aria-label="${fmtLong.format(d)}${weekend ? ', dle domluvy' : `, volných termínů ${free}`}">
        <span>${fmtDay.format(d).replace('.', '')}</span><b>${d.getDate()}</b>
        <small>${past ? '' : weekend ? 'dle domluvy' : free ? `${free} volných` : 'plno'}</small></button>`);
    }
    $('#day-list').innerHTML = days.join('');
    renderSlots();
  }
  function renderSlots() {
    const box = $('#slot-list');
    const title = $('#slots-title');
    if (!state.date) { title.textContent = 'Vyber den.'; box.innerHTML = ''; return; }
    const slots = slotsFor(state.date);
    title.textContent = `Volné časy · ${fmtLong.format(state.date)}`;
    if (!slots) {
      box.innerHTML = '<p class="slots-empty">O víkendu stříhám dle domluvy. <a href="tel:+420732165547">Zavolej</a> nebo napiš na <a href="https://www.instagram.com/marcus_koky_barber/" target="_blank" rel="noopener">Instagram</a>.</p>';
      return;
    }
    if (!slots.some((s) => s.free)) {
      box.innerHTML = '<p class="slots-empty">Tenhle den je plno. Zkus jiný, nebo <a href="tel:+420732165547">zavolej</a>, jestli se něco neuvolnilo.</p>';
      return;
    }
    box.innerHTML = slots.map((s) => `<button type="button" class="slot" role="radio" aria-checked="${state.hour === s.h}" data-hour="${s.h}" ${s.free ? '' : 'disabled aria-label="' + s.h + ':00 obsazeno"'}>${s.h}:00</button>`).join('');
  }
  function pickFirstFree() { // otevři rovnou nejbližší den s volným časem
    for (let i = 0; i < WEEKS_AHEAD * 7; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i);
      const slots = slotsFor(d);
      if (slots && slots.some((x) => x.free)) {
        state.date = d;
        state.week = Math.floor((d - monday) / 864e5 / 7);
        return;
      }
    }
  }
  $('#day-list').addEventListener('click', (e) => {
    const b = e.target.closest('.day'); if (!b || b.disabled) return;
    const [y, m, d] = b.dataset.date.split('-').map(Number);
    state.date = new Date(y, m - 1, d); state.hour = null;
    renderWeek(); render();
  });
  $('#slot-list').addEventListener('click', (e) => {
    const b = e.target.closest('.slot'); if (!b || b.disabled) return;
    state.hour = Number(b.dataset.hour);
    renderSlots(); render();
  });
  $('#week-prev').addEventListener('click', () => { state.week--; renderWeek(); });
  $('#week-next').addEventListener('click', () => { state.week++; renderWeek(); });

  // 3 — voucher Slevomat (v ostrém provozu: server volá voucherCheck, po potvrzení voucherApply)
  $('#voucher-check').addEventListener('click', () => {
    const code = form.voucher.value.trim().replace(/\s+/g, '').toUpperCase();
    const out = $('#voucher-status');
    if (code.length < 6) {
      out.className = 'voucher-status is-bad';
      out.textContent = 'Kód je moc krátký. Opiš ho přesně z voucheru.';
      state.voucher = ''; render(); return;
    }
    form.voucher.value = code;
    state.voucher = code;
    out.className = 'voucher-status is-ok';
    out.textContent = 'Návrh: kód se tu neověřuje. V provozu ho systém zkontroluje u Slevomatu a uplatní až po potvrzení rezervace.';
    render();
  });

  // validace údajů
  const fields = ['name', 'phone', 'email'];
  const validators = {
    name: (v) => v.trim().length >= 3,
    phone: (v) => v.replace(/[^\d]/g, '').length >= 9,
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
  };
  function validate(showAll) {
    let ok = true;
    for (const f of fields) {
      const input = form[f];
      const valid = validators[f](input.value);
      const label = input.closest('.field');
      if (showAll || label.classList.contains('is-invalid')) {
        label.classList.toggle('is-invalid', !valid);
        label.querySelector('.field-error').hidden = valid;
        input.setAttribute('aria-invalid', String(!valid));
      }
      ok = ok && valid;
    }
    const c = form.consent.checked;
    if (showAll) $('.consent-error').hidden = c;
    return ok && c;
  }
  form.addEventListener('input', () => validate(false));

  // navigace mezi kroky
  const labels = { 1: 'Vybrat termín', 2: 'Pokračovat', 3: 'Potvrdit rezervaci' };
  function canNext() {
    if (state.step === 1) return !!state.service;
    if (state.step === 2) return state.hour !== null;
    return true;
  }
  function go(step) {
    state.step = step;
    document.querySelectorAll('.step').forEach((s) => { s.hidden = Number(s.dataset.step) !== step; });
    document.querySelectorAll('.steps li').forEach((li) => {
      const n = Number(li.dataset.stepLabel);
      li.classList.toggle('is-done', n < step);
      if (n === step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    if (step === 2) {
      if (!state.date) pickFirstFree();
      renderWeek();
    }
    render();
    const title = document.querySelector(`[data-step="${step}"] .step-title`);
    title.setAttribute('tabindex', '-1');
    title.focus({ preventScroll: true });
    document.querySelector('.steps').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!canNext()) return;
    if (state.step === 3) {
      if (!validate(true)) { form.querySelector('[aria-invalid="true"]')?.focus(); return; }
      finish();
    }
    go(state.step + 1);
  });
  $('#back-btn').addEventListener('click', () => go(state.step - 1));

  function when() {
    if (state.hour === null) return null;
    return `${fmtLong.format(state.date)}, ${state.hour}:00`;
  }
  function render() {
    const next = $('#next-btn');
    next.disabled = !canNext();
    next.firstChild.textContent = labels[state.step] || '';
    $('#back-btn').hidden = state.step === 1 || state.step === 4;
    $('#step-nav').hidden = state.step === 4;
    $('#sum-service').textContent = state.service ? state.service.name : '—';
    $('#sum-time').textContent = when() || '—';
    $('#sum-voucher-row').hidden = !state.voucher;
    $('#sum-voucher').textContent = state.voucher ? `Slevomat · ${state.voucher}` : '';
    $('#sum-note').textContent = state.voucher ? 'Voucher předložíš v salonu, rozdíl případně doplatíš na místě.' : 'Platí se na místě v salonu.';
    $('#sum-price-label').textContent = state.voucher ? 'Platíš' : 'Celkem';
    $('#sum-price').classList.toggle('is-text', !!state.voucher);
    $('#sum-price').textContent = !state.service ? '—' : state.voucher ? 'voucherem' : price(state.service.price);
  }

  function finish() {
    try {
      const all = stored('mkb-rezervace');
      all.push({ id: `web-${Date.now()}`, date: iso(state.date), hour: state.hour, name: form.name.value.trim(),
        phone: form.phone.value.trim(), email: form.email.value.trim(), note: form.note.value.trim(),
        service: state.service.name, price: state.service.price, voucher: state.voucher });
      localStorage.setItem('mkb-rezervace', JSON.stringify(all));
    } catch { /* bez úložiště se ukázka jen neuloží */ }
    const first = form.name.value.trim().split(/\s+/)[0];
    $('#done-name').textContent = first || 'králi';
    $('#done-text').innerHTML = `<strong>${state.service.name}</strong> · ${when()}.<br>Potvrzení a připomínku den předem pošlu na <strong>${form.email.value.trim().replace(/[<>&"]/g, '')}</strong>.`;
    const start = new Date(state.date); start.setHours(state.hour);
    const end = new Date(start); end.setHours(start.getHours() + 1);
    const t = (d) => `${iso(d).replace(/-/g, '')}T${String(d.getHours()).padStart(2, '0')}0000`;
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Marcus Koky Barber//Rezervace//CS', 'BEGIN:VEVENT',
      `UID:${Date.now()}@marcuskoky.cz`, `DTSTAMP:${t(new Date())}`, `DTSTART:${t(start)}`, `DTEND:${t(end)}`,
      `SUMMARY:Marcus Koky Barber – ${state.service.name}`, 'LOCATION:Bratislavská 201/14\\, Ponávka Tower\\, Brno',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    $('#calendar-link').href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
  }

  render();
})();
