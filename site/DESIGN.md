# Zoomed Art — design and prototype notes

This is a local, static Astro prototype prepared for Cloudflare Pages. It has not been deployed. The supplied painting facts and all nine slide objects are preserved in `src/data/work.json`; navigation, interface labels and supporting-page copy live in `src/data/site.json`.

## 1. Concept

The site is a quiet room built around one canvas. An oversized editorial invitation gives way to the real painting; the reader then moves from the whole scene into individual details, with gold framing and a small map maintaining their bearings. The camera supplies the movement, the prose supplies the story, and the image itself remains a historical document. The full article and free exploration continue the same act of looking, at the reader's own pace.

Deliberately left out: invented social proof, decorative animation, newsletter capture, accounts, commerce and AI-generated imagery.

## 2. Design system

### Colour and typography

| Role | Value | Use |
| --- | --- | --- |
| Canvas | `#0c0b0a` / `rgb(12, 11, 10)` | Warm near-black page ground |
| Heading | `#f5f0e6` / `rgb(245, 240, 230)` | Titles and primary navigation |
| Body | `#e8e2d6` / `rgb(232, 226, 214)` | Reading text |
| Accent | `#d6b26e` / `rgb(214, 178, 110)` | Focus corners, small indices, meaningful emphasis |
| Map frame | `#ff6363` / `rgb(255, 99, 99)` | The current viewport in the miniature whole painting |
| Editorial type | EB Garamond Variable | Titles, italic artist lines, editorial statements |
| Interface type | DM Sans Variable | Body copy, captions, controls, spaced capitals |

Both type families are supplied locally through Fontsource, including Latin Extended subsets. The serif's italic is a real supplied font face. There are no external font service requests.

Calculated sRGB contrast on the solid `#0c0b0a` ground is 17.31:1 for heading white, 15.25:1 for body text, 9.79:1 for gold and 6.76:1 for the map red. These calculations apply to those solid colour pairs, not to text or frames placed over arbitrary painting pixels, and do not replace a full accessibility audit.

The following custom properties are copied from `src/styles/global.css`:

```css
:root {
  color-scheme: dark;
  --bg: #0c0b0a;
  --surface: #151310;
  --heading: #f5f0e6;
  --text: #e8e2d6;
  --muted: #b5ad9f;
  --gold: #d6b26e;
  --map: #ff6363;
  --line: #39342c;
  --serif: 'EB Garamond Variable', Georgia, serif;
  --sans: 'DM Sans Variable', Arial, sans-serif;
  --text-xs: .6875rem;
  --text-sm: .8125rem;
  --text-base: 1rem;
  --text-lg: 1.1875rem;
  --text-xl: clamp(1.6rem, 2.4vw, 2.25rem);
  --text-h2: clamp(2.5rem, 4.3vw, 4.5rem);
  --text-h1: clamp(3.5rem, 7.2vw, 7.5rem);
  --text-display: clamp(5.5rem, 10.2vw, 10.5rem);
  --space-1: .25rem;
  --space-2: .5rem;
  --space-3: .75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-24: 6rem;
  --space-32: 8rem;
  --gutter: clamp(1.25rem, 4.5vw, 5rem);
  --ease-reveal: cubic-bezier(.16, 1, .3, 1);
  --ease-camera: cubic-bezier(.65, 0, .35, 1);
  --duration-fast: 180ms;
  --duration-reveal: 700ms;
  --duration-camera: 1600ms;
}
@media (max-width: 760px) {
  :root {
    --space-32: 5rem;
    --gutter: 1.25rem;
    --text-display: clamp(5rem, 15vw, 7rem);
  }
}
```

At the default 16 px root size, the supporting type scale is 11, 13, 16 and 19 px, followed by fluid 25.6–36 px section subheads, 40–72 px section titles, 56–120 px page titles and 88–168 px display type. The mobile display override is 80–112 px. Component-specific refinements are visible in the CSS; they do not introduce another font family.

### Detail highlighting

