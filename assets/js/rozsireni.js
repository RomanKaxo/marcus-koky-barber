/* Rozšíření webu: rezervační okno s formulářem, vyskočení na mobilu, počítání cen, pás s ikonami. */
(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ENDPOINT = 'api/rezervace.php';
  const NL_ENDPOINT = 'api/newsletter.php';
  // Na náhledu (GitHub Pages, lokální soubor) není PHP: formulář jen předvede úspěch, nic neodešle.
  const DEMO = /github\.io$/.test(location.hostname) || location.protocol === 'file:';
  // Sleva z newsletteru: procento určuje server (config sleva_procent) při ověření odkazu.
  // Tahle hodnota je jen pro ukázku na GitHub Pages, kde PHP neběží.
  const DEMO_DISCOUNT = 5;
  const NL_TOKEN = new URLSearchParams(location.search).get('nl') || '';

  /* ---------- rezervační okno ---------- */
  const SERVICES = [
    { tab: 'První návštěva', items: [['Klasický střih', 499, 'první návštěva'], ['Střih + vousy HOT TOWEL', 799, 'první návštěva']] },
    { tab: 'Střih', items: [['Klasický střih', 640, 'od 12 let'], ['Střih strojkem', 540], ['Střih dlouhých vlasů', 860], ['Dětský střih', 390]] },
    { tab: 'Vousy', items: [['Úprava vousů HOT TOWEL', 560], ['Úprava vousů strojkem', 430], ['Holení celé tváře HOT TOWEL', 590], ['Barvení vousů', 220]] },
    { tab: 'Kombinace', items: [['Klasický střih + vousy HOT TOWEL', 1120], ['Klasický střih + vousy strojkem', 1050], ['Střih strojkem + vousy HOT TOWEL', 1020], ['Střih strojkem + vousy strojkem', 950], ['Klasický střih + holení tváře', 1090], ['Střih strojkem + holení tváře', 990]] },
    { tab: '14denní restart', items: [['Klasický střih', 499, 'návrat do 14 dnů'], ['Střih + vousy HOT TOWEL', 849, 'návrat do 14 dnů']] },
  ];
  // otevírací doba: Po 14–20, Út–Pá 9–20, víkend dle domluvy
  const OPEN = { 1: [14, 20], 2: [9, 20], 3: [9, 20], 4: [9, 20], 5: [9, 20] };

  const dialog = document.getElementById('booking-dialog');
  if (dialog && typeof dialog.showModal === 'function') {
    const form = dialog.querySelector('#bd-form');
    const done = dialog.querySelector('.bd-done');
    const errorBox = dialog.querySelector('.bd-error');
    const submit = dialog.querySelector('.bd-submit');
    const daysBox = dialog.querySelector('#bd-days');
    const pad = (n) => String(n).padStart(2, '0');
    const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const fmtWd = new Intl.DateTimeFormat('cs-CZ', { weekday: 'short' });
    const fmtLong = new Intl.DateTimeFormat('cs-CZ', { weekday: 'long', day: 'numeric', month: 'numeric' });
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    let opener = null;

    // 1 — služby (jeden výběr se skupinami)
    const serviceSelect = dialog.querySelector('#bd-service');
    serviceSelect.insertAdjacentHTML('beforeend', SERVICES.map((g) => `<optgroup label="${esc(g.tab)}">${g.items.map(([name, price, sub]) => {
      const value = `${['Střih', 'Vousy', 'Kombinace'].includes(g.tab) ? '' : g.tab + ': '}${name} · ${price} Kč`;
      return `<option value="${esc(value)}" data-name="${esc(name)}" data-price="${price}">${esc(name)}${sub && g.tab === 'Střih' ? ` (${esc(sub)})` : ''} · ${price} Kč</option>`;
    }).join('')}</optgroup>`).join(''));
    let selected = null; // {value, name, price}
    const syncService = () => {
      const o = serviceSelect.selectedOptions[0];
      selected = o && o.value ? { value: o.value, name: o.dataset.name, price: o.dataset.price } : null;
    };

    // 2 — dny a časy
    const renderDays = () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const now = new Date();
      const out = [];
      for (let i = 0; i < 14; i++) {
        const d = new Date(start); d.setDate(start.getDate() + i);
        const r = OPEN[d.getDay()];
        const closedToday = i === 0 && (!r || now.getHours() >= r[1] - 1);
        const disabled = !r || closedToday;
        const label = i === 0 ? 'Dnes' : i === 1 ? 'Zítra' : fmtWd.format(d).replace('.', '');
        out.push(`<label class="bd-day${disabled ? ' is-off' : ''}"><input type="radio" name="den" value="${iso(d)}" ${disabled ? 'disabled' : ''}>
          <span>${label}</span><b>${d.getDate()}.</b><small>${d.getMonth() + 1}.</small></label>`);
      }
      daysBox.innerHTML = out.join('');
    };
    const timeSelect = dialog.querySelector('#bd-time');
    const renderTimes = () => {
      const val = form.querySelector('input[name="den"]:checked')?.value;
      const prev = timeSelect.value;
      if (!val) { timeSelect.innerHTML = '<option value="">Nejdřív vyber den</option>'; timeSelect.disabled = true; return; }
      const [y, m, d] = val.split('-').map(Number);
      const r = OPEN[new Date(y, m - 1, d).getDay()];
      const now = new Date();
      const opts = ['<option value="">Vyber čas…</option>'];
      for (let t = r[0] * 60; t < r[1] * 60; t += 30) {
        const label = `${Math.floor(t / 60)}:${pad(t % 60)}`;
        if (new Date(y, m - 1, d, Math.floor(t / 60), t % 60) - now < 60 * 60 * 1000) continue; // nejdřív za hodinu
        opts.push(`<option ${label === prev ? 'selected' : ''}>${label}</option>`);
      }
      timeSelect.innerHTML = opts.join('');
      timeSelect.disabled = false;
    };

    // souhrn dole
    const sumService = dialog.querySelector('#bd-sum-service');
    const sumWhen = dialog.querySelector('#bd-sum-when');
    const sumPrice = dialog.querySelector('#bd-sum-price');
    const summary = () => {
      const den = form.querySelector('input[name="den"]:checked')?.value;
      const cas = timeSelect.value;
      sumService.textContent = selected ? selected.name : 'Vyber službu';
      const disc = discount && selected && discountApplies(selected.value);
      sumPrice.innerHTML = !selected ? '' : disc
        ? `<s>${esc(selected.price)} Kč</s> ${discountPrice(Number(selected.price))} Kč`
        : `${esc(selected.price)} Kč`;
      if (discountNote) discountNote.hidden = !(discount && selected && !disc);
      if (den) { const [y, m, d] = den.split('-').map(Number); sumWhen.textContent = `${fmtLong.format(new Date(y, m - 1, d))}${cas ? ` v ${cas}` : ', vyber čas'}`; }
      else sumWhen.textContent = 'a den';
    };

    // sleva z newsletteru (?nl=<podepsaný token kampaně>), ověřuje ji server
    let discount = null; // {token, pct}
    const discountApplies = (value) => !/^(První návštěva|14denní restart):/.test(value);
    const discountPrice = (price) => Math.round((price * (100 - discount.pct)) / 100);
    const badge = dialog.querySelector('#bd-discount');
    const discountNote = dialog.querySelector('#bd-discount-note');
    const setDiscount = (d) => {
      discount = d;
      form.elements.nl.value = d ? d.token : '';
      badge.hidden = !d;
      if (d) badge.querySelector('b').textContent = `Sleva ${d.pct} % z newsletteru`;
      dialog.classList.toggle('has-discount', !!d);
      summary();
    };

    // 0 — výběr holiče: Elos má vlastní rezervační systém, ostatní jdou do formuláře
    const pick = dialog.querySelector('#bd-pick');
    const who = dialog.querySelector('#bd-who');
    const showForm = (holic) => {
      form.elements.holic.value = holic;
      who.querySelector('b').textContent = holic;
      who.hidden = false;
      pick.hidden = true; form.hidden = false; done.hidden = true;
      dialog.setAttribute('aria-labelledby', 'bd-title');
    };
    const showPick = () => {
      pick.hidden = false; form.hidden = true; done.hidden = true;
      dialog.setAttribute('aria-labelledby', 'bd-pick-title');
      pick.querySelector('.bd-barber')?.focus({ preventScroll: true });
    };
    pick.addEventListener('click', (e) => {
      const b = e.target.closest('[data-holic]');
      if (b) { showForm(b.dataset.holic); dialog.querySelector('#bd-service').focus({ preventScroll: true }); return; }
      if (e.target.closest('[data-elos]')) dialog.close();
    });
    who.querySelector('button').addEventListener('click', showPick);

    const open = (trigger, service) => {
      if (dialog.open) return;
      opener = trigger || null;
      renderDays(); renderTimes();
      if (service) {
        const o = [...serviceSelect.options].find((x) => x.value.startsWith('První návštěva: Klasický střih'));
        if (o) serviceSelect.value = o.value;
      }
      syncService();
      summary();
      dialog.showModal();
      if (trigger?.dataset?.barber) showForm(trigger.dataset.barber); else showPick();
      document.documentElement.classList.add('dialog-open');
      try { sessionStorage.setItem('mkb-popup', '1'); } catch { /* bez úložiště */ }
    };
    dialog.addEventListener('close', () => { document.documentElement.classList.remove('dialog-open'); opener?.focus?.(); });
    dialog.addEventListener('click', (e) => { if (e.target === dialog || e.target.closest('[data-close]')) dialog.close(); });
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-booking]');
      if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      open(link, link.dataset.service);
    });
    let seen = false;
    try { seen = sessionStorage.getItem('mkb-popup') === '1'; } catch { /* bez úložiště */ }
    // odkaz z newsletteru (…/#rezervace, …/?nl=TOKEN#rezervace) otevře okno rovnou
    const bookingHash = () => location.hash === '#rezervace' || location.hash === '#rezervovat';
    window.addEventListener('hashchange', () => { if (bookingHash()) open(null); });
    if (NL_TOKEN) {
      (async () => {
        if (DEMO) setDiscount({ token: NL_TOKEN, pct: DEMO_DISCOUNT });
        else {
          try {
            const res = await fetch(`${NL_ENDPOINT}?a=sleva&nl=${encodeURIComponent(NL_TOKEN)}`, { headers: { Accept: 'application/json' } });
            const json = await res.json().catch(() => ({}));
            if (res.ok && json.ok) setDiscount({ token: NL_TOKEN, pct: Number(json.procento) });
          } catch { /* bez slevy */ }
        }
        open(null);
      })();
    } else if (bookingHash()) open(null);
    else if (!seen && !location.hash) welcome();

    // uvítací okno: jednou za návštěvu (sessionStorage), tlačítko Rezervovat z něj otevře rezervační okno
    function welcome() {
      const wl = document.getElementById('welcome');
      if (!wl) return;
      wl.addEventListener('click', (e) => {
        if (e.target === wl || e.target.closest('[data-close]') || e.target.closest('[data-booking]')) wl.close();
      });
      wl.addEventListener('close', () => document.documentElement.classList.remove('dialog-open'));
      window.setTimeout(() => {
        if (dialog.open || document.documentElement.classList.contains('menu-open')) return;
        wl.showModal();
        document.documentElement.classList.add('dialog-open');
        try { sessionStorage.setItem('mkb-popup', '1'); } catch { /* bez úložiště */ }
      }, 900);
    }

    // validace
    const rules = {
      jmeno: (v) => v.trim().length >= 2,
      telefon: (v) => v.replace(/\D/g, '').length >= 9,
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
    };
    const checkField = (name, show) => {
      const input = form.elements[name];
      const ok = rules[name](input.value);
      const field = input.closest('.bd-field');
      if (show || field.classList.contains('is-invalid')) {
        field.classList.toggle('is-invalid', !ok);
        field.querySelector('small').hidden = ok;
        input.setAttribute('aria-invalid', String(!ok));
      }
      return ok;
    };
    const flag = (key, ok) => { dialog.querySelector(`.bd-error-msg[data-for="${key}"]`).hidden = ok; return ok; };
    form.addEventListener('input', (e) => { if (rules[e.target.name]) checkField(e.target.name, false); });
    form.addEventListener('change', (e) => {
      const t = e.target;
      if (t.name === 'sluzba') { syncService(); flag('sluzba', !!selected); }
      if (t.name === 'den') renderTimes();
      if (t.name === 'cas') flag('den', true);
      summary();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.hidden = true;
      const okService = flag('sluzba', !!selected);
      const okDay = flag('den', !!form.querySelector('input[name="den"]:checked') && !!timeSelect.value);
      const okFields = Object.keys(rules).map((n) => checkField(n, true)).every(Boolean);
      if (!(okService && okDay && okFields )) {
        const first = !okService ? dialog.querySelector('#bd-s1') : !okDay ? dialog.querySelector('#bd-s2') : form.querySelector('[aria-invalid="true"]');
        first.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'center' });
        if (first.focus && first.tagName !== 'H3') first.focus({ preventScroll: true });
        return;
      }
      const data = new FormData(form);
      data.set('sluzba', selected.value);
      submit.disabled = true; submit.classList.add('is-loading');
      try {
        let json = null;
        if (DEMO) await new Promise((r) => setTimeout(r, 700));
        else {
          const res = await fetch(ENDPOINT, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
          json = await res.json().catch(() => ({}));
          if (!res.ok || !json.ok) throw new Error(json.error || 'Odeslání se nepovedlo.');
          if (data.get('novinky')) subscribe(data.get('email'), 'rezervace').catch(() => { /* rezervace je hlavní, odběr jen navíc */ });
        }
        dialog.querySelector('.bd-done-name').textContent = form.elements.jmeno.value.trim().split(/\s+/)[0] || 'králi';
        dialog.querySelector(".bd-done-recap").textContent = `${data.get("holic") && data.get("holic") !== "Je mi to jedno" ? data.get("holic") + " · " : ""}${sumService.textContent} · ${sumWhen.textContent}`;
        const discLine = discount && selected && discountApplies(selected.value)
          ? ` Sleva ${discount.pct} % z newsletteru: ${discountPrice(Number(selected.price))} Kč místo ${selected.price} Kč.` : '';
        dialog.querySelector('.bd-done-recap').textContent += discLine && (DEMO || json?.sleva) ? ` ·${discLine}` : '';
        if (DEMO) dialog.querySelector('.bd-done-text').textContent = 'Ukázka: na tomhle náhledu se rezervace neodesílá. Na ostrém webu dorazí Marcusovi e-mailem a tobě potvrzení.';
        else if (discount && json?.sleva === false && selected && discountApplies(selected.value)) dialog.querySelector('.bd-done-text').textContent = 'Rezervace dorazila, ale slevový odkaz už neplatí, takže sleva se neuplatní. Termín ti potvrdím telefonem nebo e-mailem.';
        else if (data.get('novinky')) dialog.querySelector('.bd-done-text').textContent = 'Rezervace dorazila. Ozvu se a termín potvrdím. K novinkám se přihlásíš odkazem, který ti právě přišel e-mailem.';
        form.hidden = true; done.hidden = false;
        form.reset(); selected = null; renderTimes();
        if (discount) form.elements.nl.value = discount.token;   // reset smaže skryté pole, sleva platí dál
        done.querySelector('button').focus();
      } catch (err) {
        errorBox.textContent = `${err.message} Zavolej prosím na +420 732 165 547.`;
        errorBox.hidden = false;
      } finally {
        submit.disabled = false; submit.classList.remove('is-loading');
      }
    });
  }

  /* ---------- newsletter: přihlášení k odběru (double opt-in) ---------- */
  async function subscribe(email, source) {
    const body = new FormData();
    body.set('a', 'prihlasit'); body.set('email', email); body.set('souhlas', '1'); body.set('zdroj', source);
    const res = await fetch(NL_ENDPOINT, { method: 'POST', body, headers: { Accept: 'application/json' } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) throw new Error(json.error || 'Přihlášení se nepovedlo.');
  }
  const nlForm = document.getElementById('nl-form');
  if (nlForm) {
    const msg = nlForm.querySelector('.nl-msg');
    const btn = nlForm.querySelector('.nl-submit');
    const email = nlForm.elements.email;
    if (DEMO) nlForm.closest('.newsletter').querySelector('.nl-demo').hidden = false;
    const say = (text, ok) => { msg.textContent = text; msg.className = `nl-msg ${ok ? 'is-ok' : 'is-err'}`; };
    email.addEventListener('input', () => email.removeAttribute('aria-invalid'));
    nlForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) {
        email.setAttribute('aria-invalid', 'true'); email.focus(); say('Zadej platný e-mail.', false); return;
      }
      if (!nlForm.elements.souhlas.checked) { nlForm.elements.souhlas.focus(); say('Zaškrtni prosím souhlas se zasíláním.', false); return; }
      if (nlForm.elements.web.value) return;
      btn.disabled = true; btn.classList.add('is-loading'); msg.textContent = '';
      try {
        if (DEMO) await new Promise((r) => setTimeout(r, 600));
        else await subscribe(email.value.trim(), 'web');
        say(DEMO ? 'Ukázka: na tomhle náhledu se nic neodesílá. Na ostrém webu ti teď přijde e-mail s odkazem k potvrzení.'
          : 'Skoro hotovo. Poslal jsem ti e-mail, odběr potvrď kliknutím na odkaz.', true);
        nlForm.reset();
      } catch (err) {
        say(err.message, false);
      } finally {
        btn.disabled = false; btn.classList.remove('is-loading');
      }
    });
  }

  /* ---------- ceny: počítání od nuly ---------- */
  const prices = document.querySelectorAll('.price, .offer-price');
  const animateNumber = (el) => {
    const node = el.firstChild;
    if (!node || node.nodeType !== 3) return;
    const target = Number(el.dataset.target);
    if (!target) return;
    const duration = 1100 + Math.min(target, 1200) * 0.4;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      node.textContent = String(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window && !reduced.matches) {
    const seenPrices = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animateNumber(entry.target);
      seenPrices.unobserve(entry.target);
    }), { threshold: 0.6 });
    prices.forEach((p) => {
      const node = p.firstChild;
      if (!node || node.nodeType !== 3 || !parseInt(node.textContent, 10)) return;
      p.dataset.target = parseInt(node.textContent, 10);
      node.textContent = '0';
      seenPrices.observe(p);
    });
  }

  /* ---------- pás s ikonami: zdvojení obsahu pro plynulou smyčku ---------- */
  document.querySelectorAll('.marquee-track').forEach((track) => {
    track.innerHTML += track.innerHTML;
  });
})();
