# Prompt: designul site-ului zoomedart.com

Copiază tot textul de sub linie într-o conversație nouă. Promptul e în engleză, ca site-ul. Rezultatul îl aduci înapoi aici, ca să-l leg de datele din repo.

ChatGPT livrează câte o parte pe răspuns. După fiecare parte, scrii **next**. Dacă se oprește în mijlocul unei părți, scrie: `Continue exactly where you stopped. Do not repeat anything. If a file was cut off, resend that whole file.`

---

You are the lead designer and front-end engineer for **zoomedart.com**. Design a website that makes famous paintings feel alive, and build a working prototype of it. It must be elegant, unmistakably crafted by hand, fast, and genuinely useful to someone who loves art. Read the whole brief before you start; the constraints matter as much as the ambition.

## 1. What Zoomed Art is

- An art-history brand on Instagram, TikTok, Facebook and YouTube: **@zoomed.art**, "Zoomed Art | Art History Explained".
- Every post takes one famous painting and **zooms into it, detail by detail**, telling the real, verified story behind it: hidden details, mysteries, controversies, dark true stories.
- Only **public-domain paintings** (old masters), from Wikimedia Commons and museum open collections, in high resolution (often 4,000 to 8,000 px).
- Every fact is checked against sources. Interpretations are always labelled as interpretations ("many see…", "tradition says…").
- The website is the brand's home: one page per painting, where people can explore the painting far more deeply than a 59-second reel allows. Later it will grow into a community and, much later, an art marketplace, so the design must scale beyond a blog.
- Language: English. Author on every page: "Zoomed Art" (no personal name).

## 2. The core idea: the camera moves, the painting never changes

"Make the art feel alive" means **movement of the viewer, light and story**, never manipulation of the artwork:

- The painting itself is never redrawn, recoloured, cropped into a fake composition, AI-animated, given moving figures, or "enhanced". It is a historical document; what you see is what the artist painted.
- Life comes from: a slow camera gliding across the canvas and into a detail; light that falls on the detail being discussed while the rest of the painting dims; frames that draw themselves around a detail; text that arrives in step with the camera, like a guide speaking; the feeling of standing in front of the real canvas and leaning in.
- The emotional target: the hush of a museum room at night, with a guide holding a lamp up to the canvas.

## 3. The existing visual language (keep it, refine it)

The reels already have an identity. The site should feel like the same brand, made richer for the web:

- **Background:** near-black, warm: `rgb(12, 11, 10)`.
- **Text:** warm white `rgb(245, 240, 230)` for headings, `rgb(232, 226, 214)` for body.
- **Accent:** gold `rgb(214, 178, 110)`, used sparingly: highlight frames, key numbers, the brand mark.
- **Mini-map frame:** light red `rgb(255, 99, 99)`, the box on a small thumbnail of the whole painting that shows where we are zoomed in.
- **Typography in the videos:** bold serif headlines, italic serif for the artist line, small spaced capitals for "ZOOMED ART". For the web, choose an editorial serif and a quiet sans: open licence, self-hosted, at most two families, Latin Extended (names like Géricault, Böcklin).
- **Detail highlight:** gold corner brackets that draw themselves around the detail, a soft glow that "breathes", the rest of the painting dimmed to about 50%. For very small details, a gold circle that pulses outwards once.
- **Motion curves:** reveals use `cubic-bezier(0.16, 1, 0.3, 1)` (fast start, long soft landing); camera moves use `cubic-bezier(0.65, 0, 0.35, 1)` (slow in, slow out). Headlines appear word by word, body text line by line.
- **Hard rule carried over from the reels:** text never covers the detail it talks about. The layout always keeps the focus rectangle fully visible and clear of text and UI.

## 4. What "no AI slop" means here

Do not produce any of the following. If you catch yourself reaching for one, stop and find the specific, crafted alternative.

- Purple/blue gradients, glassmorphism, neon glows, floating blobs, generic 3D shapes, particle backgrounds.
- AI-generated images or textures of any kind. The only images are the real paintings and crops of them.
- Generic hero copy ("Discover the world of art", "Unlock the secrets of masterpieces") or invented content: no fake testimonials, follower counts, statistics or quotes. Use the real data in section 9; where text is missing, leave a clearly marked placeholder.
- Emoji or stock icon sets as decoration. Icons only where they carry meaning, drawn in one consistent line style.
- Cards with drop shadows in a uniform grid as the main idea. Uniform rounded corners everywhere.
- Animation for its own sake: everything that moves must reveal, guide or explain. Nothing loops in the corner of the eye while someone reads.
- Scroll hijacking, custom scrollbars that fight the OS, cursor followers, intro loaders or splash screens.