The artwork stays in its own region. A focus rectangle is expressed in normalized painting coordinates as `[cx, cy, width, height]`. The camera frames that rectangle with space around it; the visible focus corners remain attached to the same image coordinates. A dark mask outside the rectangle suppresses surrounding visual noise to approximately 50%. The accent is warm gold, with restrained emphasis rather than a neon effect.

The four corners draw their eight line segments over 700 ms, using `scaleX` and `scaleY` with the reveal curve. A simultaneous opacity entry brings in the surrounding 50% black mask, which remains clipped to the image region. A soft gold glow appears once over 1.4 s and then settles; genuinely small focus rectangles use a single 900 ms outward circle pulse instead. Nothing repeats indefinitely. Text, controls and the mini-map belong outside the focused image region.

### Mini-map

A miniature of the complete, unchanged painting carries a thin light-red rectangle showing the current camera viewport, including breathing room. It updates on OpenSeadragon viewport changes and clips the displayed rectangle to the painting's edges. The viewer retains the relationship between a tiny detail and the full canvas. A screen-reader label explains the mini-map's role; the painting and its story remain understandable without relying on the colour of the frame.

### Controls and credits

Navigation and editorial calls to action are underlined text links or spare outlined controls. Small line arrows indicate movement into a story or an external source; decorative icon collections are not used. Keyboard focus must be visible and distinct from hover. The credit sits outside the paint in readable secondary text, with the licence, museum and collection-reference link kept together.

## 3. Layouts at 390 px and 1440 px

These are responsive implementation layouts, not separate artboards. Browser checks covered 390 px and 1440 px viewports. Native page scrolling is preserved throughout; the mobile story text begins directly below the sticky canvas rather than being vertically centred in a tall empty section.

| URL | Phone: 390 px | Desktop: 1440 px | Why this structure |
| --- | --- | --- | --- |
| `/` | Compact wordmark/navigation; large “Look closer.” heading; artwork across the page; title, artist and hook below; asymmetric detail pairing; related paintings stacked into a readable sequence. | Oversized editorial title paired with a short introduction; full-width artwork; caption divided between artwork identity and the supplied hook; offset detail diptych; related shelf. | The painting earns the largest visual area. Story-led details provide the entrance into the collection without a uniform card grid or text over the artwork. |
| `/works/childrens-games/` | The full painting arrives before the title. During the guided section, a sticky image region remains above the current text. The free viewer, article, quick facts and detail figures follow in one column. | Full painting and restrained metadata open the page. During the guide, a large sticky image sits beside a narrower text column. The article narrows to a comfortable line length with facts and figures arranged around the reading flow. | The same image-to-text relationship survives the change in width. The focus region stays clear of the copy, while the whole painting remains available at arrival and in the map. |
| `/artists/pieter-bruegel-the-elder/` | Artist name, a plainly marked biography placeholder, the featured painting and a vertical sequence of related works. | Artist heading with room for the biography, then paintings arranged as an editorial sequence. A separate connections section remains visibly unfinished. | No biography or connection is invented to fill space. The template can accept verified writing without redesigning the page. |
| `/collections/hidden-details/` | Collection title and a short curatorial invitation lead into Children's Games, followed by the next stories in preparation. | An editorial introduction leads into a large featured painting and an alternating sequence of subsequent works. | A collection is a thread through stories, not an interchangeable thumbnail catalogue. The prototype has one complete guided story and labels the remaining stories honestly. |
| `/about/` | A direct introduction, three short sections, then links to follow the brand. | A large heading balanced by a restrained reading column. The same three editorial principles are separated by space and rules. | Explains the purpose, method and unchanged-artwork principle without invented institutional history or audience statistics. |
| `/editorial-policy/` | A readable single column of explicit editorial rules, outstanding verification notes and a practical correction route. | A narrower reading measure within the wider page, keeping policy text accessible rather than visually theatrical. | Readers can distinguish facts from interpretation and see what still needs verification before publication. |

Related-work URLs have intentionally unfinished preview pages. They offer navigation back into the completed Children's Games experience, and do not invent full articles.

### The painting page, in order

