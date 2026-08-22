# CX_PRODUCTION_ARCHIVE

A dark-mode, terminal-inspired archive site for cataloging livestream broadcasts, events, and movies — organized as shows with seasons and episodes, browsable in a poster grid and searchable by platform, country, or year.

**Live demo:** open `index.html` in a browser, or serve the folder with GitHub Pages (see below).

## Features

- **Poster grid** of shows/movies that fills the page (no horizontal scroll)
- **Detail modal** per show — click a poster to see its seasons and episodes, first season expanded by default
- **Theater-mode video player** — episode "WATCH" buttons open a centered, embedded YouTube player over a dimmed backdrop instead of leaving the site
- **Live search** with autocomplete suggestions, matching titles, platforms, countries, years, and episode data
- **Clickable filter tags** — platform/country/year/season badges drop straight into the search box
- **Missing-episode indicator** — episodes without a video link show a disabled "MISSING" state instead of a dead button
- **Boot-sequence animation** plays once in the search bar placeholder on load
- Fully responsive, no build step, no dependencies beyond one Google Font

## Project structure

```
cx-archive/
├── index.html          # page structure + all show/season/episode data
├── css/
│   └── styles.css      # theme, layout, components
├── js/
│   └── scripts.js      # search, carousel/grid, detail modal, theater player
├── assets/
│   ├── favicon.ico
│   └── favicon.png
└── README.md
```

There's no build process — it's plain HTML/CSS/JS. Open `index.html` directly, or host the folder as-is.

## Deploying with GitHub Pages

1. Push this folder to a GitHub repo.
2. In the repo settings, go to **Pages**, set the source to the `main` branch (root).
3. Your site will be live at `https://<username>.github.io/<repo>/`.

## Adding a new show

Each show lives in two places inside `index.html`, and both need to match on a `data-show` / `id="detail-<slug>"` slug:

**1. The poster tile**, inside `<ul class="carousel-track" id="carouselTrack">`:

```html
<li class="poster-tile tint-kick" data-show="my-show" tabindex="0" role="button" aria-haspopup="dialog">
    <div class="poster-art">
        <span class="poster-badge">1 SEASON</span>
    </div>
    <div class="poster-title">MY SHOW</div>
</li>
```

`tint-kick` / `tint-youtube` / `tint-mixer` / `tint-twitch` set the poster's accent tint — pick whichever matches the dominant platform.

**2. The hidden detail source**, inside `<div class="show-detail-sources" hidden>`:

```html
<div class="show-detail-source" id="detail-my-show" hidden>
    <span class="tag-badge tag-seasons">1 SEASON</span>
    <h2 class="detail-title">MY SHOW</h2>
    <div class="seasons-list">
        <details class="season-details" open>
            <summary class="season-summary">
                <span class="season-label">SEASON 1</span>
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
                    <button type="button" class="ep-btn watch" data-video="https://www.youtube.com/watch?v=VIDEO_ID">WATCH</button>
                </li>
            </ul>
        </details>
    </div>
</div>
```

- Leave `data-video=""` for an episode you don't have a link for yet — it'll automatically render as a disabled "MISSING" button.
- Add more `<details class="season-details">` blocks for additional seasons; only the first should have the `open` attribute.
- For movies, season labels can be anything (`MOVIE`, `MAKING OF`, etc.) instead of `SEASON N`.

## Credits

Footage archived from clips and VODs uploaded by the community. Uploader credits are listed in the site footer.

## License

No license specified yet — add one (MIT, etc.) before making the repo public if you want to define usage terms.
