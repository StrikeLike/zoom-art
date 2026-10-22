// The Daily Detail: one detail a day, the same for everyone. The visitor finds it in the painting by
// tapping; the result can be shared without giving the answer away. Progress stays in this browser only.
type Focus = [number, number, number, number];
interface Item { slug: string; title: string; artist: string; year: string; alt: string; w: number; h: number; focus: Focus; headline: string; text: string; step: number; clue: [number, number]; }
interface Saved { lastDay?: number; streak?: number; results?: Record<number, { found: boolean; secs: number; taps: number }>; }

const KEY = 'zoomed-art-daily';
const load = (): Saved => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const save = (value: Saved) => { try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* private mode: play without memory */ } };
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const pct = (n: number) => `${(n * 100).toFixed(3)}%`;
const place = (el: HTMLElement, x: number, y: number, w: number, h: number) =>
  Object.assign(el.style, { left: pct(x), top: pct(y), width: pct(w), height: pct(h) });

export function initDaily() {
  const root = document.querySelector<HTMLElement>('[data-daily]');
  if (!root) return;
  const $ = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const pool: Item[] = JSON.parse($('[data-daily-pool]').textContent!);
  const [ey, em, ed] = root.dataset.epoch!.split('-').map(Number);
  const today = new Date();
  const day = Math.max(1, Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(ey, em - 1, ed)) / 864e5) + 1);
  const item = pool[(day - 1) % pool.length];
  const [cx, cy, fw, fh] = item.focus;
  const base = `/images/${item.slug}`;

  const game = $('.daily-game'), board = $('[data-daily-board]'), canvas = $('.daily-canvas');
  const status = $('.daily-status');
  const hint = $('.daily-hint'), miss = $('.daily-miss'), found = $('.daily-found');
  const reveal = $<HTMLButtonElement>('[data-daily-reveal]');
  game.hidden = false;
  $('[data-daily-number]').textContent = `#${day}`;
  $('[data-daily-work]').textContent = `${item.title} (${item.artist}, ${item.year})`;

  const clue = $<HTMLImageElement>('[data-daily-clue]');
  Object.assign(clue, { src: `${base}/detail-${item.step}.webp`, width: item.clue[0], height: item.clue[1], alt: `A detail from ${item.title}` });
  const painting = $<HTMLImageElement>('[data-daily-painting]');
  Object.assign(painting, { src: `${base}/painting-1280.webp`, width: item.w, height: item.h, alt: item.alt, sizes: '(max-width: 760px) 160vw, 60vw',
    srcset: [768, 1280, 1920].map(size => `${base}/painting-${size}.webp ${Math.min(size, item.w)}w`).join(', ') });
  canvas.style.setProperty('--ar', String(item.w / item.h));
  status.textContent = status.dataset.start!;

  let start = 0, taps = 0, done = false;
  new IntersectionObserver((entries, observer) => {
    if (entries[0].isIntersecting) { start ||= performance.now(); observer.disconnect(); }
  }, { threshold: 0.4 }).observe(board);
  painting.addEventListener('load', () => { board.scrollLeft = (board.scrollWidth - board.clientWidth) / 2; }, { once: true });

  function finish(wasFound: boolean, saved?: { found: boolean; secs: number; taps: number }) {
    done = true;
    canvas.classList.add('is-done');
    hint.hidden = true; miss.hidden = true; reveal.hidden = true;
    place(found, cx - fw / 2, cy - fh / 2, fw, fh);
    found.hidden = false;
    if (!saved && !reduced.matches) { found.classList.remove('is-arriving'); void found.offsetWidth; found.classList.add('is-arriving'); }
    const target = (cx * canvas.offsetWidth) - board.clientWidth / 2;
    board.scrollTo({ left: target, behavior: reduced.matches ? 'auto' : 'smooth' });

    const memory = load();
    const result = saved ?? { found: wasFound, secs: Math.max(1, Math.round((performance.now() - (start || performance.now())) / 1000)), taps };
    if (!saved) {
      memory.streak = memory.lastDay === day - 1 ? (memory.streak ?? 0) + 1 : memory.lastDay === day ? memory.streak ?? 1 : 1;
      memory.lastDay = day;
      memory.results = { ...memory.results, [day]: result };
      save(memory);
    }
    const verdict = $('[data-daily-verdict]');
    verdict.textContent = result.found
      ? `${verdict.dataset.found} · ${result.secs} s${result.taps > 1 ? ` · ${result.taps} taps` : ''}`
      : verdict.dataset.revealed!;
    $('[data-daily-headline]').textContent = item.headline;
    $('[data-daily-text]').textContent = item.text;
    $('[data-daily-streak]').textContent = String(memory.streak ?? 1);
    $<HTMLAnchorElement>('[data-daily-story]').href = `/works/${item.slug}/#step-${item.step}`;
    status.textContent = '';
    $('.daily-result').hidden = false;
    const tick = () => {
      const midnight = new Date(); midnight.setHours(24, 0, 0, 0);
      const minutes = Math.ceil((midnight.getTime() - Date.now()) / 60000);
      $('[data-daily-countdown]').textContent = `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
    };
    tick(); setInterval(tick, 30000);
    const share = $<HTMLButtonElement>('[data-daily-share]');
    share.onclick = async () => {
      const text = `Zoomed Art · Daily Detail #${day}\n${result.found ? `Found it in ${result.secs} s${result.taps > 1 ? ` (${result.taps} taps)` : ''}` : 'This one beat me'} 🔍\nhttps://zoomedart.com/#daily`;
      if (navigator.share) { try { await navigator.share({ text }); } catch { /* closed */ } return; }
      try { await navigator.clipboard.writeText(text); status.textContent = status.dataset.copied!; } catch { /* no clipboard */ }
    };
  }

  canvas.addEventListener('click', event => {
    if (done) return;
    start ||= performance.now();
    taps++;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height;
    const reachX = Math.max(fw / 2, 0.035) + 0.01, reachY = Math.max(fh / 2, 0.035) + 0.01;
    if (Math.abs(x - cx) <= reachX && Math.abs(y - cy) <= reachY) { finish(true); return; }
    miss.hidden = false;
    Object.assign(miss.style, { left: pct(x), top: pct(y) });
    miss.classList.remove('is-missed'); void miss.offsetWidth; miss.classList.add('is-missed');
    status.textContent = status.dataset.miss!;
    if (taps === 3) {
      // Light up the third of the painting (a 3 x 3 grid cell) that holds the detail.
      const col = Math.min(2, Math.floor(cx * 3)), row = Math.min(2, Math.floor(cy * 3));
      place(hint, col / 3, row / 3, 1 / 3, 1 / 3);
      hint.hidden = false;
      status.textContent = status.dataset.hint!;
    }
  });
  reveal.addEventListener('click', () => { if (!done) finish(false); });

  const saved = load().results?.[day];
  if (saved) finish(saved.found, saved);
}
