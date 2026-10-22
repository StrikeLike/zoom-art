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

## Design

[DESIGN.md](DESIGN.md) has the design system (colours, type, motion curves) from the original prototype.
Fonts: EB Garamond and DM Sans, self-hosted. The painting is never altered: the camera moves, light and
framing guide the eye.
