// The gallery: the wall of mysteries as a round room at night. Scrolling walks the visitor along the curved
// wall, the painting in front of them is lit, and a click walks up to it and opens its story. CSS 3D only,
// no WebGL: every painting stays a real link, and without JavaScript (or in List view) the wall is the
// salon hang of wall.ts. The room is a cylinder of radius R; the camera stands near the wall and looks along it.
const STORE = 'zoomed-art-view';
const NEAR = 0.12;     // paintings closer than this (x screen height) are hidden: CSS 3D cannot draw behind the camera
const WALK_PER = 0.55; // scroll length per painting, x screen height

interface Item { el: HTMLElement; link: HTMLAnchorElement; img: HTMLImageElement; style: string; ar: number; theta: number; w: number; h: number; r: number; }
interface Piece { el: HTMLElement; theta: number; }

export function initHall() {
  const found = document.querySelector<HTMLElement>('[data-gallery]');
  if (!found) return;
  const section: HTMLElement = found;
  const track = section.querySelector<HTMLElement>('[data-hall]')!;
  const stage = section.querySelector<HTMLElement>('[data-hall-stage]')!;
  const world = section.querySelector<HTMLElement>('[data-hall-world]')!;
  const walls = section.querySelector<HTMLElement>('[data-hall-walls]')!;
  const sign = section.querySelector<HTMLElement>('[data-hall-sign]')!;
  const list = section.querySelector<HTMLElement>('[data-wall]')!;
  const caption = section.querySelector<HTMLElement>('[data-hall-caption]')!;
  const enter = caption.querySelector<HTMLAnchorElement>('[data-hall-enter]')!;
  const bar = section.querySelector<HTMLElement>('[data-hall-progress]')!;
  const switches = [...section.querySelectorAll<HTMLButtonElement>('[data-view]')];
  switches[0].parentElement!.hidden = false;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items: Item[] = [...list.querySelectorAll<HTMLElement>('.wall-item')].map(el => {
    const img = el.querySelector('img')!;
    return { el, link: el.querySelector('a')!, img, style: el.getAttribute('style') ?? '', ar: +img.getAttribute('width')! / +img.getAttribute('height')!, theta: 0, w: 0, h: 0, r: 0 };
  });
  let segments: Piece[] = [];
  let H = 0, R = 0, F = 0, camZ = 0, yaw = 0, look = 0, eye = 0, signTheta = 0;
  let walk = 0, goal = 0, raf = 0, current = -1, hall = false, leaving = false;

  // Where the camera's line of sight meets the wall, as an angle around the room.
  const lookAngle = () => {
    const t = -camZ * Math.cos(yaw) + Math.sqrt(R * R - camZ * camZ * Math.sin(yaw) ** 2);
    return Math.atan2(t * Math.sin(yaw), camZ + t * Math.cos(yaw)); // the camera stands at z = -camZ
  };
  // Distance in front of the camera of a wall point at angle theta (after walking).
  const depth = (theta: number, r = R) => {
    const x = -r * Math.sin(theta), z = -r * Math.cos(theta) + camZ;
    return -(x * Math.sin(yaw) + z * Math.cos(yaw));
  };
  const place = (theta: number, y: number, r: number, w: number, h: number) =>
    `rotateY(${theta}rad) translate3d(${-w / 2}px,${y - h / 2}px,${-r}px)`;

  function layout() {
    H = stage.clientHeight;
    const W = stage.clientWidth, narrow = W < 760;
    const unit = Math.min(H, W * (narrow ? 1.75 : 1.1));
    F = narrow ? W * 1.1 : Math.max(H * 0.85, W * 0.5);
    stage.style.perspective = `${F}px`;
    section.style.setProperty('--u', `${unit / 100}px`);
    const maxH = unit * 0.32, maxW = unit * 0.6, gap = unit * 0.24;
    eye = -unit * 0.03;
    let s = unit * 0.35;
    signTheta = s;
    s += unit * 0.55;
    for (const it of items) {
      it.h = maxH; it.w = it.h * it.ar;
      if (it.w > maxW) { it.w = maxW; it.h = it.w / it.ar; }
      it.theta = s + it.w / 2; s += it.w + gap;
    }
    R = Math.max(unit * 2, s / (1.75 * Math.PI));
    signTheta /= R;
    // A flat painting on a curved wall touches it only in the middle: it hangs far enough out that its edges
    // and its light (10 units each side) stay in front of the wall, or the browser cuts them off.
    const off = (w: number) => R - (w / 2 + unit * 0.1) ** 2 / (2 * R) - 4;
    for (const it of items) {
      it.theta /= R;
      it.r = off(it.w);
      it.el.setAttribute('style', `${it.style};width:${it.w}px;transform:${place(it.theta, eye, it.r, it.w, it.h)}`);
      it.img.sizes = `${Math.round(it.w * 2)}px`;
    }
    sign.style.transform = place(signTheta, eye - unit * 0.02, off(unit * 0.45), unit * 0.45, unit * 0.3);
    sign.style.width = `${unit * 0.45}px`;
    // The wall: cylinder segments from ceiling to floor, a little behind the paintings.
    const step = Math.PI / 60, top = -Math.max(unit * 1.1, H * 0.9), bottom = unit * 0.44, chord = 2 * R * Math.sin(step / 2) + 2;
    walls.replaceChildren();
    segments = [];
    for (let a = -step * 4; a < s / R + step * 4; a += step) {
      const el = document.createElement('i');
      el.style.cssText = `width:${chord}px;height:${bottom - top}px;transform:rotateY(${a + step / 2}rad) translate3d(${-chord / 2}px,${top}px,${-R * Math.cos(step / 2)}px)`;
      walls.append(el);
      segments.push({ el, theta: a + step / 2 });
    }
    // Camera: near the wall, looking along it to the left (on a phone, more straight on).
    camZ = R - unit * (narrow ? 0.62 : 0.9);
    yaw = (narrow ? 30 : 52) * Math.PI / 180;
    look = lookAngle();
    track.style.height = `${H + (items.length) * H * WALK_PER}px`;
  }

  const progress = () => {
    const r = track.getBoundingClientRect(), length = track.offsetHeight - H;
    return length > 0 ? Math.min(1, Math.max(0, -r.top / length)) : 0;
  };
  // Progress 0 faces the room's sign, then each painting in turn; the walk slows down in front of each one.
  const thetaAt = (p: number) => {
    const stops = [signTheta, ...items.map(it => it.theta)], k = p * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(k));
    const f = k - i, dwell = f - Math.sin(2 * Math.PI * f) / (2 * Math.PI) * 0.85;
    return stops[i] + (stops[i + 1] - stops[i]) * dwell;
  };

  function render() {
    world.style.transform = `translateZ(${F}px) rotateY(${-yaw}rad) translate3d(0,0,${camZ}px) rotateY(${walk}rad)`;
    let best = -1, bestGap = Infinity;
    items.forEach((it, i) => {
      const d = depth(it.theta + walk);
      // Behind the camera: transparent and not clickable, but not visibility:hidden, which would block keyboard focus.
      it.el.classList.toggle('is-behind', d <= H * NEAR);
      const gap = Math.abs(it.theta + walk - look);
      if (gap < bestGap) { bestGap = gap; best = i; }
    });
    sign.style.visibility = depth(signTheta + walk) > H * NEAR ? '' : 'hidden';
    for (const seg of segments) seg.el.style.visibility = depth(seg.theta + walk, R * Math.cos(Math.PI / 120)) > H * 0.02 ? '' : 'hidden';
    // The painting in front is lit only once the visitor is close to it, not halfway between two.
    const lit = bestGap < (items[best].w / R) * 0.9 ? best : -1;
    if (lit !== current) {
      items.forEach((it, i) => it.el.classList.toggle('is-front', i === lit));
      current = lit;
      caption.classList.toggle('is-shown', lit >= 0);
      if (lit >= 0) {
        const it = items[lit];
        caption.querySelector('[data-hall-count]')!.textContent = `${String(lit + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
        caption.querySelector('[data-hall-question]')!.textContent = it.el.querySelector('.wall-hook')!.textContent;
        caption.querySelector('[data-hall-work]')!.innerHTML = it.el.querySelector('.wall-label')!.innerHTML;
        enter.href = it.link.href;
      }
    }
  }

  function frame() {
    walk += (goal - walk) * (reduce ? 1 : 0.12);
    if (Math.abs(goal - walk) < 1e-5) walk = goal;
    render();
    raf = walk === goal ? 0 : requestAnimationFrame(frame);
  }
  function onScroll() {
    if (!hall || leaving) return;
    const p = progress();
    goal = look - thetaAt(p);
    bar.style.transform = `scaleX(${p})`;
    section.classList.toggle('is-walking', p > 0.01);
    if (!raf) raf = requestAnimationFrame(frame);
  }

  // A click walks up to the painting: the visitor turns to face it, steps closer, and stops where the painting
  // will stand on its own page. The page then opens around it (a view transition on view-transition-name
  // art-<slug>; the arrival styles are in global.css and the pagereveal hook in Base.astro).
  const camera = (y: number, z: number, turn: number, w: number) =>
    `translateZ(${F}px) rotateY(${turn}rad) translate3d(0,${y}px,${z}px) rotateY(${w}rad)`;
  let flight: Animation | null = null;
  function approach(it: Item, href: string) {
    const path = new URL(href).pathname;
    try { sessionStorage.setItem('zoomed-art-arrival', path); } catch {}
    if (reduce || !world.animate) { location.href = href; return; }
    leaving = true;
    cancelAnimationFrame(raf); raf = 0;
    // Where the painting stands on its page (Painting.astro, .arrival-figure in global.css): centred, below the
    // header and breadcrumb, at most 68vh (72svh and full width on a phone).
    const W = stage.clientWidth, narrow = W < 760, gutter = Math.min(80, Math.max(20, W * 0.045));
    let h = narrow ? W / it.ar : Math.min(innerHeight * 0.68, 850);
    if (narrow) h = Math.min(h, innerHeight * 0.72);
    else h = Math.min(h, (W - 2 * gutter) / it.ar);
    const centre = (narrow ? 133 : 166) + h / 2 - stage.getBoundingClientRect().top;
    const dist = it.h * F / h, origin = world.offsetTop;
    const y = (centre - H / 2) * dist / F + (H / 2 - origin) - eye;
    // Fetch the page and its big image while the camera moves (same srcset and sizes as Painting.astro, so the
    // page finds it in the cache). The painting on the wall keeps its image: swapping it mid-flight blanks it.
    const big = new Image();
    big.sizes = '(max-width: 700px) 100vw, 92vw';
    big.srcset = it.img.dataset.full ?? '';
    const preload = document.createElement('link');
    preload.rel = 'prefetch'; preload.href = href;
    document.head.append(preload);
    section.classList.add('is-approaching');
    it.el.classList.add('is-chosen');
    // Halfway, already facing it, a little closer than at the start: the painting only ever grows.
    const start = Math.max(dist, depth(it.theta + walk, it.r)), half = start + (dist - start) * 0.35;
    const from = camera(0, camZ, -yaw, walk), facing = camera(y * 0.4, it.r - half, 0, -it.theta), close = camera(y, it.r - dist, 0, -it.theta);
    flight = world.animate([
      { transform: from, easing: 'cubic-bezier(.45,0,.4,1)' },
      { transform: facing, offset: 0.45, easing: 'cubic-bezier(.3,0,.15,1)' },
      { transform: close },
    ], { duration: 1300, fill: 'forwards' });
    flight.finished.then(() => setTimeout(() => { location.href = href; }, 120), () => {});
  }
  list.addEventListener('click', event => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('.wall-link');
    if (!hall || !link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    approach(items.find(it => it.link === link)!, link.href);
  });
  enter.addEventListener('click', event => {
    if (current < 0 || event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    approach(items[current], enter.href);
  });
  // Keyboard: a focused painting is brought in front of the visitor.
  list.addEventListener('focusin', event => {
    const i = items.findIndex(it => it.el.contains(event.target as Node));
    if (!hall || i < 0) return;
    const top = track.getBoundingClientRect().top + scrollY, length = track.offsetHeight - H;
    scrollTo({ top: top + length * (i + 1) / items.length, behavior: 'instant' });
  });
  // Back from a painting's page: the camera steps back out to where the visitor was standing.
  addEventListener('pageshow', event => {
    if (!event.persisted || !leaving) return;
    section.classList.remove('is-approaching');
    items.forEach(it => it.el.classList.remove('is-chosen'));
    const done = () => { flight?.cancel(); flight = null; leaving = false; render(); onScroll(); };
    if (!flight || reduce) return done();
    flight.updatePlaybackRate(1.6);
    flight.reverse();
    flight.finished.then(done, done);
  });

  function setMode(mode: 'hall' | 'list') {
    hall = mode === 'hall';
    section.classList.toggle('is-hall', hall);
    switches.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === mode)));
    try { localStorage.setItem(STORE, mode); } catch {}
    if (hall) {
      items.forEach(it => it.el.classList.remove('is-waiting'));
      layout();
      walk = goal = look - thetaAt(progress());
      current = -1;
      render();
      onScroll();
    } else {
      items.forEach(it => { it.el.setAttribute('style', it.style); it.img.sizes = '(max-width: 760px) 92vw, 420px'; it.el.classList.remove('is-front', 'is-behind'); });
      track.style.height = '';
      world.style.transform = '';
    }
  }
  switches.forEach(b => b.addEventListener('click', () => {
    if ((b.dataset.view === 'hall') === hall) return;
    setMode(b.dataset.view as 'hall' | 'list');
    section.scrollIntoView({ behavior: 'instant' });
  }));
  let saved: string | null = null;
  try { saved = localStorage.getItem(STORE); } catch {}
  setMode(saved === 'list' || (!saved && reduce) ? 'list' : 'hall');
  addEventListener('scroll', onScroll, { passive: true });
  let resize = 0;
  addEventListener('resize', () => {
    if (!hall) return;
    cancelAnimationFrame(resize);
    resize = requestAnimationFrame(() => { layout(); walk = goal = look - thetaAt(progress()); render(); });
  });
}