1. **Arrival:** display the complete composition at its actual image ratio; identify the title, artist, year and image credit outside it. The first image uses responsive WebP derivatives, never the original 8000 px JPEG.
2. **Guided story:** the supplied cover hook introduces eight focus steps. Scrolling determines the current detail. The headline and prose remain ordinary HTML so the story still exists without JavaScript. The reader can reverse direction with native scroll.
3. **Explore and read:** load the deep-zoom code and DZI tiles only near the viewer or when the reader explicitly asks to open it. Numbered detail controls connect exploration to the supplied story. Below, the direct introductory answer, quick facts, all detail prose, interpretation placeholder, museum location, sources and related paintings form the article.

## 4. Motion specification

The table distinguishes the implemented behaviour from the brief's remaining motion requirements. Durations below were read from the source; they are not measured frame-rate claims.

| Motion | Trigger | What it reveals | Duration | Easing | Reduced-motion fallback |
| --- | --- | --- | --- | --- | --- |
| Link/control response | Hover, focus, activation | Which action is available | 180 ms for arrow movement or button background | CSS default `ease` | Immediate response; focus remains visible |
| Home camera drift | Home painting renders | A small change of camera framing | 18 s, one pass from scale 1.025 to 1 | `cubic-bezier(0.65, 0, 0.35, 1)` | Static painting |
| Related-image emphasis | A related painting link is hovered | Which canvas will open | 700 ms, scale 1 to 1.025 | `cubic-bezier(0.16, 1, 0.3, 1)` | No image scaling |
| Guided headline | A scroll step becomes active | The story's next thought, word by word | 500 ms per word, 40 ms stagger | Reveal curve | Text visible immediately |
| Guided paragraph | A scroll step becomes active | The explanation, one rendered line at a time | 500 ms per line, 90 ms stagger | Reveal curve | Text visible immediately |
| Guided camera | A new scroll step becomes active | The supplied focus rectangle with breathing room | 1.6 s; an interrupted move restarts from the current view | `cubic-bezier(0.65, 0, 0.35, 1)` calculated in the small TypeScript camera helper | Fit bounds immediately, with a 200 ms opacity fade on the canvas |
| Surrounding dim | Focus selection changes | Which area the current prose discusses | Stable 50% mask attached to the focus overlay | Follows the camera/overlay rather than a separate opacity animation | Immediate stable mask |
| Gold corner drawing | Detail selection begins | The boundaries of the detail | 700 ms; eight line segments scale into place | Reveal curve | Completed corners visible immediately |
| Soft focus glow | A detail arrives | The focus boundary, once | 1.4 s, one pass | Reveal curve | No glow animation |
| Small-detail circle | A small focus rectangle is selected | The exact location of a small detail | 900 ms, one outward pulse | Reveal curve | Static focus corners; no pulse |
| Mini-map viewport | Camera viewport changes | The current view's location in the full painting | Follows each viewport update | Same camera progression | Immediate viewport update |
| Hotspot camera | Reader activates a numbered detail | The chosen story detail | 1.6 s | Same cubic Bézier camera helper | Fit bounds immediately; no pan animation |
| Page transition | Native same-origin navigation in a supporting browser | Continuity from the featured painting to its page | 700 ms for the named painting group | Camera curve | Cross-document transition disabled |

The paragraph's rendered lines are measured after fonts load and when its layout changes, then the words on each line receive the same reveal delay. Those geometry reads are grouped in the measurement pass, not repeated on every scroll frame. Native smooth anchor scrolling is enabled for ordinary users and disabled for reduced motion; there is no custom scroll engine.

Cross-document View Transitions are a progressive enhancement. Browsers without support still navigate normally. There is no scroll hijacking, artificial scrolling, cursor follower or introductory loading screen.

## 5. Content and image contract

`work.json` preserves the supplied title, artist, year, facts and slides. Additions supply only interface structure, a short introductory answer derived from those facts, image metadata, references and clearly marked missing content. `site.json` owns the visible navigation, section labels, button text and supporting-page copy.

The current image input is the repository's `pipeline/works/childrens-games/image.jpg`, measuring **8000 × 5770 px**. The preparation script creates:

