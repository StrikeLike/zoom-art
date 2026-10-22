# Zoomed Art

A static Astro prototype for **zoomedart.com**: a quiet editorial home, a scroll-guided view of *Children's Games*, a tiled painting explorer and the supporting artist, collection, About and editorial-policy pages.

The interface is English. Page copy comes from JSON. The paintings come from the existing repository images; none are generated, recoloured or animated internally. The prototype is local and Cloudflare-ready. **It has not been deployed.**

## Run locally

Use **Node.js 22.23.4 or newer** and **npm 9.6.5 or newer**, matching the installed Astro package's engine requirements.

From the repository root:

```sh
cd site
npm install
npm run dev
```

Open the local URL printed by Astro, normally `http://127.0.0.1:4321/`. The generated web images are already present; Python is only needed to regenerate them.

Check and build:

```sh
npm run check
npm run build
npm run verify
npm run preview
```

`npm run check` runs Astro's TypeScript/template checks. `npm run build` generates static HTML and assets in `dist/`. `npm run verify` checks the built pages and writes `BUILD-REPORT.json`. `npm run preview` serves the production output locally. A successful build is not a claim that a physical-phone performance budget has been met.

## Pages

| URL | Content |
| --- | --- |
| `/` | Featured painting, detail pairing and related-work sequence |
| `/works/childrens-games/` | Complete supplied guided story, tiled explorer, article structure and sources |
| `/artists/pieter-bruegel-the-elder/` | Artist template with a clearly marked biography placeholder |
| `/collections/hidden-details/` | Curated thread beginning with Children's Games |
| `/about/` | Brand, approach and follow links |
| `/editorial-policy/` | Fact/interpretation rules, image policy and corrections |
| `/works/netherlandish-proverbs/` | Related-work preview; full story in preparation |
| `/works/peasant-wedding/` | Related-work preview; full story in preparation |
| `/works/fall-of-icarus/` | Related-work preview with an attribution-verification note |

Related-work previews are `noindex,follow` until their articles and source records are ready. The canonical origin is configured in `astro.config.mjs` as `https://zoomedart.com`.

## Project structure

```text
site/
  astro.config.mjs
  package.json
  package-lock.json
  tsconfig.json
  public/
    _headers
    favicon.svg
    robots.txt
    images/
      manifest.json
      childrens-games/
        painting-{480,768,1280,1920}.webp
        detail-{1..8}.webp
        painting.dzi
        painting_files/{level}/{column}_{row}.jpg
      netherlandish-proverbs/
      peasant-wedding/
      fall-of-icarus/
  scripts/
    prepare-images.py
    export-source.mjs
    verify-build.mjs
  src/
    components/
      Credit.astro
      Explorer.astro
      Guided.astro
      Painting.astro
      Related.astro
    data/
      work.json
      site.json
      image-sizes.json
    layouts/
      Base.astro
    pages/
      index.astro
      about.astro
      editorial-policy.astro
      artists/pieter-bruegel-the-elder.astro
      collections/hidden-details.astro
      works/childrens-games.astro
      works/[slug].astro
    scripts/viewers.ts
    styles/
      global.css
      fonts.css
  DESIGN.md
  README.md
  BUILD-REPORT.json
```

`src/data/work.json` preserves the supplied slide headlines, prose, focus coordinates and quick facts. `src/data/site.json` supplies the visible interface and supporting-page text. `src/data/image-sizes.json` is generated from the actual derivative files so image dimensions do not need to be guessed in components.

## Regenerate painting assets

The preparation script reads these existing files outside `site/`:

```text
pipeline/works/childrens-games/image.jpg
pipeline/works/childrens-games/script.json
pipeline/works/netherlandish-proverbs/image.jpg
pipeline/works/peasant-wedding/image.jpg
pipeline/works/fall-of-icarus/image.jpg
```

From the repository root on this Windows checkout, use the existing Python environment:

```powershell
.\.venv\Scripts\python.exe site\scripts\prepare-images.py
```

For another checkout, use a Python environment with Pillow installed:

```sh
python -m pip install Pillow
python site/scripts/prepare-images.py
```

Run these commands from the repository root. Use your preferred virtual environment when installing Pillow. The script resolves image paths relative to its own location, so it does not fetch or guess replacement artwork.

The Children's Games source is **8000 × 5770 px**. The script writes WebP whole-image derivatives at **480, 768, 1280 and 1920 px wide**; eight source-faithful detail crops fitting within **960 × 900 px**; and a **DZI pyramid with 256 px JPEG tiles and 1 px overlap**. Related paintings receive 480, 768 and 1280 px derivatives. The original full-resolution JPEG is not copied into the web output.

