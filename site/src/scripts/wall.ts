// The wall is dark, like a museum room at night. The paintings level with the middle of the screen are
// lit as the visitor walks past them (scrolls); on a mouse, the one under the pointer is lit too.
export function initWall() {
  const wall = document.querySelector<HTMLElement>('[data-wall]');
  if (!wall) return;
  const items = [...wall.querySelectorAll<HTMLElement>('.wall-item')];
  wall.classList.add('is-dark');
  const lit = new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.classList.toggle('is-lit', entry.isIntersecting);
  }, { rootMargin: '-38% 0px -38% 0px' });
  // Only paintings still below the fold rise into place; the ones already on screen never flicker.
  const arrive = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.add('is-in');
      entry.target.classList.remove('is-waiting');
      arrive.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  items.forEach(item => {
    lit.observe(item);
    if (item.getBoundingClientRect().top > window.innerHeight) { item.classList.add('is-waiting'); arrive.observe(item); }
  });
}