## 5. Pages to design

| Page | URL | Purpose |
| --- | --- | --- |
| Home | `/` | One painting featured as a living, slowly drifting full-bleed image; a way into the collection by story, not by a grid of thumbnails |
| **Painting page (the heart of the site)** | `/works/childrens-games/` | Guided zoom story + free exploration + the full article |
| Artist page | `/artists/pieter-bruegel-the-elder/` | Short life story, all his paintings on the site, how they connect |
| Collection | `/collections/hidden-details/` | A curated thread through several paintings (mysteries, controversies, hidden details) |
| About + Editorial policy | `/about/`, `/editorial-policy/` | Who we are, how facts are checked, where images come from, how to report an error |

Reserve visual space in the system for later sections (shop, marketplace, accounts), but do not design them now. There is no newsletter yet; the main call to action is "Next painting" and following @zoomed.art.

## 6. The signature experience: the painting page

Design this page first and best. Three movements, in order:

1. **Arrival.** The whole painting, as large as the screen allows, title and artist in serif beneath or beside it, never on top of the paint. The first impression is the artwork itself, with no clutter.
2. **The guided zoom (scroll-driven story).** As the reader scrolls, the camera glides from the full painting into each detail in turn, exactly like the reels but under the reader's control:
   - Each step has a headline, one or two sentences of text, and a **focus rectangle** `[cx, cy, w, h]` given as fractions of the painting (0 to 1, centre x, centre y, width, height).
   - The camera frames the focus rectangle with breathing room; gold corners draw in; the rest dims. On wide screens the text sits in a column beside the image; on phones it sits below the framed detail. In both, the detail stays fully visible.
   - A mini-map (small whole painting with the light-red frame) shows where we are.
   - Scrolling back reverses smoothly. Fast scrolling must never show a blank or a blurry frame for long: load sharper tiles progressively.
   - The text runs as a story: each step picks up from the previous one ("Then…", "Meanwhile…"). Keep that rhythm visible in the typography.
3. **Free exploration + the article.**
   - A deep-zoom viewer (OpenSeadragon or similar, with DZI or IIIF tiles) where the reader can pan and zoom freely. The guided details appear as numbered hotspots; tapping one flies the camera there and shows its text.
   - Below it, the long-form article: a direct answer to "what is the story behind this painting" in the first paragraph; a quick-facts block (artist, year, medium, size, museum, image licence); "Details you probably missed" with one crop per detail; "What does it mean?" with interpretations labelled as such; "Where to see it"; sources; related paintings.

Make it feel like one continuous experience, not three widgets stacked on a page.

## 7. Motion principles

- Every motion answers "where should the eye go now?". If you can't say what it reveals, cut it.
- Durations: micro-interactions 150 to 250 ms; reveals 500 to 900 ms; camera moves 1.2 to 2.5 s, or tied directly to scroll position.
- Page-to-page: use the View Transitions API (Astro supports it) so a painting thumbnail grows into the arriving page's painting, so navigation feels like walking to the next canvas.
- Animate only `transform` and `opacity` (plus `clip-path` and `filter` where cheap). No layout thrashing.
- **`prefers-reduced-motion`:** camera moves become cross-fades between framed views; nothing drifts. The story must work fully without motion.
- Native scrolling only. GSAP with ScrollTrigger, or CSS scroll-driven animations, are both fine; keep total JavaScript small.

## 8. Technical constraints (non-negotiable)

- **Framework:** Astro, static output, deployed on Cloudflare Pages. Components are `.astro` with small vanilla TypeScript islands; no heavy front-end framework unless one specific island truly needs it.
- **Content:** every page is generated from JSON data files (format in section 9). Do not hard-code text in components.
- **SEO:** semantic HTML, exactly one `h1` per page, real heading hierarchy, all article text present in the HTML without JavaScript, descriptive `alt` on every image, room for Schema.org JSON-LD (`Article`, `VisualArtwork`, `BreadcrumbList`).
- **Performance budgets, measured on a mid-range phone over 4G:** LCP under 2.5 s, CLS under 0.1, INP under 200 ms. The first image is a responsive AVIF/WebP of reasonable size; the 8,000 px original is never sent whole; the deep-zoom viewer and tiles load only when the reader gets near them. JavaScript for the first view of a painting page: aim for under 100 KB compressed, the viewer excluded.
- **Mobile first.** Most visitors arrive from TikTok and Instagram on a phone. The guided zoom must be at its best on a 390 px wide screen, held in one hand.
- **Accessibility:** WCAG 2.2 AA contrast, full keyboard use (hotspots included), visible focus states, captions for any video, and screen-reader text for every step of the guided zoom.
- **Image credits:** each painting shows its licence and source (for example "Public domain, via Wikimedia Commons / Kunsthistorisches Museum, Vienna") in a discreet but readable place.

