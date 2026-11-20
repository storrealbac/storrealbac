// Movimiento del sitio: ajuste del nombre, intro, cursor, scroll y apariciones.
// Todo es opcional: sin este archivo la página se ve completa, solo que quieta.

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/* ---------- 1. nombre: medir el ancho real de cada palabra ----------
   El tamaño del nombre se calcula en CSS como (ancho deseado) / (ancho de la
   palabra en em). Ese ancho depende de la letra, así que se mide aquí: si cambias
   el archivo de la tipografía, el nombre sigue calzando de borde a borde. */
const hero = document.querySelector<HTMLElement>('.hero');

function measureHero() {
  if (!hero) return;
  hero.querySelectorAll<HTMLElement>('[data-ratio]').forEach((el) => {
    el.style.fontSize = '100px';
    const width = el.getBoundingClientRect().width;
    el.style.fontSize = '';
    if (width > 0 && el.dataset.ratio) {
      hero.style.setProperty(el.dataset.ratio, (width / 100).toFixed(4));
    }
  });
}

/* ---------- 2. intro: parte cuando la letra y la foto ya cargaron ---------- */
async function startIntro() {
  const waits: Promise<unknown>[] = [];
  if (document.fonts?.load) {
    waits.push(
      document.fonts.load("300 1em 'Torrealba Sans'"),
      document.fonts.load("400 1em 'Torrealba Sans'"),
    );
  }
  const photo = document.querySelector<HTMLImageElement>('.hero-photo img');
  if (photo?.decode) waits.push(photo.decode().catch(() => undefined));

  const timeout = new Promise((resolve) => setTimeout(resolve, 2000));
  await Promise.race([Promise.allSettled(waits), timeout]);

  measureHero();
  requestAnimationFrame(() => root.classList.add('go'));
}
startIntro();

/* ---------- 3. cursor propio: punto exacto + aro que lo sigue ----------
   El punto va pegado al mouse; el aro llega con un pequeño retraso. Sobre un link
   el aro crece. Solo se activa con mouse y al primer movimiento, así el cursor del
   sistema nunca desaparece si algo falla. */
const cursor = document.querySelector<HTMLElement>('.cursor');
const dot = cursor?.querySelector<HTMLElement>('.cursor-dot');
const ring = cursor?.querySelector<HTMLElement>('.cursor-ring');
const hasMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// Al hacer scroll el mouse no se mueve, pero lo que hay debajo sí cambia.
let refreshCursor = () => {};

if (cursor && dot && ring && hasMouse && !reduceMotion) {
  const pointer = { x: 0, y: 0 };
  const trail = { x: 0, y: 0 };
  let frame = 0;
  let active = false;

  const place = (el: HTMLElement, x: number, y: number) => {
    el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
  };

  const readTarget = (el: Element | null) => {
    const link = el?.closest('a, button') ?? null;
    cursor.classList.toggle('is-link', !!link);
    cursor.classList.toggle('is-inverse', !!link?.matches('[data-cursor="inverse"]'));
  };

  const follow = () => {
    trail.x += (pointer.x - trail.x) * 0.22;
    trail.y += (pointer.y - trail.y) * 0.22;
    place(ring, trail.x, trail.y);
    const far = Math.abs(pointer.x - trail.x) + Math.abs(pointer.y - trail.y) > 0.1;
    frame = far ? requestAnimationFrame(follow) : 0;
  };

  window.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType !== 'mouse') return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      place(dot, pointer.x, pointer.y);
      if (!active) {
        active = true;
        trail.x = pointer.x;
        trail.y = pointer.y;
        place(ring, trail.x, trail.y);
        root.classList.add('has-cursor');
      }
      cursor.classList.remove('is-away');
      readTarget(event.target instanceof Element ? event.target : null);
      if (!frame) frame = requestAnimationFrame(follow);
    },
    { passive: true },
  );

  window.addEventListener('pointerdown', () => cursor.classList.add('is-down'));
  window.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
  root.addEventListener('pointerleave', () => cursor.classList.add('is-away'));

  refreshCursor = () => {
    if (active) readTarget(document.elementFromPoint(pointer.x, pointer.y));
  };
}

/* ---------- 4. scroll ----------
   --sy = píxeles de scroll: la foto baja más lento que las letras.
   --p  = avance de la sección de links, de 0 a 1: el título se desliza. */
const work = document.querySelector<HTMLElement>('.work');
let scrollQueued = false;

function applyScroll() {
  scrollQueued = false;
  const viewport = window.innerHeight;
  const y = window.scrollY;

  if (hero && y <= hero.offsetHeight) hero.style.setProperty('--sy', y.toFixed(1));

  if (work) {
    const rect = work.getBoundingClientRect();
    const progress = clamp((viewport - rect.top) / (viewport + rect.height), 0, 1);
    work.style.setProperty('--p', progress.toFixed(4));
  }

  refreshCursor();
}

function onScroll() {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(applyScroll);
}

if (!reduceMotion) {
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  applyScroll();
}

/* ---------- 5. apariciones al entrar en pantalla ---------- */
const revealTargets = document.querySelectorAll<HTMLElement>('.reveal');

if ('IntersectionObserver' in window && !reduceMotion) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  revealTargets.forEach((el) => observer.observe(el));
} else {
  revealTargets.forEach((el) => el.classList.add('in'));
}
