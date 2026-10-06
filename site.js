function nextShowcasePosition(positions, current, direction, maximum) {
  const stops = positions.map(position => Math.max(0, Math.min(maximum, position)));
  return direction > 0
    ? (stops.find(position => position > current + 1) ?? maximum)
    : ([...stops].reverse().find(position => position < current - 1) ?? 0);
}

function heroScrollState(distance, viewportHeight, reducedMotion = false) {
  const progress = reducedMotion ? 0 : Math.max(0, Math.min(1, distance / (Math.max(1, viewportHeight) * .8)));
  return {
    progress,
    opacity: 1 - progress,
    blur: progress * 5,
    lift: progress * 18,
    planShift: reducedMotion ? 0 : Math.max(0, Math.min(distance, viewportHeight)) * .6,
    planOpacity: .34 + progress * .16
  };
}


if (typeof module !== 'undefined') module.exports = { nextShowcasePosition, heroScrollState };

if (typeof document !== 'undefined') (() => {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const film = document.querySelector('[data-hero-film]');
  if (film) {
    const phone = window.matchMedia('(max-width: 767px)');
    let inView = true;
    let unavailable = false;
    film.loop = true;
    const playFilm = () => {
      film.play().catch(() => { film.classList.remove('is-ready'); });
    };
    const configureFilm = () => {
      if (motion.matches || navigator.connection?.saveData) {
        film.pause();
        film.removeAttribute('src');
        film.load();
        film.classList.remove('is-ready');
        return;
      }
      if (unavailable) return;
      const source = phone.matches ? film.dataset.mobileSrc : film.dataset.desktopSrc;
      if (inView && !document.hidden && film.getAttribute('src') !== source) {
        film.classList.remove('is-ready');
        film.src = source;
        film.muted = true;
      }
      if (inView && !document.hidden) playFilm();
    };
    film.addEventListener('playing', () => { film.classList.add('is-ready'); });
    film.addEventListener('error', () => {
      unavailable = true;
      film.classList.remove('is-ready');
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) film.pause();
      else configureFilm();
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        inView = entries[0].isIntersecting;
        if (!inView) film.pause();
        else configureFilm();
      }, { threshold: 0 }).observe(film.parentElement);
    }
    motion.addEventListener('change', configureFilm);
    phone.addEventListener('change', configureFilm);
    configureFilm();
  }
  const craftFilm = document.querySelector('[data-craft-film]');
  if (craftFilm) {
    let visible = !('IntersectionObserver' in window);
    let failed = false;
    const syncCraftFilm = () => {
      if (motion.matches || navigator.connection?.saveData) {
        craftFilm.pause();
        craftFilm.removeAttribute('src');
        craftFilm.load();
        craftFilm.classList.remove('is-ready');
      } else if (visible && !document.hidden && !failed) {
        if (!craftFilm.getAttribute('src')) craftFilm.src = craftFilm.dataset.src;
        craftFilm.muted = true;
        craftFilm.play().catch(() => craftFilm.classList.remove('is-ready'));
      } else craftFilm.pause();
    };
    craftFilm.addEventListener('playing', () => craftFilm.classList.add('is-ready'));
    craftFilm.addEventListener('error', () => { failed = true; craftFilm.classList.remove('is-ready'); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => { visible = entries[0].isIntersecting; syncCraftFilm(); }, { threshold: .01 }).observe(craftFilm.parentElement);
    }
    document.addEventListener('visibilitychange', syncCraftFilm);
    motion.addEventListener('change', syncCraftFilm);
    syncCraftFilm();
  }
  const hero = document.querySelector('.home-hero');
  if (hero) {
    const intro = hero.querySelector('.hero-main');
    const action = intro.querySelector('.button-link');
    let frame = 0;
    let start = 0;
    const paintHero = () => {
      frame = 0;
      const enabled = !motion.matches && intro.offsetHeight <= window.innerHeight * 1.2;
      const state = heroScrollState(window.scrollY - start, window.innerHeight, !enabled);
      hero.classList.toggle('hero-scroll-ready', enabled);
      hero.style.setProperty('--hero-opacity', state.opacity);
      hero.style.setProperty('--hero-blur', state.blur + 'px');
      hero.style.setProperty('--hero-lift', -state.lift + 'px');
      hero.style.setProperty('--hero-plan-shift', state.planShift + 'px');
      hero.style.setProperty('--hero-plan-opacity', state.planOpacity);
      intro.classList.toggle('hero-intro-hidden', state.progress >= .85);
      if (action) {
        if (state.progress >= .85) action.setAttribute('tabindex', '-1');
        else action.removeAttribute('tabindex');
      }
    };
    const scheduleHero = () => {
      if (!frame) frame = requestAnimationFrame(paintHero);
    };
    const measureHero = () => {
      start = hero.getBoundingClientRect().top + window.scrollY;
      scheduleHero();
    };
    window.addEventListener('scroll', scheduleHero, { passive: true });
    window.addEventListener('resize', measureHero);
    window.addEventListener('pageshow', measureHero);
    motion.addEventListener('change', measureHero);
    intro.addEventListener('focusin', () => {
      if (window.scrollY > start + window.innerHeight * .25) {
        window.scrollTo({ top: start, behavior: 'instant' });
      }
    });
    document.fonts?.ready.then(measureHero);
    measureHero();
  }
  const menu = document.querySelector('.mobile-menu');
  if (menu) {
    const trigger = menu.querySelector('summary');
    const background = [document.querySelector('main'), document.querySelector('.closing-cta'), document.querySelector('footer'), document.querySelector('.site-header .wordmark')].filter(Boolean);
    menu.addEventListener('toggle', () => {
      trigger.setAttribute('aria-expanded', String(menu.open));
      document.body.classList.toggle('menu-is-open', menu.open);
      background.forEach(element => { element.inert = menu.open; });
    });
    menu.addEventListener('keydown', event => {
      if (!menu.open) return;
      if (event.key === 'Escape') { event.preventDefault(); menu.open = false; trigger.focus(); }
      if (event.key === 'Tab') {
        const links = [...menu.querySelectorAll('summary, a[href]')];
        if (event.shiftKey && document.activeElement === links[0]) { event.preventDefault(); links.at(-1).focus(); }
        if (!event.shiftKey && document.activeElement === links.at(-1)) { event.preventDefault(); links[0].focus(); }
      }
    });
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { menu.open = false; }));
    window.matchMedia('(min-width: 768px)').addEventListener('change', event => { if (event.matches) menu.open = false; });
  }

  const work = document.querySelector('[data-work]');
  if (work) {
    const filters = [...work.querySelectorAll('[data-work-category-filter]')];
    const categories = filters.map(link => link.dataset.workCategoryFilter);
    const render = () => {
      const value = new URLSearchParams(location.search).get('category') || 'all';
      const category = categories.find(item => item.toLowerCase() === value.toLowerCase()) || 'all';
      work.querySelectorAll('[data-work-project]').forEach(item => { item.hidden = category !== 'all' && item.dataset.category !== category; });
      filters.forEach(link => {
        if (link.dataset.workCategoryFilter === category) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    };
    filters.forEach(link => link.addEventListener('click', event => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (link.href !== location.href) history.pushState(null, '', link.href);
      render();
    }));
    window.addEventListener('popstate', render);
    render();
  }

  document.querySelectorAll('[data-showcase]').forEach(showcase => {
    const track = showcase.querySelector('[data-showcase-track]');
    const cards = [...showcase.querySelectorAll('[data-showcase-card]')];
    const previous = showcase.querySelector('[data-showcase-prev]');
    const next = showcase.querySelector('[data-showcase-next]');
    if (!track || !cards.length || !previous || !next) return;
    // Featured width stays independent of scroll position, so swipes never resize the track.
    cards[Math.min(1, cards.length - 1)].classList.add('is-featured');
    const syncControls = () => {
      previous.disabled = track.scrollLeft <= 1;
      next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 1;
    };
    const move = direction => {
      const viewport = track.getBoundingClientRect();
      const positions = cards.map(card => {
        const box = card.getBoundingClientRect();
        return track.scrollLeft + box.left + box.width / 2 - viewport.left - track.clientWidth / 2;
      });
      track.scrollTo({ left: nextShowcasePosition(positions, track.scrollLeft, direction, track.scrollWidth - track.clientWidth), behavior: motion.matches ? 'instant' : 'smooth' });
    };
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    track.addEventListener('scroll', syncControls, { passive: true });
    window.addEventListener('resize', syncControls);
    syncControls();
  });

  if (!motion.matches && 'IntersectionObserver' in window && Element.prototype.animate) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        if (motion.matches) return;
        const image = entry.target.dataset.reveal === 'image';
        entry.target.animate([{ opacity: .8, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: image ? 500 : 350, easing: 'cubic-bezier(.2,.7,.2,1)' });
        if (image) entry.target.querySelector('img')?.animate([{ transform: 'scale(1.04)' }, { transform: 'scale(1)' }], { duration: 850, easing: 'cubic-bezier(.2,.7,.2,1)' });
      });
    }, { threshold: .13 });
    document.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element));
    motion.addEventListener('change', event => { if (event.matches) { observer.disconnect(); document.getAnimations().forEach(animation => animation.cancel()); } });
  }
})();