## 9. Real data to design with

This is one real painting's data file. Design with it, not with lorem ipsum. Do not add facts that are not here; if the article needs more text, mark it `[ARTICLE TEXT TO COME]`.

```json
{
  "title": "Children's Games",
  "artist": "Pieter Bruegel the Elder",
  "year": "1560",
  "facts": {
    "medium": "Oil on panel",
    "size_cm": "118 x 161",
    "museum": "Kunsthistorisches Museum",
    "city": "Vienna",
    "licence": "Public domain, via Wikimedia Commons"
  },
  "slides": [
    {"type": "cover", "headline": "Around 80 games are hidden in this painting. How many did you play?", "sub": "Pieter Bruegel the Elder, Children's Games, 1560"},
    {"focus": [0.5, 0.5, 0.96, 0.94], "headline": "Flanders, 1560", "text": "Bruegel hands an entire town over to its children. Streets, windows, even the river: all full of games."},
    {"focus": [0.115, 0.89, 0.19, 0.14], "headline": "Start bottom left", "text": "Two girls play knucklebones with little bones. Today we call it jacks."},
    {"focus": [0.605, 0.865, 0.21, 0.16], "headline": "Then, hoops", "text": "Right behind them, kids race wooden hoops across the square, pushing them with sticks."},
    {"focus": [0.625, 0.59, 0.1, 0.13], "headline": "Next, leapfrog", "text": "One boy vaults over another's back. 460 years later, every schoolyard still plays it."},
    {"focus": [0.285, 0.505, 0.08, 0.12], "headline": "Meanwhile, by the fence", "text": "A boy stands on his head, legs in the air. Some things never change."},
    {"focus": [0.655, 0.41, 0.11, 0.27], "headline": "Further up, stilts", "text": "Short stilts, tall stilts, and kids proudly towering over everyone."},
    {"focus": [0.485, 0.49, 0.15, 0.16], "headline": "And in the middle of it all", "text": "A pretend wedding procession. The children are playing at being grown-ups."},
    {"focus": [0.21, 0.25, 0.2, 0.12], "headline": "Even far away", "text": "The river in the distance is full of kids swimming. Which of these games did you play most?"}
  ]
}
```

The painting image: Pieter Bruegel the Elder, *Children's Games* (1560), Kunsthistorisches Museum, Vienna, available in high resolution on Wikimedia Commons. Other paintings already on the site to show in "related" and on the artist page: *Netherlandish Proverbs*, *The Peasant Wedding*, *Landscape with the Fall of Icarus*.

## 10. What to deliver

This is too much for one reply, so work in stages. **Deliver exactly one part per reply, then stop and wait until I write "next".** If a reply would run long, split that part across several replies and end each with "(continues)". Never cut a file or a table in the middle; if you must stop, stop between files. For part 5, send at most three files per reply.

Work in this order:

1. **Concept** (one short paragraph): the idea behind the experience and why it fits this brand. Then one sentence on what you deliberately left out.
2. **Design system:** colour, type and spacing tokens as CSS custom properties; type scale; the detail-highlight component (gold corners, dimming, pulse); the mini-map; buttons and links; the credit line.
3. **Layouts** for every page in section 5, phone (390 px) and desktop (1440 px), with the reasoning for each key choice.
4. **Motion spec:** a table of every animation, with its trigger, what it reveals, duration, easing and reduced-motion fallback.
5. **Working prototype:** an Astro project with the painting page and the home page built on the data above. Include the file tree, every file in full, and how to run it (`npm install`, `npm run dev`). Use a placeholder path such as `/images/childrens-games/` for images and say exactly which image sizes and tile format the build needs.
6. **Self-review:** check your own result against section 4 (no AI slop) and the budgets in section 8. List every place where you fall short and what you would do about it.

If something in this brief is ambiguous or conflicts with something else, say so and state the choice you made. Don't silently guess.
