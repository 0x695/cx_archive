CX_PRODUCTION_ARCHIVE — Technical Reference

Vanilla HTML/CSS/JS media-archive UI: poster grid → detail modal (seasons/episodes) → theater-mode video player. No framework, no build step, no bundler, no dependencies except one Google Font. Everything ships as static files, so it drops into any host or gets absorbed into a larger codebase with minimal friction.

This doc is for people extending or embedding it, not just running it as-is.

Design constraints (read before modifying)
No JS framework, no build step. Three files (index.html, css/styles.css, js/scripts.js) plus static assets. This is intentional — it keeps the project trivially embeddable (drop the files in, or inline them into an existing page) and debuggable without tooling. If you port this into a framework (React/Vue/etc.), the architecture below translates directly to components + state; see Porting to a framework.
Data lives in the DOM, not in a JS object. There is no shows.json or const SHOWS = [...]. Every show is hand-authored HTML in two places (see below). This is the single biggest thing you'll want to change if you're scaling past a few dozen shows — see Replacing the data layer.
One file per concern. index.html is structure + content, css/styles.css is presentation, js/scripts.js is behavior. Nothing is inlined. If you re-inline for a single-file build, keep the same selector/ID contract described below or the JS will silently no-op (it fails soft everywhere — see Failure modes).
Data model

There is no data layer. Each show/movie is represented twice in index.html, and the two representations are linked by a slug:

Poster tile — lives in <ul class="carousel-track" id="carouselTrack">, one <li class="poster-tile" data-show="{slug}"> per show. This is what's visible in the grid.
Detail source — lives in <div class="show-detail-sources" hidden>, one <div class="show-detail-source" id="detail-{slug}"> per show. This holds the full season/episode markup and is never directly visible; its innerHTML gets cloned into the detail modal on click.
poster tile: data-show="cx-factor"
                    ↓ matches
detail source: id="detail-cx-factor"

js/scripts.js never renders anything from scratch — openDetail(slug) (line ~111) does detailBody.innerHTML = document.getElementById("detail-" + slug).innerHTML. This is why editing content is a matter of editing static HTML, and also why there's no templating step to break.

Season/episode shape
html
<details class="season-details" open>              <!-- only the first season has `open` -->
  <summary class="season-summary">
    <span class="season-label">SEASON 1</span>      <!-- free text: "SEASON 1", "MOVIE", "MAKING OF", etc. -->
    <span class="season-tags">
      <button type="button" class="mini-tag filter-tag" data-filter="KICK">KICK</button>
      <button type="button" class="mini-tag filter-tag" data-filter="USA">USA</button>
      <button type="button" class="mini-tag filter-tag" data-filter="2026">2026</button>
    </span>
    <span class="season-chevron">▾</span>
  </summary>
  <ul class="episode-list">
    <li class="episode-row">
      <span class="episode-name">EPISODE 1</span>
      <button type="button" class="ep-btn watch" data-video="https://www.youtube.com/watch?v=ID">WATCH</button>
    </li>
  </ul>
</details>

Native <details>/<summary> drives season expand/collapse — there's zero JS for that interaction, which also means it degrades gracefully with JS disabled (the modal itself won't open without JS, but if you server-render the detail block directly, seasons still expand).

data-video="" (empty string) is the explicit "no link yet" sentinel. On load, scripts.js walks every .ep-btn.watch inside .show-detail-sources, and if data-video is falsy, sets disabled = true and swaps the label to MISSING (lines 51–60). This runs once, on the source nodes, before any cloning — so every clone inherits the disabled state for free (the disabled attribute reflects into innerHTML). If you add episodes programmatically after load, call this pass yourself or replicate the check.

JS architecture

Everything lives in a single DOMContentLoaded listener — no modules, no build. Roughly five independent subsystems, in file order:

Subsystem	Lines	Responsibility
Boot animation	5–49	Types placeholder text into #searchInput on load. Purely cosmetic, self-contained, respects prefers-reduced-motion.
Missing-episode pass	51–60	One-time DOM walk over hidden source data (see above).
Theater player	62–104	YouTube URL → embed URL conversion + modal open/close.
Detail modal	106–153	Poster click → clone detail source into #detailBody.
Event delegation	155–179	Single document-level click listener for .ep-btn.watch and .filter-tag — required because content in #detailBody is injected after page load, so it never gets a direct listener.
Search	181–242	Filters .poster-tile visibility + autocomplete dropdown.
Why event delegation matters here

#detailBody is repopulated via innerHTML = on every poster click (openDetail, line 111) and cleared on close (closeDetail, line 119). Any listener attached directly to a button inside that markup is destroyed the moment the modal closes. Two options existed: rebind listeners after every innerHTML write, or delegate once at document level and use .closest() to match. This codebase does the latter (lines 158–179) — if you add new interactive elements inside .show-detail-source blocks, extend the delegated handler rather than adding a direct querySelectorAll().forEach(addEventListener) pass, or your new elements will only work the first time.

Search implementation

filterTiles(query) (line 189) does substring matching against tile.textContent + " " + source.textContent — i.e. it searches the poster's visible text plus the entire hidden detail block (all season tags, all episode names). This means search finds things that aren't visible anywhere on the poster itself (e.g. searching "2018" surfaces a show whose grid tile shows no year, because one of its seasons is tagged 2018). It's O(n) over all tiles on every keystroke with no debounce — fine at the current scale (a few dozen shows), but if you're porting this to hundreds of entries, add a debounce and/or precompute a search index instead of re-reading textContent per keystroke.

