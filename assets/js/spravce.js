// Návrh správy rezervací pro Marcuse (pohled majitele, hlavně z mobilu mezi klienty).
// Ukázková data jsou smyšlená a odpovídají obsazenosti na rezervace.html (stejný výpočet).
// Rezervace z rezervace.html, ručně přidané rezervace a změny stavu se drží v localStorage tohoto prohlížeče.
(() => {
  'use strict';

  // Otevírací doba z webu: Po 14–20, Út–Pá 9–20, víkend dle domluvy. Termíny po hodině.
  const HOURS = { 1: [14, 20], 2: [9, 20], 3: [9, 20], 4: [9, 20], 5: [9, 20] };
  // Ceník z webu (stejný jako na rezervace.html).
  const PRICE_LIST = [
    { group: 'První návštěva', items: [['Klasický střih (první návštěva)', 499], ['Klasický střih a úprava vousů HOT TOWEL (první návštěva)', 777]] },
    { group: 'Střih', items: [['Klasický střih', 640], ['Střih strojkem', 540], ['Střih dlouhých vlasů', 860], ['Dětský střih', 390]] },
    { group: 'Vousy a holení', items: [['Úprava vousů HOT TOWEL', 560], ['Úprava vousů strojkem', 430], ['Holení celé tváře HOT TOWEL', 590], ['Barvení vousů', 220]] },
    { group: 'Full-service', items: [['Klasický střih a úprava vousů HOT TOWEL', 1120], ['Klasický střih a úprava vousů strojkem', 1050],
      ['Střih strojkem a úprava vousů HOT TOWEL', 1020], ['Střih strojkem a úprava vousů strojkem', 950],
      ['Klasický střih a holení celé tváře', 1090], ['Střih strojkem a holení celé tváře', 990]] },
    { group: '14denní restart', items: [['Klasický střih (14denní restart)', 499], ['Klasický střih a úprava vousů HOT TOWEL (14denní restart)', 849]] },
  ];
  const SERVICES = PRICE_LIST.flatMap((g) => g.items);
  const DEMO_SERVICES = SERVICES.filter(([n]) => n !== 'Barvení vousů' && !n.includes('první návštěva')); // ukázkoví klienti chodí opakovaně
  // Holiči: zatím zástupná jména. Každý bude mít vlastní kalendář; dnes je na webu jeden společný
  // (rezervace.html), takže volný čas = hodina, kdy nemá rezervaci nikdo.
  const BARBERS = [{ id: 'marcus', name: 'Marcus' }, { id: 'holic-2', name: 'Holič 2' }, { id: 'holic-3', name: 'Holič 3' }];
  const barberName = (id) => (BARBERS.find((b) => b.id === id) || BARBERS[0]).name;

  // Smyšlení klienti pro ukázku: stálý telefon a e-mail, aby šlo počítat návštěvy.
  const FIRST = ['Adam', 'Petr', 'Lukáš', 'Jakub', 'Filip', 'David', 'Matěj', 'Ondřej', 'Vojtěch', 'Daniel',
    'Šimon', 'Michal', 'Radek', 'Kryštof', 'Jan', 'Patrik', 'Tomáš', 'Marek', 'Dominik', 'Martin'];
  const LAST = ['Novotný', 'Veselý', 'Horák', 'Dvořák', 'Černý', 'Procházka', 'Kučera', 'Marek', 'Pokorný', 'Král',
    'Beneš', 'Fiala', 'Sedláček', 'Doležal', 'Zeman', 'Kolář', 'Navrátil', 'Růžička', 'Holub', 'Kratochvíl'];
  const plain = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const CLIENTS = [...Array(60)].map((_, i) => {
    const first = FIRST[i % FIRST.length];
    const last = LAST[(i * 7 + Math.floor(i / FIRST.length)) % LAST.length];
    return { name: `${first} ${last}`, phone: `+420 6${String(10 + (i * 37) % 89)} ${String(100 + (i * 271) % 900)} ${String(100 + (i * 613) % 900)}`,
      email: `${plain(first)}.${plain(last)}@example.cz` };
  });
  const NOTES = ['Jako minule, jen víc nahoře zkrátit.', 'Přinesu fotku střihu.', 'Poprvé, doporučil mě kamarád.', 'Vousy hlavně upravit linku.'];

  const STORE = { bookings: 'mkb-rezervace', status: 'mkb-stav', barber: 'mkb-holic' };
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* bez úložiště jen v paměti */ } };
  // Blokování časů majitel zrušil. Staré blokace by na rezervace.html neviditelně zabíraly termíny, proto pryč.
  try { localStorage.removeItem('mkb-blokace'); } catch { /* bez úložiště */ }
  let statuses = load(STORE.status, {});

  const $ = (s) => document.querySelector(s);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fromIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const at = (d, h) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h);
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const fmtTitle = new Intl.DateTimeFormat('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtShort = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'long' });
  const fmtNum = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric' });
  const fmtWd = new Intl.DateTimeFormat('cs-CZ', { weekday: 'short' });
  const wd = (d) => fmtWd.format(d).replace('.', '');
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const kc = (n) => `${n.toLocaleString('cs-CZ')} Kč`;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tel = (p) => `tel:${String(p).replace(/[^\d+]/g, '')}`;
  const digits = (s) => String(s).replace(/\D/g, '');
  const plural = (n, one, few, many) => `${n} ${n === 1 ? one : n >= 2 && n <= 4 ? few : many}`;
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => matchMedia('(max-width: 1099px)').matches;

  const ICON = {
    phone: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 3 4 5-2 3c1 3 2 4 5 5l3-2 5 4c-1 4-4 4-7 3C8 19 4 15 3 9 2 6 3 4 6 3Z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    noshow: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M16.5 8.5l4 4M20.5 8.5l-4 4"/></svg>',
    cancel: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="m4 7 8 6 8-6"/></svg>',
  };

  /* ---------- data ---------- */
  // Stejný výpočet obsazenosti jako rezervace.html.
  const busy = (d, h) => {
    let x = d.getFullYear() * 1000 + d.getMonth() * 50 + d.getDate() * 7 + h * 13;
    x = (x ^ (x >>> 7)) * 2654435761 >>> 0;
    return x % 100 < 45;
  };
  const pick = (arr, seed) => arr[seed % arr.length];
  const demoCache = new Map();
  function demoFor(d) { // ukázkové rezervace dne bez stavů (čistě z data)
    const day = iso(d);
    if (demoCache.has(day)) return demoCache.get(day);
    const out = [];
    const range = HOURS[d.getDay()];
    if (range) for (let h = range[0]; h < range[1]; h++) {
      if (!busy(d, h)) continue;
      const seed = (d.getDate() * 31 + d.getMonth() * 7 + d.getFullYear() * 3 + h * 17) >>> 0;
      const mix = Math.imul(seed ^ (seed >>> 5), 2654435761) >>> 0;
      const [service, price] = pick(DEMO_SERVICES, mix >>> 8);
      const client = pick(CLIENTS, seed * 3 + h * 11 + d.getDate());
      const r = (seed >>> 2) % 10;
      out.push({
        id: `demo-${day}-${h}`, date: day, hour: h, ...client, service, price,
        barber: r < 5 ? 'marcus' : r < 8 ? 'holic-2' : 'holic-3',
        voucher: seed % 7 === 0 ? `SLV${String(seed * 977).slice(0, 7)}` : '',
        note: seed % 4 === 0 ? pick(NOTES, seed) : '',
        demoStatus: seed % 9 === 0 ? 'noshow' : 'arrived', // jak to dopadlo, pokud termín už proběhl
        demo: true,
      });
    }
    demoCache.set(day, out);
    return out;
  }
  const storedAll = () => load(STORE.bookings, []);
  const kind = (b) => (b.demo ? 'demo' : b.source === 'spravce' ? 'manual' : 'online');

  // Všechny platné rezervace dne bez filtru holiče (pro volné časy).
  function dayAll(d) {
    const day = iso(d);
    const now = new Date();
    const list = [...demoFor(d), ...storedAll().filter((b) => b.date === day).map((b) => ({ ...b, barber: b.barber || 'marcus' }))];
    return list
      .map((b) => {
        let status = statuses[b.id] || b.status;
        if (!status) status = b.demo && at(d, b.hour + 1) <= now ? b.demoStatus : 'ok';
        return { ...b, status };
      })
      .filter((b) => b.status !== 'cancelled')
      .sort((a, b) => a.hour - b.hour);
  }
  const forBarber = (list) => (state.barber === 'all' ? list : list.filter((b) => b.barber === state.barber));
  const dayView = (d) => forBarber(dayAll(d));
  const freeHours = (d) => { // budoucí volné hodiny (společný kalendář)
    const r = HOURS[d.getDay()]; if (!r) return [];
    const list = dayAll(d); const now = new Date(); const out = [];
    for (let h = r[0]; h < r[1]; h++) if (at(d, h + 1) > now && !list.some((b) => b.hour === h)) out.push(h); // i právě běžící hodina (walk-in)
    return out;
  };
  function findBooking(id, date) {
    return dayAll(fromIso(date)).find((b) => b.id === id) || null;
  }

  // Počet návštěv klienta v ukázkových datech (posledních 120 dní) podle telefonu.
  const VISIT_DAYS = 120;
  function visitsOf(b) {
    const key = digits(b.phone);
    const today0 = startOfToday();
    let count = 0; let last = null;
    for (let i = VISIT_DAYS; i >= 1; i--) {
      const d = addDays(today0, -i);
      for (const x of dayAll(d)) if (digits(x.phone) === key && x.status === 'arrived') { count++; last = d; }
    }
    return { count, last };
  }

  /* ---------- stav ---------- */
  const startOfToday = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };
  const today = startOfToday();
  const home = new Date(today); // dnešek, nebo nejbližší otevřený den (víkend dle domluvy)
  while (!HOURS[home.getDay()]) home.setDate(home.getDate() + 1);
  const savedBarber = load(STORE.barber, 'all');
  const state = {
    view: 'day', date: new Date(home), selected: null, selectedDate: null,
    barber: savedBarber === 'all' || BARBERS.some((b) => b.id === savedBarber) ? savedBarber : 'all',
  };
  let lastOpener = null; // prvek, na který se vrací fokus po zavření detailu
  const mondayOf = (d) => addDays(d, -((d.getDay() + 6) % 7));
  const weekDays = (d) => { const m = mondayOf(d); return [...Array(7)].map((_, i) => addDays(m, i)); };

  /* ---------- vykreslení ---------- */
  function render() {
    const isDay = state.view === 'day';
    document.querySelector('.admin-layout').classList.toggle('is-week', !isDay);
    document.querySelectorAll('#rz-view button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === state.view)));
    document.querySelectorAll('#rz-barber button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.barber === state.barber)));
    $('#prev').setAttribute('aria-label', isDay ? 'Předchozí den' : 'Předchozí týden');
    $('#next').setAttribute('aria-label', isDay ? 'Další den' : 'Další týden');
    $('#today').classList.toggle('is-current', isDay ? iso(state.date) === iso(home) : iso(mondayOf(state.date)) === iso(mondayOf(home)));
    if (isDay) renderDay(); else renderWeek();
    renderNext();
    renderDetail();
  }

  function renderStats(days, isDay) {
    const now = new Date();
    let count = 0; let money = 0; let vouchers = 0; let free = 0;
    for (const d of days) {
      const list = dayView(d);
      count += list.length;
      for (const b of list) {
        if (b.status === 'noshow') continue;
        if (b.voucher) vouchers++; else money += b.price;
      }
      free += freeHours(d).length;
    }
    const noshow = weekDays(state.date).filter((d) => d <= now)
      .reduce((s, d) => s + dayView(d).filter((b) => b.status === 'noshow').length, 0);
    const isToday = isDay && iso(days[0]) === iso(today);
    const label = isDay ? (isToday ? 'Dnes klientů' : 'Klientů') : 'Klientů za týden';
    $('#stats').innerHTML = `
      <div><dt>${label}</dt><dd>${count}</dd></div>
      <div><dt>Odhad tržby</dt><dd>${money.toLocaleString('cs-CZ')}<small>Kč</small>${vouchers ? `<span class="st-sub">+ ${plural(vouchers, 'voucher', 'vouchery', 'voucherů')}</span>` : ''}</dd></div>
      <div><dt>Volné časy</dt><dd>${free}<span class="st-sub">${!isDay ? 'do konce týdne' : at(days[0], (HOURS[days[0].getDay()] || [0, 0])[1]) <= now ? 'den skončil' : free ? 'k obsazení' : 'plno'}</span></dd></div>
      <div class="${noshow ? 'is-warn' : ''}"><dt>Nepřišli</dt><dd>${noshow}<span class="st-sub">tento týden</span></dd></div>`;
  }

  // Karta „Další klient“: vždy podle skutečného času, ne podle prohlíženého dne.
  function upcoming(limitDays) {
    const now = new Date();
    for (let i = 0; i <= limitDays; i++) {
      const d = addDays(today, i);
      const b = dayView(d).find((x) => x.status === 'ok' && at(d, x.hour).getTime() > now.getTime() - 15 * 60e3);
      if (b) return { b, d, start: at(d, b.hour) };
    }
    return null;
  }
  function countdown(start) {
    const m = Math.round((start - new Date()) / 60e3);
    if (m < -1) return `měl přijít před ${-m} min`;
    if (m <= 1) return 'teď';
    if (m < 60) return `za ${m} min`;
    const h = Math.floor(m / 60); const r = m % 60;
    return r ? `za ${h} h ${r} min` : `za ${h} h`;
  }
  function renderNext() {
    const box = $('#rz-next');
    const show = state.view === 'day' && iso(state.date) === iso(home);
    box.hidden = !show;
    $('#rz-overview').classList.toggle('has-next', show);
    if (!show) return;
    const who = state.barber === 'all' ? '' : ` · ${barberName(state.barber)}`;
    const n = upcoming(0);
    if (n) {
      const { b, start } = n;
      const late = start < new Date();
      box.className = `rz-next${late ? ' is-late' : ''}`;
      box.innerHTML = `
        <p class="rz-next-label" id="rz-next-label">Další klient${esc(who)} <span class="rz-next-count">${countdown(start)}</span></p>
        <div class="rz-next-main">
          <span class="rz-next-time">${b.hour}:00</span>
          <div class="rz-next-who">
            <h2>${esc(b.name)}</h2>
            <p>${esc(b.service)}${state.barber === 'all' ? ` · ${esc(barberName(b.barber))}` : ''}</p>
          </div>
          <span class="rz-next-price">${b.voucher ? '<span class="badge badge--voucher">Slevomat voucher</span>' : kc(b.price)}</span>
        </div>
        <div class="rz-next-actions">
          <a class="button button--yellow" href="${tel(b.phone)}">${ICON.phone}Zavolat</a>
          <button type="button" class="button button--outline" data-open="${esc(b.id)}" data-date="${b.date}">Detail</button>
        </div>`;
      return;
    }
    const closed = !HOURS[today.getDay()];
    const later = upcoming(14);
    box.className = 'rz-next is-empty';
    box.innerHTML = `
      <p class="rz-next-label" id="rz-next-label">Další klient${esc(who)}</p>
      <p class="rz-next-calm">${closed ? 'Dnes je zavřeno. Odpočívej.' : iso(home) === iso(today) ? 'Dnes už nikoho nečekáš.' : 'Dnes nikdo objednaný není.'}</p>
      ${later ? `<p class="rz-next-later">Další: ${wd(later.d)} ${fmtNum.format(later.d)} v ${later.b.hour}:00 · ${esc(later.b.name)}</p>
        <div class="rz-next-actions"><button type="button" class="button button--outline" data-open="${esc(later.b.id)}" data-date="${later.b.date}">Otevřít</button></div>` : ''}`;
  }

  function badges(b) {
    const k = kind(b);
    return [
      k === 'online' ? '<span class="badge badge--new">Nová online</span>' : '',
      k === 'manual' ? '<span class="badge badge--manual">Zapsáno ručně</span>' : '',
      b.voucher ? '<span class="badge badge--voucher">Slevomat voucher</span>' : '',
      b.status === 'arrived' ? '<span class="badge badge--arrived">Přišel</span>' : '',
      b.status === 'noshow' ? '<span class="badge badge--noshow">Nepřišel</span>' : '',
    ].join('');
  }
  function actions(b, past, big) {
    const cls = big ? 'button button--outline' : 'bk-act';
    return `
      <a class="${big ? 'button button--yellow' : 'bk-act'}" href="${tel(b.phone)}">${ICON.phone}<span>Zavolat</span></a>
      <button type="button" class="${cls} is-ok" data-act="arrived" data-id="${esc(b.id)}" data-date="${b.date}" aria-pressed="${b.status === 'arrived'}">${ICON.check}<span>Přišel</span></button>
      <button type="button" class="${cls} is-warn" data-act="noshow" data-id="${esc(b.id)}" data-date="${b.date}" aria-pressed="${b.status === 'noshow'}">${ICON.noshow}<span>Nepřišel</span></button>
      ${past ? '' : `<button type="button" class="${big ? 'button button--danger' : 'bk-act is-danger'}" data-act="cancel" data-id="${esc(b.id)}" data-date="${b.date}">${ICON.cancel}<span>Zrušit</span></button>`}`;
  }

  function renderDay() {
    const d = state.date;
    const isToday = iso(d) === iso(today);
    $('#today-eyebrow').textContent = isToday ? 'Dnes' : d < today ? 'Proběhlo' : iso(d) === iso(addDays(today, 1)) ? 'Zítra' : 'Den';
    $('#day-title').textContent = cap(fmtTitle.format(d));
    renderStats([d], true);
    const range = HOURS[d.getDay()];
    if (!range) {
      $('#schedule').innerHTML = '<div class="closed-day"><strong>Víkend dle domluvy</strong>Online rezervace jsou zavřené. Domluvené klienty si zapiš přes Přidat do volného času v&nbsp;týdnu.</div>';
      return;
    }
    const all = dayAll(d);
    const now = new Date();
    const rows = [];
    for (let h = range[0]; h < range[1]; h++) {
      const any = all.find((x) => x.hour === h);
      const b = any && (state.barber === 'all' || any.barber === state.barber) ? any : null;
      const past = at(d, h + 1) <= now;
      const isNow = at(d, h) <= now && !past;
      const cls = `ag-row${past ? ' is-past' : ''}${isNow ? ' is-now' : ''}`;
      const time = `<span class="ag-time"><b>${h}:00</b><small>${h + 1}:00</small></span>`;
      if (b) {
        const sel = state.selected === b.id;
        rows.push(`<li class="${cls} has-booking">${time}
          <article class="bk is-${b.status}${sel ? ' is-selected' : ''}" aria-label="${h}:00 ${esc(b.name)}">
            <button type="button" class="bk-open" data-open="${esc(b.id)}" data-date="${b.date}" aria-expanded="${sel}" aria-controls="detail">
              <span class="bk-top"><span class="bk-name">${esc(b.name)}</span><span class="bk-price">${b.voucher ? 'voucher' : kc(b.price)}</span></span>
              <span class="bk-service">${esc(b.service)}${state.barber === 'all' ? `<span class="bk-barber"> · ${esc(barberName(b.barber))}</span>` : ''}</span>
              ${badges(b) ? `<span class="bk-badges">${badges(b)}</span>` : ''}
            </button>
            <div class="bk-actions" role="group" aria-label="Akce pro ${esc(b.name)}">${actions(b, past, false)}</div>
          </article></li>`);
      } else if (any) {
        rows.push(`<li class="${cls} is-other">${time}<div class="ag-other">Obsazeno · ${esc(barberName(any.barber))}</div></li>`);
      } else if (past) { // souvislé nevyužité hodiny v minulosti stáhni do jednoho řádku
        const prev = rows.length && rows[rows.length - 1];
        if (prev && prev.unused) { prev.to = h + 1; continue; }
        rows.push({ unused: true, from: h, to: h + 1 });
      } else {
        rows.push(`<li class="${cls} is-free">${time}<button type="button" class="ag-free" data-add="${h}"><span>Volno</span><span class="ag-free-add">${ICON.plus}Přidat<span class="sr-only"> rezervaci na ${h}:00</span></span></button></li>`);
      }
    }
    const html = rows.map((r) => (typeof r === 'string' ? r : `<li class="ag-row is-past is-free"><span class="ag-time"><b>${r.from}:00</b></span><div class="ag-free is-unused">${r.to - r.from > 1 ? `Nevyužito do ${r.to}:00` : 'Nevyužito'}</div></li>`));
    $('#schedule').innerHTML = `<h2 class="sr-only">Rozpis dne</h2><ol class="agenda">${html.join('')}</ol>`;
  }

  function renderWeek() {
    const days = weekDays(state.date);
    $('#today-eyebrow').textContent = 'Týden';
    $('#day-title').textContent = `${fmtShort.format(days[0])} – ${fmtShort.format(days[6])}`;
    renderStats(days, false);
    const cells = days.map((d) => {
      const r = HOURS[d.getDay()];
      const list = dayView(d);
      const slots = r ? r[1] - r[0] : 0;
      const load = slots ? Math.round((dayAll(d).length / slots) * 100) : 0;
      const money = list.filter((b) => !b.voucher && b.status !== 'noshow').reduce((s, b) => s + b.price, 0);
      const free = freeHours(d).length;
      const isT = iso(d) === iso(today);
      const past = d < today;
      const names = list.slice(0, 11).map((b) => `<span class="wk-line${b.status === 'noshow' ? ' is-noshow' : ''}"><b>${b.hour}</b> ${esc(b.name.split(' ')[0])} ${esc(b.name.split(' ')[1]?.charAt(0) || '')}.</span>`).join('');
      return `<li><button type="button" class="wk-day${isT ? ' is-today' : ''}${past ? ' is-past' : ''}${r ? '' : ' is-closed'}" data-day="${iso(d)}"
          aria-label="${cap(fmtTitle.format(d))}: ${r ? `${plural(list.length, 'klient', 'klienti', 'klientů')}, volných ${free}` : 'dle domluvy'}. Otevřít den.">
        <span class="wk-date"><span class="wk-wd">${wd(d)}</span><b>${d.getDate()}.</b>${isT ? '<span class="wk-today">dnes</span>' : ''}</span>
        ${r ? `<span class="wk-sum">
            <span class="wk-count"><b>${list.length}</b> ${list.length === 1 ? 'klient' : list.length >= 2 && list.length <= 4 ? 'klienti' : 'klientů'}<span class="wk-free">${past ? '' : free ? ` · ${free} volno` : ' · plno'}</span></span>
            <span class="wk-bar" aria-hidden="true"><i style="width:${load}%"></i></span>
            <span class="wk-money">${money ? kc(money) : '—'}</span>
          </span>
          <span class="wk-names" aria-hidden="true">${names}</span>` : '<span class="wk-sum"><span class="wk-count">Dle domluvy</span></span>'}
        <span class="wk-go" aria-hidden="true">${ICON.chevron}</span>
      </button></li>`;
    });
    $('#schedule').innerHTML = `<h2 class="sr-only">Přehled týdne</h2><ol class="week-list">${cells.join('')}</ol>`;
  }

  function renderDetail() {
    const box = $('#detail');
    const b = state.selected && state.view === 'day' ? findBooking(state.selected, state.selectedDate) : null;
    if (!b && state.selected) { state.selected = null; }
    box.classList.toggle('is-empty', !b);
    const open = !!b;
    $('#rz-backdrop').hidden = !(open && isMobile());
    document.documentElement.classList.toggle('rz-lock', open && isMobile());
    if (!b) {
      $('#detail-body').innerHTML = `<p class="eyebrow">Detail</p><p class="d-empty">Klepni na rezervaci a&nbsp;uvidíš kontakt, poznámku a&nbsp;počet návštěv. Volný čas obsadíš přes <b>Přidat</b>.</p>`;
      return;
    }
    const d = fromIso(b.date);
    const past = at(d, b.hour + 1) <= new Date();
    const v = visitsOf(b);
    const statusLabel = { ok: 'Objednán', arrived: 'Přišel', noshow: 'Nepřišel' }[b.status];
    const source = { demo: 'ukázková rezervace', online: 'nová online', manual: 'zapsáno ručně' }[kind(b)];
    $('#detail-body').innerHTML = `
      <p class="eyebrow">${statusLabel} · ${source}</p>
      <h2 id="detail-title">${esc(b.name)}</h2>
      <p class="d-when">${cap(fmtTitle.format(d))}, ${b.hour}:00–${b.hour + 1}:00 · ${esc(barberName(b.barber))}</p>
      ${badges(b) ? `<p class="bk-badges d-badges">${badges(b)}</p>` : ''}
      <dl>
        <div><dt>Služba</dt><dd>${esc(b.service)}</dd></div>
        <div><dt>Cena</dt><dd>${b.voucher ? `Voucher Slevomat · ${esc(b.voucher)}<span class="d-sub">V provozu se ověří u Slevomatu a uplatní po příchodu.</span>` : kc(b.price)}</dd></div>
        <div><dt>Telefon</dt><dd><a href="${tel(b.phone)}">${esc(b.phone)}</a></dd></div>
        ${b.email ? `<div><dt>E-mail</dt><dd><a href="mailto:${esc(b.email)}">${esc(b.email)}</a></dd></div>` : ''}
        <div><dt>Návštěvy</dt><dd>${v.count ? `${plural(v.count, 'návštěva', 'návštěvy', 'návštěv')} za ${VISIT_DAYS} dní` : 'Zatím žádná, první návštěva'}<span class="d-sub">${v.last ? `Naposledy ${wd(v.last)} ${fmtNum.format(v.last)} · ` : ''}počítáno z ukázkových dat</span></dd></div>
        ${b.note ? `<div><dt>Poznámka klienta</dt><dd class="d-note">${esc(b.note)}</dd></div>` : ''}
      </dl>
      <div class="d-actions">${actions(b, past, true)}</div>`;
  }

  /* ---------- holiči ---------- */
  $('#rz-barber').innerHTML = [{ id: 'all', name: 'Všichni' }, ...BARBERS]
    .map((b) => `<button type="button" data-barber="${b.id}" aria-pressed="false">${esc(b.name)}</button>`).join('');

  /* ---------- toast s vrácením ---------- */
  const toast = $('#rz-toast');
  let toastTimer = 0; let toastUndo = null;
  function showToast(text, undo) {
    clearTimeout(toastTimer);
    toastUndo = undo || null;
    toast.innerHTML = `<div class="rz-toast-box"><span>${esc(text)}</span>${undo ? '<button type="button" data-undo>Vrátit</button>' : ''}</div>`;
    toast.classList.add('is-on');
    toastTimer = setTimeout(hideToast, undo ? 8000 : 4000);
  }
  function hideToast() { toast.classList.remove('is-on'); toastUndo = null; setTimeout(() => { if (!toast.classList.contains('is-on')) toast.innerHTML = ''; }, 300); }
  toast.addEventListener('click', (e) => {
    if (!e.target.closest('[data-undo]') || !toastUndo) return;
    const fn = toastUndo; hideToast(); fn();
  });

  /* ---------- akce ---------- */
  function setStatus(id, date, v) {
    const cur = findBooking(id, date); if (!cur) return;
    const next = cur.status === v ? 'ok' : v;
    if (cur.demo) statuses[id] = next;
    else { // u uložených rezervací stav patří k záznamu
      const all = storedAll(); const x = all.find((y) => y.id === id); if (x) { x.status = next; save(STORE.bookings, all); }
    }
    if (cur.demo) save(STORE.status, statuses);
    render();
    focusAfter(`[data-act="${v}"][data-id="${CSS.escape(id)}"]`);
  }
  function cancel(id, date) {
    const cur = findBooking(id, date); if (!cur) return;
    let undo;
    if (cur.demo) {
      const prev = statuses[id];
      statuses[id] = 'cancelled'; save(STORE.status, statuses);
      undo = () => { if (prev === undefined) delete statuses[id]; else statuses[id] = prev; save(STORE.status, statuses); afterUndo(cur); };
    } else { // smazat ze sdíleného úložiště, aby se termín uvolnil i na rezervace.html
      const all = storedAll(); const idx = all.findIndex((y) => y.id === id); const [rec] = all.splice(idx, 1); save(STORE.bookings, all);
      undo = () => { const a = storedAll(); a.splice(Math.min(idx, a.length), 0, rec); save(STORE.bookings, a); afterUndo(cur); };
    }
    if (state.selected === id) state.selected = null;
    render();
    showToast(`Rezervace zrušena · ${cur.hour}:00 ${cur.name}`, undo);
    focusAfter(`[data-add="${cur.hour}"]`, '#schedule');
  }
  function afterUndo(b) {
    render();
    showToast(`Vráceno · ${b.hour}:00 ${b.name}`);
    focusAfter(`[data-open="${CSS.escape(b.id)}"]`);
  }
  function focusAfter(sel, fallback) {
    const el = document.querySelector(`#schedule ${sel}`) || document.querySelector(`#detail ${sel}`) || (fallback && document.querySelector(fallback));
    if (el) { if (fallback && el.matches(fallback)) el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: false }); }
  }
  function openDetail(id, date, opener) {
    state.selected = id; state.selectedDate = date;
    if (state.view !== 'day' || iso(state.date) !== date) { state.view = 'day'; state.date = fromIso(date); }
    lastOpener = opener ? opener.dataset.open : null;
    render();
    if (isMobile()) { $('#detail-close').focus(); return; }
    const h = $('#detail h2'); h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true });
    const r = $('#detail').getBoundingClientRect(); // panel je lepivý; dorolovat jen když je skoro celý pod okrajem
    if (r.top > innerHeight - 200) $('#detail').scrollIntoView({ block: 'start', behavior: reduceMotion() ? 'auto' : 'smooth' });
  }
  function closeDetail() {
    const back = state.selected;
    state.selected = null; render();
    const el = document.querySelector(`#schedule [data-open="${CSS.escape(lastOpener || back || '')}"]`);
    if (el) el.focus();
  }

  function onActionClick(e) {
    const act = e.target.closest('[data-act]');
    if (act) { if (act.dataset.act === 'cancel') cancel(act.dataset.id, act.dataset.date); else setStatus(act.dataset.id, act.dataset.date, act.dataset.act); return true; }
    const open = e.target.closest('[data-open]');
    if (open) {
      if (state.selected === open.dataset.open && !isMobile() && open.classList.contains('bk-open')) { closeDetail(); return true; }
      openDetail(open.dataset.open, open.dataset.date, open); return true;
    }
    return false;
  }
  $('#schedule').addEventListener('click', (e) => {
    if (onActionClick(e)) return;
    const add = e.target.closest('[data-add]');
    if (add) { openAdd(Number(add.dataset.add), add); return; }
    const day = e.target.closest('[data-day]');
    if (day) { state.view = 'day'; state.date = fromIso(day.dataset.day); state.selected = null; render(); $('#day-title').setAttribute('tabindex', '-1'); $('#day-title').focus(); }
  });
  $('#detail').addEventListener('click', (e) => { onActionClick(e); });
  $('#rz-next').addEventListener('click', (e) => { onActionClick(e); });
  $('#detail-close').addEventListener('click', closeDetail);
  $('#rz-backdrop').addEventListener('click', closeDetail);

  $('#rz-view').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    state.view = b.dataset.view; render();
  });
  $('#rz-barber').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    state.barber = b.dataset.barber; save(STORE.barber, state.barber);
    if (state.selected) { const s = findBooking(state.selected, state.selectedDate); if (s && state.barber !== 'all' && s.barber !== state.barber) state.selected = null; }
    render();
  });
  const step = (n) => { state.date = addDays(state.date, state.view === 'day' ? n : n * 7); state.selected = null; render(); };
  $('#prev').addEventListener('click', () => step(-1));
  $('#next').addEventListener('click', () => step(1));
  $('#today').addEventListener('click', () => { state.date = new Date(home); state.selected = null; render(); });

  /* ---------- přidat rezervaci ---------- */
  const dlg = $('#rz-add'); const form = $('#rz-add-form');
  let addOpener = null;
  $('#rz-service').innerHTML = PRICE_LIST.map((g) => `<optgroup label="${esc(g.group)}">${g.items.map(([n, p]) => `<option value="${esc(n)}">${esc(n)} · ${kc(p)}</option>`).join('')}</optgroup>`).join('');
  $('#rz-service').value = 'Klasický střih';
  $('#rz-barber-select').innerHTML = BARBERS.map((b) => `<option value="${b.id}">${esc(b.name)}</option>`).join('');
  function openAdd(hour, opener) {
    const d = HOURS[state.date.getDay()] && state.view === 'day' ? state.date : home;
    const hours = freeHours(d);
    form.reset();
    $('#rz-service').value = 'Klasický střih';
    form.querySelectorAll('.rz-err').forEach((x) => { x.hidden = true; });
    form.querySelectorAll('[aria-invalid]').forEach((x) => x.removeAttribute('aria-invalid'));
    form.dataset.date = iso(d);
    $('#rz-add-date').textContent = cap(fmtTitle.format(d));
    $('#rz-hour').innerHTML = hours.length ? hours.map((h) => `<option value="${h}">${h}:00–${h + 1}:00</option>`).join('') : '<option value="">Žádný volný čas</option>';
    $('#rz-hour').value = hours.includes(hour) ? String(hour) : String(hours[0] ?? '');
    $('#rz-barber-select').value = state.barber === 'all' ? 'marcus' : state.barber;
    addOpener = opener || null;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    form.name.focus();
  }
  function closeAdd() { if (dlg.open) dlg.close(); }
  dlg.addEventListener('close', () => { if (addOpener && document.contains(addOpener)) addOpener.focus(); addOpener = null; });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeAdd(); }); // klepnutí mimo panel
  $('#rz-add-close').addEventListener('click', closeAdd);
  $('#rz-add-cancel').addEventListener('click', closeAdd);
  $('#rz-add-open').addEventListener('click', (e) => openAdd(-1, e.currentTarget));
  const checks = {
    name: () => form.name.value.trim().length >= 3,
    phone: () => digits(form.phone.value).length >= 9,
    hour: () => form.hour.value !== '',
  };
  function validate(all) {
    let ok = true;
    for (const [k, fn] of Object.entries(checks)) {
      const valid = fn(); const el = form.elements[k];
      if (all || el.getAttribute('aria-invalid') === 'true') {
        $(`#rz-err-${k}`).hidden = valid;
        el.setAttribute('aria-invalid', String(!valid));
      }
      ok = ok && valid;
    }
    return ok;
  }
  form.addEventListener('input', () => validate(false));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate(true)) { form.querySelector('[aria-invalid="true"]')?.focus(); return; }
    const service = form.service.value;
    const rec = { // stejný tvar jako rezervace.html, navíc holič a zdroj
      id: `own-${Date.now()}`, date: form.dataset.date, hour: Number(form.hour.value), name: form.name.value.trim(),
      phone: form.phone.value.trim(), email: '', note: form.note.value.trim(), service,
      price: (SERVICES.find(([n]) => n === service) || [0, 0])[1], voucher: '', barber: form.barber.value, source: 'spravce',
    };
    const all = storedAll(); all.push(rec); save(STORE.bookings, all);
    addOpener = null;
    closeAdd();
    state.view = 'day'; state.date = fromIso(rec.date);
    if (state.barber !== 'all' && state.barber !== rec.barber) { state.barber = 'all'; save(STORE.barber, 'all'); }
    render();
    showToast(`Uloženo · ${rec.hour}:00 ${rec.name}`, () => {
      save(STORE.bookings, storedAll().filter((b) => b.id !== rec.id)); render(); showToast('Rezervace odebrána');
      focusAfter(`[data-add="${rec.hour}"]`, '#schedule');
    });
    focusAfter(`[data-open="${rec.id}"]`);
  });

  /* ---------- hledání ---------- */
  const q = $('#rz-q'); const results = $('#rz-results');
  let found = [];
  function search() {
    const raw = q.value.trim();
    const t = plain(raw); const num = digits(raw);
    if (t.length < 2) { results.hidden = true; q.setAttribute('aria-expanded', 'false'); $('#rz-q-count').textContent = ''; return; }
    found = [];
    for (let i = 0; i < 14; i++) {
      const d = addDays(today, i);
      for (const b of dayView(d)) {
        if (i === 0 && at(d, b.hour + 1) <= new Date()) continue;
        if (plain(b.name).includes(t) || (num.length >= 3 && digits(b.phone).includes(num))) found.push(b);
      }
    }
    results.innerHTML = found.length
      ? `<ul>${found.slice(0, 8).map((b) => { const d = fromIso(b.date); return `<li><button type="button" data-open="${esc(b.id)}" data-date="${b.date}">
          <span class="rs-name">${esc(b.name)}</span><span class="rs-when">${wd(d)} ${fmtNum.format(d)} · ${b.hour}:00</span>
          <span class="rs-sub">${esc(b.service)} · ${esc(b.phone)}</span></button></li>`; }).join('')}</ul>${found.length > 8 ? `<p class="rs-more">a ${found.length - 8} dalších, zpřesni hledání</p>` : ''}`
      : '<p class="rs-none">Na příštích 14 dní nic. Zkus příjmení nebo část čísla.</p>';
    results.hidden = false; q.setAttribute('aria-expanded', 'true');
    $('#rz-q-count').textContent = found.length ? plural(found.length, 'výsledek', 'výsledky', 'výsledků') : 'Nic nenalezeno';
  }
  q.addEventListener('input', search);
  q.addEventListener('focus', () => { if (q.value.trim().length >= 2) search(); });
  const closeResults = () => { results.hidden = true; q.setAttribute('aria-expanded', 'false'); };
  results.addEventListener('click', (e) => {
    const b = e.target.closest('[data-open]'); if (!b) return;
    closeResults(); q.value = '';
    openDetail(b.dataset.open, b.dataset.date, null);
  });
  const resultButtons = () => [...results.querySelectorAll('button')];
  q.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && !results.hidden) { e.preventDefault(); resultButtons()[0]?.focus(); }
    if (e.key === 'Escape') { if (!results.hidden) { e.stopPropagation(); closeResults(); } else q.value = ''; }
  });
  results.addEventListener('keydown', (e) => {
    const list = resultButtons(); const i = list.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); list[Math.min(i + 1, list.length - 1)]?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); if (i <= 0) q.focus(); else list[i - 1].focus(); }
    if (e.key === 'Escape') { e.stopPropagation(); closeResults(); q.focus(); }
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.rz-search')) closeResults(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.selected && !dlg.open && !e.defaultPrevented) closeDetail();
  });
  matchMedia('(max-width: 1099px)').addEventListener('change', () => renderDetail());

  // Odpočet a čára „teď“ se obnovují samy; celý rozpis jen při změně hodiny.
  let lastHour = new Date().getHours();
  setInterval(() => {
    if (document.hidden) return;
    const h = new Date().getHours();
    if (h !== lastHour && !dlg.open) { lastHour = h; render(); } else renderNext();
  }, 30e3);

  render();
})();
