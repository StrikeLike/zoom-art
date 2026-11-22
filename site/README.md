# Zoomed Art website

Static Astro site for **zoomedart.com**. Every painting page is generated from the same
`pipeline/works/<slug>/script.json` that makes the carousel and the reel, so the site tells exactly the
story that was posted. Nothing is deployed automatically.

## Pages

| URL | Content |
| --- | --- |
| `/` | The wall of mysteries (every published painting with its hook question) and the Daily Detail game |
| `/works/<slug>/` | Arrival, guided zoom story, free deep-zoom explorer, details, credits, related paintings |
| `/artists/pieter-bruegel-the-elder/` | Bruegel's paintings on the site |
| `/collections/hidden-details/` | All paintings, starting with The Ambassadors |
| `/about/`, `/editorial-policy/` | Who we are, how facts and images are handled |

A painting page is offered to search engines (no `noindex`) only once it has a long-form article in
`src/data/articles/<slug>.json` (see `childrens-games.json`).

## Add a painting

1. The work must have `script.json` and `image.jpg` in `pipeline/works/<slug>/` (the normal pipeline).
2. Add the slug to `src/data/published.json`; the order there is the order on the wall.
3. From the repository root: `.venv\Scripts\python.exe site\scripts\prepare-images.py <slug>`
   (whole-painting WebPs, one crop per detail, 512 px DZI tiles; `src/data/images.json` is updated).
4. From `site/`: `npm run build` then `npm run verify`.

## The gallery (home page)

The wall of mysteries opens as a gallery: a round room at night (`src/scripts/hall.ts`, styles at the end of
`src/styles/home.css`). Scrolling walks the visitor along the curved wall, the painting in front of them is lit
and its question shows at the bottom; a click walks up to the painting and opens its page. It is CSS 3D, no
WebGL, and every painting stays a normal link: without JavaScript, with reduced motion, or with the **List**
button, the same paintings show as the salon hang. The visitor's choice of Gallery or List is remembered.
To tune it, the numbers are in `layout()` in `hall.ts`: painting size (`maxH`, `maxW`, `gap`), the camera's
distance from the wall and how far it looks along it (`camZ`, `yaw`), and the lens (`F`). Wall colours are in
`.hall-walls>i` and `.hall-stage`.

The Daily Detail draws from every published painting automatically: each day (counted from
22 Oct 2026) shows one detail, the same for everyone. Changing `published.json` reshuffles future days.

## Run locally

Node.js 22+ and the repository `.venv` with Pillow.

```sh
cd site
npm install
npm run dev        # http://127.0.0.1:4321/
npm run build      # static site in dist/
npm run verify     # checks pages, links, focus data, JS budget; writes BUILD-REPORT.json
npm run preview    # serves dist/
```

## Deploy (Cloudflare Pages)

The web images (`public/images/`, ~170 MB, ~3,200 files) are generated locally and are not in git, so
the site is deployed from this computer rather than built by Cloudflare:

```sh
npm run build && npx wrangler pages deploy dist --project-name zoomedart
```

The first time, `npx wrangler login` opens the browser to connect the Cloudflare account.

## Comments

Every painting page ends with its comments (`src/components/Comments.astro`, `src/scripts/comments.ts`). No
account: a name and the comment; Cloudflare Turnstile keeps bots out, links and a few spam words are refused,
at most 5 comments per 10 minutes from one connection. Comments show at once. Alex moderates at **/admin/**
(not linked, not indexed): Hide / Show again, and reply as Zoomed Art (gold badge). The API is in
`functions/api/` (Cloudflare Pages Functions), the data in Cloudflare D1 (`migrations/`).

Run it locally (site + API + a local database, test keys from `.dev.vars`, admin password `local-admin-token`):

```sh
npm run build
npx wrangler d1 migrations apply zoomedart-comments --local   # once
npx wrangler pages dev dist --port 4321
```

At launch, once (after `npx wrangler login`):

1. `npx wrangler d1 create zoomedart-comments`, put the `database_id` it prints in `wrangler.toml`, then
   `npx wrangler d1 migrations apply zoomedart-comments --remote`.
2. Cloudflare dashboard → Turnstile → add a widget for zoomedart.com. Put its site key in `site/.env.production`
   as `PUBLIC_TURNSTILE_SITE_KEY=...` (public, can be committed).
3. Secrets: `npx wrangler pages secret put TURNSTILE_SECRET`, `... ADMIN_TOKEN` (Alex's /admin/ password),
   `... IP_SALT` (any long random text).
4. `npm run build && npx wrangler pages deploy dist --project-name zoomedart`.

## Design

[DESIGN.md](DESIGN.md) has the design system (colours, type, motion curves) from the original prototype.
Fonts: EB Garamond and DM Sans, self-hosted. The painting is never altered: the camera moves, light and
framing guide the eye.
