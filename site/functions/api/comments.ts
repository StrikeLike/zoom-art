// GET  /api/comments?work=<slug>  the visible comments of one painting, oldest first
// POST /api/comments              { work, name, body, parent?, token, website }  posts a comment (website = bot trap)
import { cleanText, fail, humanCheck, ipHash, isAdmin, json, refuse, works, type Comment, type Handler } from '../../functions-lib/comments';

const PER_TEN_MINUTES = 5;

export const onRequestGet: Handler = async ({ request, env }) => {
  const work = new URL(request.url).searchParams.get('work') ?? '';
  if (!works.has(work)) return fail(404, 'Unknown painting.');
  const { results } = await env.DB.prepare(
    'SELECT id, parent_id, name, body, team, created_at FROM comments WHERE work = ? AND hidden = 0 ORDER BY created_at LIMIT 500',
  ).bind(work).all<Comment>();
  return json({ comments: results });
};

export const onRequestPost: Handler = async ({ request, env }) => {
  const input = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!input) return fail(400, 'Bad request.');
  if (input.website) return json({ comment: null }); // the hidden field only bots fill in
  const work = String(input.work ?? ''), team = isAdmin(request, env);
  if (!works.has(work)) return fail(404, 'Unknown painting.');
  const name = team ? 'Zoomed Art' : cleanText(input.name, 40), body = cleanText(input.body, 1000);
  const problem = refuse(name, body, team);
  if (problem) return fail(422, problem);
  const ip = await ipHash(request, env), now = Date.now();
  if (!team) {
    if (!(await humanCheck(String(input.token ?? ''), request, env))) return fail(403, 'We could not check that you are not a robot. Please try again.');
    const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM comments WHERE ip_hash = ? AND created_at > ?').bind(ip, now - 600_000).first<{ n: number }>();
    if ((recent?.n ?? 0) >= PER_TEN_MINUTES) return fail(429, 'You are commenting very fast. Please wait a few minutes.');
  }
  // Replies go one level deep: a reply to a reply joins the same conversation.
  let parent: number | null = null;
  if (input.parent) {
    const above = await env.DB.prepare('SELECT id, parent_id FROM comments WHERE id = ? AND work = ? AND hidden = 0').bind(Number(input.parent), work).first<{ id: number; parent_id: number | null }>();
    if (!above) return fail(404, 'That comment is no longer here.');
    parent = above.parent_id ?? above.id;
  }
  const { meta } = await env.DB.prepare(
    'INSERT INTO comments (work, parent_id, name, body, team, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).bind(work, parent, name, body, team ? 1 : 0, ip, now).run();
  return json({ comment: { id: meta.last_row_id, parent_id: parent, name, body, team: team ? 1 : 0, created_at: now } satisfies Comment }, 201);
};
