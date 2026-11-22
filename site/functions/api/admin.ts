// Moderation for /admin/, with Alex's token (Authorization: Bearer <ADMIN_TOKEN>).
// GET  /api/admin            the latest 300 comments on every painting, hidden ones too
// POST /api/admin            { id, hidden }  hides a comment, or shows it again
import { fail, isAdmin, json, type Handler } from '../../functions-lib/comments';

export const onRequestGet: Handler = async ({ request, env }) => {
  if (!isAdmin(request, env)) return fail(401, 'Wrong password.');
  const { results } = await env.DB.prepare(
    'SELECT id, work, parent_id, name, body, team, hidden, created_at FROM comments ORDER BY created_at DESC LIMIT 300',
  ).all();
  return json({ comments: results });
};

export const onRequestPost: Handler = async ({ request, env }) => {
  if (!isAdmin(request, env)) return fail(401, 'Wrong password.');
  const input = await request.json().catch(() => null) as { id?: number; hidden?: boolean } | null;
  if (!input?.id) return fail(400, 'Bad request.');
  await env.DB.prepare('UPDATE comments SET hidden = ? WHERE id = ?').bind(input.hidden ? 1 : 0, input.id).run();
  return json({ ok: true });
};