The DZI descriptor is `/images/childrens-games/painting.dzi`, and its tiles use `/images/childrens-games/painting_files/{level}/{column}_{row}.jpg`. Both the guided story and free explorer load the viewer dynamically when nearby, then fetch tiles progressively.

After changing the painting or focus data, regenerate assets, review the resulting crops and run the checks/build again. Keep `work.json` and the pipeline's `script.json` synchronized when intentionally editing the story; the current prototype preserves the supplied wording verbatim.

## Cloudflare Pages configuration

For a repository-connected Pages project:

| Setting | Value |
| --- | --- |
| Root directory | `site` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node runtime | A version meeting `>=22.23.4` |

Commit the generated `public/images/` assets when deploying through this configuration; the build itself does not regenerate images from Python. `public/_headers` sets immutable caching for hashed Astro assets, shorter caching for painting derivatives and basic response headers. No account-specific deployment, DNS change or domain verification has been performed.

## Design, motion and access

Read [DESIGN.md](DESIGN.md) for the concept, exact CSS tokens, layouts at 390 and 1440 px, motion table and self-review.

The two self-hosted type families are EB Garamond Variable and DM Sans Variable, including Latin Extended subsets. Native scrolling selects the story's stops. Camera moves follow the requested easing curve; reverse/fast scroll can interrupt a move from its current position. Reduced motion removes spatial camera travel and decorative animation. The free viewer provides keyboard zoom/pan controls, numbered detail links and a whole-painting reset.

The arrival canvas shows the full composition. Story text, map and controls sit outside its focus region. Corner strokes draw once, the glow or small-detail pulse settles, and the mini-map follows the camera. On phones, story text starts directly below the sticky canvas. When the reader selects an exploration detail, the markers disappear so they do not cover the detail; selecting its numbered list link also brings the canvas into view with normal browser scrolling. The text and detail crops are present in the HTML and remain available without JavaScript. Cross-document View Transitions enhance supported browsers without becoming a navigation requirement.

## Sources and unfinished editorial work

The supplied record identifies *Children's Games* as a 1560 oil-on-panel painting by Pieter Bruegel the Elder, at the Kunsthistorisches Museum in Vienna, with a public-domain Wikimedia Commons credit. The prototype repeats those supplied facts; it does not claim a new independent historical verification.

The current link is a [Wikimedia Commons collection reference](https://commons.wikimedia.org/wiki/Category:Children%27s_Games_by_Pieter_Bruegel_the_Elder). The exact original-file URL and museum object-record citation remain to be established. Related paintings also need individual source records; *Landscape with the Fall of Icarus* carries an explicit attribution-verification note.

Missing long-form article copy, the artist biography, interpretations and connections are marked **`[ARTICLE TEXT TO COME]`**. The supplied phrase **“460 years later”** is preserved, but needs an editorial update before publication. No follower counts, testimonials, quotes or unsupported artist history have been invented.

## Validation and limits

`npm run check` completed with **zero errors, warnings or hints**. The production build generated **nine pages**, and `npm run verify` passed static-HTML, internal-path, heading, focus-data and structured-data checks. Browser checks covered **390 px and 1440 px** viewports.

The current [BUILD-REPORT.json](BUILD-REPORT.json) records **3,865 bytes of initial JavaScript gzip** (approximately 3.9 KB, excluding the lazy viewer), **86,836 bytes gzip for OpenSeadragon**, and **1,001 DZI tiles totalling 15,342,586 bytes** across every pyramid level. The complete tile pyramid is not downloaded on arrival. These are measured build sizes, and the initial JavaScript is below the requested 100 KB budget. Run `npm run verify` again after rebuilding changed source.

The remaining performance targets are **LCP < 2.5 s**, **CLS < 0.1** and **INP < 200 ms** on a representative mid-range phone over 4G. They have **not been verified**. Responsive images, generated image dimensions, local fonts, deferred tiles and browser viewport checks support the work toward those targets, but cannot establish those metrics.

A production release still needs measured phone/network results, complete assistive-technology checks, exact source citations and the missing editorial copy. Further paintings have preview pages rather than completed guided stories. There is no newsletter, commerce, account system or deployment in this prototype.

## Complete source export

After the final source edits, run from `site/`:

```sh
node scripts/export-source.mjs
```

This creates `SOURCE-FILES.txt`, containing the complete authored text source and configuration files, including the dependency lockfile, plus a binary-asset inventory. It excludes dependencies, generated build output and screenshots. The real painting/font bytes remain in the project and are not inlined as text.
