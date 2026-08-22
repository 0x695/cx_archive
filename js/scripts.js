document.addEventListener("DOMContentLoaded", () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const searchInput = document.getElementById("searchInput");

    /* ---------------- Boot animation (plays in the search box) ---------------- */
    const bootLines = [
        "INITIALIZING CX_ARCHIVE...",
        "MOUNTING STREAM LOGS...",
        "ACCESS GRANTED."
    ];
    const restingPlaceholder = "search archive...";

    if (searchInput) {
        if (reduceMotion) {
            searchInput.placeholder = restingPlaceholder;
        } else {
            let lineIndex = 0;
            let charIndex = 0;

            const typeNext = () => {
                if (searchInput.value !== "") return; // stop if the user started typing
                if (lineIndex >= bootLines.length) {
                    searchInput.placeholder = restingPlaceholder;
                    return;
                }
                const currentLine = bootLines[lineIndex];

                if (charIndex <= currentLine.length) {
                    searchInput.placeholder = currentLine.slice(0, charIndex);
                    charIndex++;
                    setTimeout(typeNext, 28);
                } else {
                    lineIndex++;
                    charIndex = 0;
                    if (lineIndex < bootLines.length) {
                        setTimeout(typeNext, 500);
                    } else {
                        setTimeout(() => {
                            if (searchInput.value === "") {
                                searchInput.placeholder = restingPlaceholder;
                            }
                        }, 700);
                    }
                }
            };

            setTimeout(typeNext, 300);
        }
    }

    /* ---------------- Mark missing episodes (once, on the hidden source data) ---------------- */
    document.querySelectorAll(".show-detail-sources .ep-btn.watch").forEach((btn) => {
        const video = btn.getAttribute("data-video");
        if (!video) {
            btn.disabled = true;
            btn.textContent = "MISSING";
            const row = btn.closest(".episode-row");
            if (row) row.classList.add("episode-missing");
        }
    });

    /* ---------------- Theater mode video player ---------------- */
    const theaterOverlay = document.getElementById("theaterOverlay");
    const theaterIframe = document.getElementById("theaterIframe");
    const theaterClose = document.getElementById("theaterClose");

    function youtubeEmbedUrl(url) {
        try {
            const u = new URL(url);
            let id = u.searchParams.get("v");
            if (!id && u.hostname.includes("youtu.be")) {
                id = u.pathname.slice(1);
            }
            if (!id) return null;
            return `https://www.youtube.com/embed/${id}?autoplay=1`;
        } catch (e) {
            return null;
        }
    }

    function openTheater(url) {
        const embed = youtubeEmbedUrl(url);
        if (!embed || !theaterOverlay || !theaterIframe) return;
        theaterIframe.src = embed;
        theaterOverlay.classList.add("open");
        document.body.style.overflow = "hidden";
    }

    function closeTheater() {
        if (!theaterOverlay || !theaterIframe) return;
        theaterOverlay.classList.remove("open");
        theaterIframe.src = "";
        document.body.style.overflow = detailOverlay && detailOverlay.classList.contains("open") ? "hidden" : "";
    }

    if (theaterClose) {
        theaterClose.addEventListener("click", closeTheater);
    }

    if (theaterOverlay) {
        theaterOverlay.addEventListener("click", (event) => {
            if (event.target === theaterOverlay) closeTheater();
        });
    }

    /* ---------------- Detail modal (opened from a poster tile) ---------------- */
    const detailOverlay = document.getElementById("detailOverlay");
    const detailBody = document.getElementById("detailBody");
    const detailClose = document.getElementById("detailClose");

    function openDetail(slug) {
        const source = document.getElementById("detail-" + slug);
        if (!source || !detailBody || !detailOverlay) return;
        detailBody.innerHTML = source.innerHTML;
        detailOverlay.classList.add("open");
        document.body.style.overflow = "hidden";
    }

    function closeDetail() {
        if (!detailOverlay || !detailBody) return;
        detailOverlay.classList.remove("open");
        detailBody.innerHTML = "";
        document.body.style.overflow = "";
    }

    document.querySelectorAll(".poster-tile").forEach((tile) => {
        tile.addEventListener("click", () => openDetail(tile.dataset.show));
        tile.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openDetail(tile.dataset.show);
            }
        });
    });

    if (detailClose) {
        detailClose.addEventListener("click", closeDetail);
    }

    if (detailOverlay) {
        detailOverlay.addEventListener("click", (event) => {
            if (event.target === detailOverlay) closeDetail();
        });
    }

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        if (theaterOverlay && theaterOverlay.classList.contains("open")) {
            closeTheater();
        } else if (detailOverlay && detailOverlay.classList.contains("open")) {
            closeDetail();
        }
    });

    /* ---------------- Event delegation for dynamically-injected content ---------------- */
    // Filter tags and watch buttons get cloned into #detailBody at runtime, so we bind
    // these on document and match via closest() rather than binding per-element.
    document.addEventListener("click", (event) => {
        const watchBtn = event.target.closest(".ep-btn.watch");
        if (watchBtn && !watchBtn.disabled) {
            event.preventDefault();
            const video = watchBtn.getAttribute("data-video");
            if (video) openTheater(video);
            return;
        }

        const filterTag = event.target.closest(".filter-tag");
        if (filterTag) {
            event.preventDefault();
            event.stopPropagation();
            const value = filterTag.dataset.filter || filterTag.textContent.trim();
            if (searchInput) {
                searchInput.value = value;
                searchInput.dispatchEvent(new Event("input"));
                searchInput.focus();
            }
            if (suggestionsBox) suggestionsBox.classList.remove("open");
        }
    });

    /* ---------------- Search bar + tag suggestions ---------------- */
    const suggestionsBox = document.getElementById("searchSuggestions");
    const posterTiles = Array.from(document.querySelectorAll(".poster-tile"));
    const allTags = Array.from(new Set(
        Array.from(document.querySelectorAll(".filter-tag"))
            .map((tag) => tag.dataset.filter || tag.textContent.trim())
    )).sort();

    function filterTiles(query) {
        posterTiles.forEach((tile) => {
            const source = document.getElementById("detail-" + tile.dataset.show);
            const haystack = (tile.textContent + " " + (source ? source.textContent : "")).toLowerCase();
            const isMatch = query === "" || haystack.includes(query);
            tile.style.display = isMatch ? "" : "none";
        });
    }

    function renderSuggestions(query) {
        if (!suggestionsBox) return;

        if (query === "") {
            suggestionsBox.classList.remove("open");
            suggestionsBox.innerHTML = "";
            return;
        }

        const matches = allTags
            .filter((tag) => tag.toLowerCase().includes(query) && tag.toLowerCase() !== query)
            .slice(0, 8);

        if (matches.length === 0) {
            suggestionsBox.classList.remove("open");
            suggestionsBox.innerHTML = "";
            return;
        }

        suggestionsBox.innerHTML = matches
            .map((tag) => `<button type="button" class="suggestion-tag">${tag}</button>`)
            .join("");
        suggestionsBox.classList.add("open");

        suggestionsBox.querySelectorAll(".suggestion-tag").forEach((btn) => {
            btn.addEventListener("click", () => {
                searchInput.value = btn.textContent;
                searchInput.dispatchEvent(new Event("input"));
                suggestionsBox.classList.remove("open");
                searchInput.focus();
            });
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            const query = searchInput.value.trim().toLowerCase();
            filterTiles(query);
            renderSuggestions(query);
        });

        searchInput.addEventListener("blur", () => {
            setTimeout(() => suggestionsBox && suggestionsBox.classList.remove("open"), 150);
        });
    }
});