The autocomplete list (allTags, line 184) is just every unique data-filter value harvested from .filter-tag elements across the whole document, including hidden ones inside .show-detail-sources. Add a new platform/tag anywhere and it's automatically searchable/suggestable — there's no registry to update.

Theater player / video provider

youtubeEmbedUrl() (line 67) is the only place YouTube-specific logic lives. It extracts a video ID from either youtube.com/watch?v= or youtu.be/ URLs and builds an /embed/{id}?autoplay=1 URL. To support another provider (Vimeo, self-hosted, Twitch VOD, etc.), this is the one function to replace — it takes a URL string and returns an embeddable iframe src, or null if it can't parse it. openTheater() treats a null return as "do nothing," so a mixed-provider setup is possible by branching on URL host inside this function.

The player is a single shared <iframe> (#theaterIframe) whose src is set/cleared on open/close — there's no pooling or multiple simultaneous players, and closing sets src = "" specifically to stop playback (removing the element from the DOM isn't necessary for YouTube iframes, but clearing src is the reliable way to kill audio).

CSS architecture

All theming is CSS custom properties on :root (css/styles.css lines 5–25):

css
:root {
  --bg: #030204;              /* page background (also hardcoded to #0f0e0c on body — see note below) */
  --surface / --surface-alt   /* card/panel backgrounds, two tones for depth */
  --border                    /* all hairline borders */
  --accent / --accent-dim / --accent-glow   /* monochrome UI accent — chevrons, hover states, focus rings */
  --purple / --purple-soft / --purple-dim / --purple-glow / --purple-dark
                               /* legacy accent set from an earlier theme pass; largely unused now,
                                  kept for reference — grep before deleting, a few rules still reference --purple-dim */
  --text / --text-dim         /* body text, two weights */
  --green / --red / --cyan    /* functional platform-tag colors: Kick / YouTube / Mixer respectively.
                                  Twitch intentionally uses the neutral --accent set, not a brand color. */
  --font-display / --font-mono /* both currently JetBrains Mono — kept as two variables in case you want
                                   to split display vs. body typefaces again */
}

Known inconsistency: body background and .term-header/footer backgrounds are hardcoded hex (
#0f0e0c, 
#0d0c0e) rather than referencing --bg, left over from an iterative design pass. If you're re-theming, search for these two hex literals directly rather than assuming --bg controls the whole page.

Component classes worth knowing
.tag-badge — base pill style; .tag-kick / .tag-youtube / .tag-mixer / .tag-twitch / .tag-country / .tag-year / .tag-seasons layer color on top. All are <button> elements when interactive (.filter-tag) and get a UA-style reset (appearance: none, etc.) baked into the base rule — don't re-add browser button chrome resets downstream.
.mini-tag — same idea, smaller, used for season-level tags. Also a <button class="mini-tag filter-tag">.
.poster-tile / .poster-art / .poster-badge — grid tile. .tint-{platform} on .poster-tile currently only changes a radial-gradient overlay opacity (the "monochrome gradient" pass flattened all tints to the same --accent color — the class names are still platform-specific for whenever per-platform color is reintroduced).
.season-details[open] .season-chevron / .show-details[open] .show-chevron — attribute-selector-driven rotation, no JS.
Extension points
Replacing the data layer

The DOM-as-database approach doesn't scale past hand-editing. If you're integrating this into something with real content management, the clean seam is: keep the two-block shape (poster tile + detail source) but generate both from a real data source (JSON, CMS, API) at build or request time, targeting the exact HTML structure documented above. js/scripts.js doesn't care where the HTML came from — it only cares that data-show on a tile matches id="detail-{slug}" on a source block, and that the internal class names (season-details, episode-row, ep-btn watch, data-video, filter-tag/data-filter) are present. A static-site generator (11ty, Astro, etc.) templating this exact shape from a shows.json would need zero JS changes.

Porting to a framework

The five JS subsystems map cleanly to:

Boot animation → a useEffect/onMounted one-shot, or drop it entirely
Missing-episode pass → a data-transform step when loading show data, not a DOM pass
Theater player → a <TheaterModal videoUrl={...} /> component with the same URL-parsing logic
Detail modal → a <ShowDetailModal show={...} /> component; the "clone innerHTML" trick becomes normal conditional rendering
Search → same filtering logic, but operating on the underlying data array instead of textContent, which also fixes the perf concern above

The event-delegation workaround (lines 155–179) is a symptom of not having a component model — in React/Vue/etc. you'd bind handlers normally per-render and this whole block disappears.

Theming

Safe to override: everything under :root. For a full re-theme, also grep for the two hardcoded background hex values mentioned above, and the two --purple-* variables still referenced in .action-btn/.ep-btn hover states if you're removing the legacy purple set entirely.

Failure modes by design

Every DOM lookup in scripts.js is null-guarded (if (!theaterOverlay || ...) return;) rather than asserted. Missing an element (e.g. you strip out the theater modal markup but keep WATCH buttons) fails silently — the button becomes inert instead of throwing. This is deliberate so partial integrations (e.g. embedding just the poster grid without the video player) don't hard-crash, but it also means broken markup can fail silently during development. If you're debugging "nothing happens on click," check for a missing/renamed ID before assuming a JS bug.

Browser support

Relies on: <details>/<summary> (all modern browsers), CSS aspect-ratio (poster tiles), backdrop-filter (modal blur — degrades to a plain dim overlay without it, no fallback needed), and URL/URLSearchParams (video ID parsing). No polyfills included. Not tested against IE-anything; not a target.

License

Not yet specified — add one before treating this as reusable in a public repo.
