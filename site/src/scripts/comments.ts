// Comments under a painting's story (Comments.astro). They load when the visitor gets near them; Cloudflare
// Turnstile (invisible unless it has a doubt) loads only once someone starts writing.
interface Comment { id: number; parent_id: number | null; name: string; body: string; team: number; created_at: number }
interface Turnstile { render(el: HTMLElement, options: Record<string, unknown>): string; reset(id: string): void }
declare global { interface Window { turnstile?: Turnstile } }

const NAME_KEY = 'zoomed-art-comment-name';

export function initComments() {
  const found = document.querySelector<HTMLElement>('[data-comments]');
  if (!found) return;
  const root: HTMLElement = found;
  const work = root.dataset.work!, sitekey = root.dataset.sitekey!;
  const t = JSON.parse(root.dataset.texts!) as Record<string, string>;
  const list = root.querySelector<HTMLOListElement>('[data-comment-list]')!;
  const state = root.querySelector<HTMLElement>('[data-comments-state]')!;
  const empty = root.querySelector<HTMLElement>('[data-comments-empty]')!;
  const count = root.querySelector<HTMLElement>('[data-comment-count]')!;
  const form = root.querySelector<HTMLFormElement>('[data-comment-form]')!;
  const status = root.querySelector<HTMLElement>('[data-comment-status]')!;
  const replying = root.querySelector<HTMLElement>('[data-replying]')!;
  const submit = form.querySelector<HTMLButtonElement>('[type=submit]')!;
  let parent: number | null = null, token = '', widget = '', total = 0;
  const when = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  try { (form.elements.namedItem('name') as HTMLInputElement).value = localStorage.getItem(NAME_KEY) ?? ''; } catch {}

  function ago(ms: number) {
    const s = (ms - Date.now()) / 1000;
    for (const [unit, size] of [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]] as const)
      if (Math.abs(s) >= size) return when.format(Math.round(s / size), unit);
    return when.format(0, 'second');
  }
  function setCount(n: number) {
    total = n;
    count.textContent = n ? `· ${n} ${n === 1 ? t.countOne : t.count}` : '';
    empty.hidden = n > 0;
  }
  // Built with textContent only: nothing a visitor writes is ever read as HTML.
  function item(c: Comment) {
    const li = document.createElement('li');
    li.className = 'comment';
    li.id = `comment-${c.id}`;
    const head = document.createElement('p');
    head.className = 'comment-head';
    const name = document.createElement('span');
    name.className = 'comment-name';
    name.textContent = c.name;
    // A reply from the team shows as the gold Zoomed Art badge instead of a name.
    if (c.team) {
      name.className = 'comment-team';
      name.textContent = t.team;
    }
    head.append(name);
    const time = document.createElement('time');
    time.dateTime = new Date(c.created_at).toISOString();
    time.textContent = ago(c.created_at);
    head.append(time);
    const body = document.createElement('p');
    body.className = 'comment-body';
    body.textContent = c.body;
    const reply = document.createElement('button');
    reply.type = 'button';
    reply.className = 'comment-reply';
    reply.textContent = t.reply;
    reply.addEventListener('click', () => replyTo(c));
    li.append(head, body, reply);
    if (!c.parent_id) {
      const replies = document.createElement('ol');
      replies.className = 'comment-replies';
      li.append(replies);
    }
    return li;
  }
  function add(c: Comment) {
    const holder = c.parent_id ? list.querySelector(`#comment-${c.parent_id} > .comment-replies`) : list;
    (holder ?? list).append(item(c));
  }

  function replyTo(c: Comment) {
    parent = c.parent_id ?? c.id;
    replying.hidden = false;
    replying.querySelector('[data-replying-name]')!.textContent = c.name;
    form.querySelector('textarea')!.focus();
  }
  replying.querySelector('[data-cancel-reply]')!.addEventListener('click', () => { parent = null; replying.hidden = true; });

  async function load() {
    try {
      const answer = await fetch(`/api/comments?work=${encodeURIComponent(work)}`);
      if (!answer.ok) throw new Error(String(answer.status));
      const { comments } = await answer.json() as { comments: Comment[] };
      list.replaceChildren();
      comments.filter(c => !c.parent_id).forEach(add);
      comments.filter(c => c.parent_id).forEach(add);
      setCount(comments.length);
      state.hidden = true;
      form.hidden = false;
    } catch {
      state.textContent = t.unavailable;
    }
  }
  new IntersectionObserver((entries, watcher) => {
    if (entries.some(e => e.isIntersecting)) { watcher.disconnect(); load(); }
  }, { rootMargin: '800px 0px' }).observe(root);

  // Turnstile, the first time someone starts to write.
  function check() {
    if (widget || document.querySelector('script[data-turnstile-api]')) return;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.dataset.turnstileApi = '';
    script.onload = () => {
      widget = window.turnstile!.render(root.querySelector<HTMLElement>('[data-turnstile]')!, {
        sitekey, theme: 'dark', appearance: 'interaction-only', action: 'comment',
        callback: (value: string) => { token = value; if (status.textContent === t.waitCheck) status.textContent = ''; },
        'expired-callback': () => { token = ''; },
        'error-callback': () => { token = ''; },
      });
    };
    document.head.append(script);
  }
  form.addEventListener('focusin', check);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!token) { check(); status.textContent = t.waitCheck; return; }
    const data = new FormData(form);
    // aria-disabled, not disabled: a disabled button loses focus and the keyboard user is sent to the top of the page.
    if (submit.getAttribute('aria-disabled') === 'true') return;
    submit.setAttribute('aria-disabled', 'true');
    status.textContent = t.posting;
    try {
      const answer = await fetch('/api/comments', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ work, parent, token, name: data.get('name'), body: data.get('body'), website: data.get('website') }),
      });
      const result = await answer.json().catch(() => ({})) as { comment?: Comment | null; error?: string };
      if (!answer.ok) throw new Error(result.error ?? t.error);
      if (result.comment) {
        add(result.comment);
        setCount(total + 1);
        document.getElementById(`comment-${result.comment.id}`)?.classList.add('is-new');
      }
      try { localStorage.setItem(NAME_KEY, String(data.get('name') ?? '')); } catch {}
      (form.elements.namedItem('body') as HTMLTextAreaElement).value = '';
      parent = null;
      replying.hidden = true;
      status.textContent = t.posted;
    } catch (error) {
      status.textContent = error instanceof Error && error.message ? error.message : t.error;
    } finally {
      submit.removeAttribute('aria-disabled');
      token = '';
      if (widget) window.turnstile!.reset(widget);
    }
  });
}
