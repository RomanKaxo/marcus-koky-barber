/* Day numbering follows Date: Sunday = 0, Monday = 1, … Saturday = 6.
   Pure scheduling function; independent of the device clock and the DOM. */
function getOpeningStatus(day, minutes) {
  if (!Number.isInteger(day) || day < 0 || day > 6 || !Number.isInteger(minutes) || minutes < 0 || minutes >= 1440) {
    throw new RangeError('Expected weekday 0–6 and minutes 0–1439.');
  }
  if (day === 0 || day === 6) return { state: 'appointment', text: 'Víkend dle domluvy · zavolej nebo napiš' };
  const opening = day === 1 ? 840 : 540;
  if (minutes >= opening && minutes < 1200) return { state: 'open', text: 'Dnes otevřeno do 20:00' };
  if (minutes < opening) return { state: 'closed', text: `Teď zavřeno · otevíráme dnes ${day === 1 ? 've 14:00' : 'v 9:00'}` };
  return { state: 'closed', text: day === 5 ? 'Teď zavřeno · otevíráme v pondělí ve 14:00' : 'Teď zavřeno · otevíráme zítra v 9:00' };
}

if (typeof document !== 'undefined') {
  document.documentElement.classList.add('js');
  const init = () => {
    const header = document.querySelector('.site-header');
    const menu = document.querySelector('#site-menu');
    const toggle = document.querySelector('.menu-toggle');
    const main = document.querySelector('main');
    const footer = document.querySelector('footer');
    const mobileBar = document.querySelector('.mobile-bar');
    const desktop = window.matchMedia('(min-width: 1100px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let menuOpen = false;
    let previousOverflow = '';

    const setMenu = (open, returnFocus = true) => {
      if (!menu || !toggle || menuOpen === open) return;
      menuOpen = open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Zavřít menu' : 'Otevřít menu');
      document.documentElement.classList.toggle('menu-open', open);
      for (const element of [main, footer, mobileBar]) if (element) element.inert = open;
      if (open) {
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        menu.querySelector('a').focus();
      } else {
        document.body.style.overflow = previousOverflow;
        if (returnFocus) toggle.focus();
      }
    };
    toggle?.addEventListener('click', () => setMenu(!menuOpen));
    menu?.addEventListener('click', event => {
      const link = event.target.closest('a');
      if (!link || !menuOpen) return;
      setMenu(false);
      if (link.hash) {
        const target = document.getElementById(link.hash.slice(1));
        target?.focus({ preventScroll: true });
      }
    });
    document.addEventListener('keydown', event => {
      if (!menuOpen) return;
      if (event.key === 'Escape') { event.preventDefault(); setMenu(false); }
      if (event.key === 'Tab') {
        const items = [toggle, ...menu.querySelectorAll('a')];
        const current = items.indexOf(document.activeElement);
        event.preventDefault();
        items[(current + (event.shiftKey ? -1 : 1) + items.length) % items.length].focus();
      }
    });
    desktop.addEventListener('change', event => { if (event.matches) setMenu(false, false); });
    const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 32);
    window.addEventListener('scroll', updateHeader, { passive: true });
    updateHeader();

    const clock = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Prague', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    });
    const updateHours = () => {
      const parts = Object.fromEntries(clock.formatToParts(new Date()).map(part => [part.type, part.value]));
      const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
      const status = getOpeningStatus(day, Number(parts.hour) * 60 + Number(parts.minute));
      const pill = document.querySelector('.opening-status');
      if (pill) { pill.dataset.state = status.state; pill.querySelector('span:last-child').textContent = status.text; }
      document.querySelectorAll('[data-day]').forEach(row => {
        const today = Number(row.dataset.day) === day;
        row.classList.toggle('is-today', today);
        row.querySelector('.today-label').hidden = !today;
      });
    };
    updateHours();
    window.setInterval(updateHours, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) updateHours(); });

    if ('IntersectionObserver' in window) {
      const reveals = document.querySelectorAll('[data-reveal]');
      const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); }
      }), { threshold: 0.06 });
      reveals.forEach(element => { element.classList.add('reveal-ready'); revealObserver.observe(element); });
      reducedMotion.addEventListener('change', event => {
        if (event.matches) { reveals.forEach(element => element.classList.add('is-visible')); revealObserver.disconnect(); }
      });
      const links = [...document.querySelectorAll('.site-menu a[href^="#"]')];
      const updateActive = () => {
        let current = null;
        for (const link of links) {
          const section = document.querySelector(link.getAttribute('href'));
          if (section && section.getBoundingClientRect().top <= window.innerHeight * 0.4) current = link;
        }
        links.forEach(link => current === link ? link.setAttribute('aria-current', 'location') : link.removeAttribute('aria-current'));
      };
      const sectionObserver = new IntersectionObserver(updateActive, { rootMargin: '-15% 0px -55% 0px', threshold: 0 });
      links.forEach(link => { const section = document.querySelector(link.getAttribute('href')); if (section) sectionObserver.observe(section); });
      window.addEventListener('scroll', updateActive, { passive: true });
      updateActive();
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}

if (typeof module !== 'undefined' && module.exports) module.exports = { getOpeningStatus };