- Whole-painting WebP images at widths **480, 768, 1280 and 1920 px**, preserving the actual source aspect ratio.
- Eight detail WebPs from the supplied normalized rectangles, without repainting or creating a new composite. Each crop fits within **960 × 900 px** and is never upscaled.
- A **DZI** image pyramid at `/images/childrens-games/painting.dzi`, backed by JPEG tiles in `painting_files/{level}/{column}_{row}.jpg`, with **256 px tiles and 1 px overlap**.
- Related-work WebPs at **480, 768 and 1280 px** from their existing repository originals.
- A generated `public/images/manifest.json` recording source dimensions and derivative byte sizes.
- A generated `src/data/image-sizes.json` supplying exact derivative dimensions to reserve image space in HTML.

The image paths are real local assets in this prototype. Regenerating them requires Python and Pillow in addition to the Node dependencies. The original large painting JPEG is not copied into the public directory. WebP satisfies the brief's “AVIF/WebP” initial-image requirement; AVIF is an optional subsequent optimization, not an additional dependency here.

Run the Astro project from `site/`:

```sh
npm install
npm run dev
```

Build static output with `npm run build`. Configure Cloudflare Pages with `site` as the project root, `npm run build` as the build command and `dist` as the output directory. No deployment has been performed.

For a complete text delivery of the project source, run `node scripts/export-source.mjs` after the final edits. The generated `SOURCE-FILES.txt` includes source/configuration files in full, including the lockfile, and an inventory of binary assets. Binary image and font bytes are not represented as prose.

## 6. Ambiguities and editorial choices

- **A living image versus an intact historical document:** camera framing may temporarily show a crop, but it never changes the painting's pixels or assembles a false composition. The full image appears at arrival and remains available in exploration.
- **The original script's “460 years later”:** this wording is preserved verbatim because the brief expressly requires using the provided data. It is a relative-date claim that needs editorial revision before publication; the policy page records that limitation.
- **Source provenance:** the brief supplies a Wikimedia Commons credit and the museum name. The repository image's exact Commons file URL has not been established. The link points to a collection category and explicitly calls itself a collection reference; it does not falsely assert an exact image provenance. The museum's exact object-record citation is also pending.
- **Landscape with the Fall of Icarus:** it is retained because it is one of the requested related titles. Its attribution/source record must be checked before publication. The placeholder record includes an explicit attribution note.
- **Missing prose:** the biography, long-form expansion, interpretations and painting connections use `[ARTICLE TEXT TO COME]`. The first article paragraph only restates the provided painting facts and slide subjects.
- **About-page claims:** the editorial policy describes the brand's intended standards. It also exposes the prototype's remaining source checks, rather than claiming that incomplete citations have already been resolved.
- **Later sections:** the page shell, content model and navigation can extend to additional sections. No empty shop, marketplace or account flow is presented as a functioning feature.
- **No newsletter:** following the brand and entering the next painting are the available continuation paths.

## 7. Self-review and release gaps

### Visual and content constraints

The design uses the requested warm dark palette, genuine painting assets, an editorial serif and a quiet sans serif. Its principal layout is a large canvas and a narrative sequence, with an asymmetric crop pairing and an understated related-work shelf. It does not use blue/purple gradients, glassmorphism, particles, generic 3D shapes, fake quotes, follower counts or testimonials. No AI image generation is involved. No artist biography or historical interpretation has been invented to make the page appear finished.

### Implementation fidelity

The guided stage and free viewer both use the DZI pyramid. OpenSeadragon is imported when a section approaches within 350 px of the viewport; guide tiles and free-viewer tiles are not required for the arrival image. Both viewers keep lower-resolution tiles visible while sharper detail loads. The story's HTML and crops remain the fallback if the library or tile source fails. The guide uses discrete scroll-selected stops with smooth camera travel, not a continuously scrubbed timeline.

Camera travel uses the requested cubic Bézier curve, interrupted moves begin at the current view, headline words and paragraph lines reveal in order, and the mini-map follows the actual camera. Corner brackets draw their individual segments; small-detail emphasis and the one-shot glow stop after their introductory cue. The guide selects discrete stops through native scroll; it does not implement a continuously scrubbed timeline.

