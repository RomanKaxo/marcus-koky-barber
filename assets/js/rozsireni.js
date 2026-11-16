/* Rozšíření webu: rezervační okno s formulářem, vyskočení na mobilu, počítání cen, pás s ikonami. */
(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 759px)');
  const ENDPOINT = 'api/rezervace.php';
  // Na náhledu (GitHub Pages, lokální soubor) není PHP: formulář jen předvede úspěch, nic neodešle.
  const DEMO = /github\.io$/.test(location.hostname) || location.protocol === 'file:';

  /* ---------- rezervační okno ---------- */
  const dialog = document.getElementById('booking-dialog');
  if (dialog && typeof dialog.showModal === 'function') {
    const form = dialog.querySelector('#bd-form');
    const formView = dialog.querySelector('.bd-form-view');
    const done = dialog.querySelector('.bd-done');
    const errorBox = dialog.querySelector('.bd-error');
    const submit = dialog.querySelector('.bd-submit');
    const dateInput = form.elements.den;
    let opener = null;

    const pad = (n) => String(n).padStart(2, '0');
    const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

    const open = (trigger, service) => {
      if (dialog.open) return;
      opener = trigger || null;
      dateInput.min = isoToday();
      if (service) {
        const option = [...form.elements.sluzba.options].find((o) => o.text.startsWith(service));
        if (option) form.elements.sluzba.value = option.value;
      }
      formView.hidden = false; done.hidden = true;
      dialog.showModal();
      document.documentElement.classList.add('dialog-open');
      try { sessionStorage.setItem('mkb-popup', '1'); } catch { /* bez úložiště */ }
    };
    const close = () => dialog.close();
    dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('dialog-open');
      opener?.focus?.();
    });
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog || e.target.closest('[data-close]')) close();
    });
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-booking]');
      if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      open(link, link.dataset.service);
    });

    // Na mobilu rovnou nabídni rezervaci (jednou za návštěvu).
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
      sluzba: (v) => v !== '',
      den: (v) => v !== '' && v >= isoToday(),
    };
    const check = (name, show) => {
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
    form.addEventListener('input', (e) => { if (rules[e.target.name]) check(e.target.name, false); });
    form.addEventListener('change', (e) => { if (rules[e.target.name]) check(e.target.name, false); });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.hidden = true;
      const results = Object.keys(rules).map((n) => check(n, true));
      const consent = form.elements.souhlas.checked;
      dialog.querySelector('.bd-consent-error').hidden = consent;
      if (results.includes(false) || !consent) {
        form.querySelector('[aria-invalid="true"]')?.focus();
        return;
      }
      submit.disabled = true;
      submit.classList.add('is-loading');
      try {
        if (DEMO) {
          await new Promise((r) => setTimeout(r, 700));
        } else {
          const res = await fetch(ENDPOINT, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.ok) throw new Error(data.error || 'Odeslání se nepovedlo.');
        }
        const first = form.elements.jmeno.value.trim().split(/\s+/)[0];
        dialog.querySelector('.bd-done-name').textContent = first || 'králi';
        if (DEMO) dialog.querySelector('.bd-done-text').textContent = 'Ukázka: na tomhle náhledu se rezervace neodesílá. Na ostrém webu dorazí Marcusovi e-mailem a tobě potvrzení.';
        formView.hidden = true; done.hidden = false;
        form.reset();
        done.querySelector('button').focus();
      } catch (err) {
        errorBox.textContent = `${err.message} Zavolej prosím na +420 732 165 547 nebo použij online kalendář.`;
        errorBox.hidden = false;
      } finally {
        submit.disabled = false;
        submit.classList.remove('is-loading');
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
