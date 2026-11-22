-- Comments on painting pages. One level of replies (parent_id); team = written by Zoomed Art from /admin/;
-- hidden = removed by Alex (kept, so it can be shown again). ip_hash = salted hash, only for the rate limit.
CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work TEXT NOT NULL,
  parent_id INTEGER REFERENCES comments(id),
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  team INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0,
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX comments_by_work ON comments (work, hidden, created_at);
CREATE INDEX comments_by_ip ON comments (ip_hash, created_at);