The guide's JavaScript layout is reserved from the head of the document, with a static poster visible until the tiled viewer opens. The illustrated HTML fallback is restored if the viewer fails. Generated image dimensions replace guessed aspect ratios. Story text remains at full opacity between steps, rather than dimming readable copy. Selected exploration details hide the overlaid markers; the numbered controls outside the artwork remain available, and the whole-painting control restores the markers. Selecting a detail from that list uses ordinary browser scrolling to bring the canvas into view. Viewers survive back/forward-cache navigation instead of being destroyed while their page is retained.

Only the featured Children's Games image has a shared transition name. General shared-image transitions for later paintings require corresponding completed destinations. The cross-document transition itself remains a browser enhancement, never a navigation dependency.

### Validation performed

`npm run check` completed with zero errors, warnings or hints. The static build produced nine pages. `npm run verify` passed checks for rendered HTML, internal paths, headings, focus data and structured data. Browser checks covered 390 px and 1440 px viewports. These are prototype checks, not a full assistive-technology certification or a physical-phone performance test.

The current [BUILD-REPORT.json](BUILD-REPORT.json) records the following build-byte measurements:

| Measurement | Recorded size |
| --- | --- |
| Initial JavaScript, gzip, excluding lazy viewer | 3,865 bytes, approximately 3.9 KB |
| Deferred OpenSeadragon bundle, gzip | 86,836 bytes, approximately 86.8 KB |
| Full DZI tile pyramid | 1,001 tiles; 15,342,586 bytes total |

The tile total describes all levels combined, not an initial page request. Only the needed tiles load as the reader approaches and explores the viewer. The compressed initial JavaScript measurement is below the requested 100 KB budget; it does not establish LCP, CLS or INP. Regenerate the report with `npm run verify` after changing a build.

### Checks required before a production release

| Area | What the prototype provides | What remains to establish |
| --- | --- | --- |
| LCP < 2.5 s | Responsive WebP, explicit dimensions and high priority for the first painting image | Measure on a representative mid-range phone under a defined 4G profile. Desktop screenshots or a successful build cannot prove this budget. |
| CLS < 0.1 | Image dimensions and reserved painting/viewer regions | Measure a complete page session, including font loading, guided-story activation and viewer loading. |
| INP < 200 ms | Small vanilla interaction code; no heavyweight application framework | Measure actual zoom, navigation and hotspot interactions on the target phone. |
| Initial JavaScript < 100 KB compressed, viewer excluded | Build measurement: approximately 3.9 KB gzip, excluding the lazy OpenSeadragon bundle | Confirm deployed transfer behaviour and recheck after future changes. The source measurement is recorded in BUILD-REPORT.json. |
| Guided zoom sharpness | DZI loading in both the guide and free viewer; small WebP fallback images | Confirm fast scroll never leaves a long-lived blurry region on the target network. The presence of progressive tiles is not a measured latency guarantee. |
| All article text without JavaScript | Supplied story and placeholders are rendered in HTML | Verify with JavaScript disabled and complete the missing commissioned copy. |
| Keyboard and screen readers | Semantic links, headings, image descriptions and named controls are part of the component design | Complete keyboard traversal, hotspot operation, focus-order and screen-reader checks in the built pages. |
| WCAG 2.2 AA | High-contrast base palette and visible focus treatment | Audit every secondary colour, control target and state. Palette choice alone is not a complete accessibility certification. |
| Reduced motion | CSS/media-query and viewer-control fallbacks are specified | Verify that guided camera movement, drift and navigation transitions all respect the preference in the implementation. |
| Sources and artwork attribution | Honest image credit, collection-reference link and verification notes | Resolve exact source-file URL, museum object citation and related-work attribution before publishing. |
| Full editorial experience | One complete supplied guided story; related previews and all required templates | Commission and verify the long-form article, artist life story, interpretations and the remaining guided stories. |
| Hosting | Static Astro output and Cloudflare-ready project structure | Deploy only when requested, then verify production asset paths, caching and security headers. |

LCP, CLS and INP on a mid-range phone over 4G remain unverified. The measured build sizes and browser viewport checks above must not be read as a pass for those three performance targets.
