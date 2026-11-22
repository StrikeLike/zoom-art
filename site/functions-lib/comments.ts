// Shared by the comment API (functions/api/comments.ts) and the moderation API (functions/api/admin.ts).
// Comments live in Cloudflare D1. Anyone can comment without an account: a name, the comment, and Cloudflare
// Turnstile to keep bots out. Comments show at once; Alex hides any of them from /admin/.
import published from '../src/data/published.json';

interface Statement {
  bind(...values: unknown[]): Statement;
  all<T>(): Promise<{ results: T[] }>;
  first<T>(): Promise<T | null>;
  run(): Promise<{ meta: { last_row_id: number } }>;
}
export interface Env {
  DB: { prepare(sql: string): Statement };
  TURNSTILE_SECRET: string; // Turnstile widget secret (wrangler pages secret put TURNSTILE_SECRET)
  ADMIN_TOKEN: string;      // Alex's password for /admin/
  IP_SALT: string;          // any long random text: IPs are only kept as a salted hash
}
export interface Comment { id: number; parent_id: number | null; name: string; body: string; team: number; created_at: number }
export type Handler = (context: { request: Request; env: Env }) => Promise<Response>;

export const works = new Set<string>(published.works);
export const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
export const fail = (status: number, error: string) => json({ error }, status);

export function isAdmin(request: Request, env: Env) {
  const given = request.headers.get('authorization') ?? '', expected = `Bearer ${env.ADMIN_TOKEN ?? ''}`;
  if (!env.ADMIN_TOKEN || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function ipHash(request: Request, env: Env) {
  const ip = request.headers.get('cf-connecting-ip') ?? 'local';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${env.IP_SALT ?? ''}:${ip}`));
  return [...new Uint8Array(digest)].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function humanCheck(token: string, request: Request, env: Env) {
  if (!token || !env.TURNSTILE_SECRET) return false;
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  const ip = request.headers.get('cf-connecting-ip');
  if (ip) form.append('remoteip', ip);
  const answer = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  return Boolean(((await answer.json()) as { success?: boolean }).success);
}

// Spam is mostly links and a few words; anything else that is not fine, Alex hides from /admin/.
const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|ru|xyz|top|info|io|biz|shop|click)\b)/i;
const BLOCKED = /\b(casino|crypto|bitcoin|forex|viagra|cialis|porn|onlyfans|loan|escort)\b/i;
export function cleanText(text: unknown, max: number) {
  return String(text ?? '').replace(/\r\n?/g, '\n').replace(/[^\S\n]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
}
export function refuse(name: string, body: string, team: boolean) {
  if (name.length < 1) return 'Please write your name.';
  if (body.length < 2) return 'Please write a comment.';
  if (!team && /zoomed/i.test(name)) return 'Please choose another name.';
  if (!team && (LINK.test(body) || LINK.test(name))) return 'Links are not allowed in comments.';
  if (BLOCKED.test(body) || BLOCKED.test(name)) return 'This comment looks like spam.';
  return '';
}
