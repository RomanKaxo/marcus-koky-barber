/* Rozšíření webu: rezervační okno s formulářem, vyskočení na mobilu, počítání cen, pás s ikonami. */
(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 759px)');
  const ENDPOINT = 'api/rezervace.php';
  // Na náhledu (GitHub Pages, lokální soubor) není PHP: formulář jen předvede úspěch, nic neodešle.
  const DEMO = /github\.io$/.test(location.hostname) || location.protocol === 'file:';

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
    const tabs = dialog.querySelector('#bd-tabs');
    const list = dialog.querySelector('#bd-services');
    const daysBox = dialog.querySelector('#bd-days');
    const timesBox = dialog.querySelector('#bd-times');
    const pad = (n) => String(n).padStart(2, '0');
    const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const fmtWd = new Intl.DateTimeFormat('cs-CZ', { weekday: 'short' });
    const fmtLong = new Intl.DateTimeFormat('cs-CZ', { weekday: 'long', day: 'numeric', month: 'numeric' });
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    let opener = null;
    let activeTab = 0;

    // 1 — služby
    tabs.innerHTML = SERVICES.map((g, i) => `<button type="button" role="tab" aria-selected="${i === 0}" data-tab="${i}">${g.tab}</button>`).join('');
    const renderServices = () => {
      const chosen = form.querySelector('input[name="sluzba"]:checked')?.value;
      list.innerHTML = SERVICES[activeTab].items.map(([name, price, sub]) => {
        const value = `${SERVICES[activeTab].tab === 'Střih' || SERVICES[activeTab].tab === 'Vousy' || SERVICES[activeTab].tab === 'Kombinace' ? '' : SERVICES[activeTab].tab + ': '}${name} · ${price} Kč`;
        return `<label class="bd-service"><input type="radio" name="sluzba" value="${esc(value)}" data-name="${esc(name)}" data-price="${price}" ${value === chosen ? 'checked' : ''}>
          <span class="bd-service-name">${esc(name)}${sub ? `<small>${esc(sub)}</small>` : ''}</span><span class="bd-service-price">${price}<small> Kč</small></span></label>`;
      }).join('');
      tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(Number(b.dataset.tab) === activeTab)));
    };
    // vybraná služba z jiné záložky zůstává zaškrtnutá ve skrytém inputu
      let selected = null; // {value, name, price}
    tabs.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tab]'); if (!b) return;
      activeTab = Number(b.dataset.tab);
      renderServices();
      if (selected) { const r = [...list.querySelectorAll('input')].find((i) => i.value === selected.value); if (r) r.checked = true; }
    });

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
    const renderTimes = () => {
      const val = form.querySelector('input[name="den"]:checked')?.value;
      if (!val) { timesBox.innerHTML = '<p class="bd-times-hint">Nejdřív vyber den, pak čas.</p>'; return; }
      const prev = form.querySelector('input[name="cas"]:checked')?.value;
      const [y, m, d] = val.split('-').map(Number);
      const r = OPEN[new Date(y, m - 1, d).getDay()];
      const now = new Date();
      const out = [];
      for (let t = r[0] * 60; t < r[1] * 60; t += 30) {
        const label = `${Math.floor(t / 60)}:${pad(t % 60)}`;
        const start = new Date(y, m - 1, d, Math.floor(t / 60), t % 60);
        const off = start - now < 60 * 60 * 1000; // nejdřív za hodinu
        out.push(`<label class="bd-time${off ? ' is-off' : ''}"><input type="radio" name="cas" value="${label}" ${off ? 'disabled' : ''} ${!off && label === prev ? 'checked' : ''}><span>${label}</span></label>`);
      }
      timesBox.innerHTML = out.join('');
    };

    // souhrn dole
    const sumService = dialog.querySelector('#bd-sum-service');
    const sumWhen = dialog.querySelector('#bd-sum-when');
    const sumPrice = dialog.querySelector('#bd-sum-price');
    const summary = () => {
      const den = form.querySelector('input[name="den"]:checked')?.value;
      const cas = form.querySelector('input[name="cas"]:checked')?.value;
      sumService.textContent = selected ? selected.name : 'Vyber službu';
      sumPrice.textContent = selected ? `${selected.price} Kč` : '';
      if (den) { const [y, m, d] = den.split('-').map(Number); sumWhen.textContent = `${fmtLong.format(new Date(y, m - 1, d))}${cas ? ` v ${cas}` : ', vyber čas'}`; }
      else sumWhen.textContent = 'a den';
    };

    const open = (trigger, service) => {
      if (dialog.open) return;
      opener = trigger || null;
      renderDays(); renderTimes();
      if (service) {
        activeTab = SERVICES.findIndex((g) => g.tab === 'První návštěva');
        renderServices();
        const r = list.querySelector('input'); if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
      } else renderServices();
      form.hidden = false; done.hidden = true;
      summary();
      dialog.showModal();
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
    if (mobile.matches && !seen && !location.hash) {
      window.setTimeout(() => { if (!document.documentElement.classList.contains('menu-open')) open(null); }, 1600);
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
      if (t.name === 'sluzba') { selected = { value: t.value, name: t.dataset.name, price: t.dataset.price }; flag('sluzba', true); }
      if (t.name === 'den') renderTimes();
      if (t.name === 'cas') flag('den', true);
      if (t.name === 'souhlas') flag('souhlas', t.checked);
      summary();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.hidden = true;
      const okService = flag('sluzba', !!selected);
      const okDay = flag('den', !!form.querySelector('input[name="den"]:checked') && !!form.querySelector('input[name="cas"]:checked'));
      const okFields = Object.keys(rules).map((n) => checkField(n, true)).every(Boolean);
      const okConsent = flag('souhlas', form.elements.souhlas.checked);
      if (!(okService && okDay && okFields && okConsent)) {
        const first = !okService ? dialog.querySelector('#bd-s1') : !okDay ? dialog.querySelector('#bd-s2') : form.querySelector('[aria-invalid="true"]') || form.elements.souhlas;
        first.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'center' });
        if (first.focus && first.tagName !== 'H3') first.focus({ preventScroll: true });
        return;
      }
      const data = new FormData(form);
      data.set('sluzba', selected.value);
      submit.disabled = true; submit.classList.add('is-loading');
      try {
        if (DEMO) await new Promise((r) => setTimeout(r, 700));
        else {
          const res = await fetch(ENDPOINT, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json.ok) throw new Error(json.error || 'Odeslání se nepovedlo.');
        }
        dialog.querySelector('.bd-done-name').textContent = form.elements.jmeno.value.trim().split(/\s+/)[0] || 'králi';
        dialog.querySelector('.bd-done-recap').textContent = `${sumService.textContent} · ${sumWhen.textContent}`;
        if (DEMO) dialog.querySelector('.bd-done-text').textContent = 'Ukázka: na tomhle náhledu se rezervace neodesílá. Na ostrém webu dorazí Marcusovi e-mailem a tobě potvrzení.';
        form.hidden = true; done.hidden = false;
        form.reset(); selected = null;
        done.querySelector('button').focus();
      } catch (err) {
        errorBox.textContent = `${err.message} Zavolej prosím na +420 732 165 547.`;
        errorBox.hidden = false;
      } finally {
        submit.disabled = false; submit.classList.remove('is-loading');
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
