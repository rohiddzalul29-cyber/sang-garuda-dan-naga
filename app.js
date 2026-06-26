// app.js
// Logika aplikasi web novel "Sang Garuda dan Naga"
// Alur: Sampul -> Daftar Isi -> Halaman Baca (swipe antar bab)

(function () {
  "use strict";

  // ----------------------------------------------------------
  // State & helpers
  // ----------------------------------------------------------
  const STORAGE_KEY = "sgdn_progress_v1";

  /** Gabungkan bab + epilog jadi satu daftar "pages" yang berurutan */
  function buildPages() {
    const pages = NOVEL_DATA.chapters.map((ch) => ({
      type: "chapter",
      number: ch.number,
      title: ch.title,
      paragraphs: ch.paragraphs,
    }));
    pages.push({
      type: "epilog",
      number: null,
      title: NOVEL_DATA.epilog.title,
      paragraphs: NOVEL_DATA.epilog.paragraphs,
    });
    return pages;
  }

  const PAGES = buildPages();

  function getProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveProgress(pageIndex) {
    try {
      const readSet = getReadSet();
      readSet.add(pageIndex);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ lastIndex: pageIndex, read: Array.from(readSet) }),
      );
    } catch (e) {
      /* ignore (private mode, etc.) */
    }
  }

  function getReadSet() {
    const p = getProgress();
    return new Set(p && p.read ? p.read : []);
  }

  // ----------------------------------------------------------
  // DOM references
  // ----------------------------------------------------------
  const viewCover = document.getElementById("view-cover");
  const viewToc = document.getElementById("view-toc");
  const viewReader = document.getElementById("view-reader");

  const tocList = document.getElementById("toc-list");
  const continueCard = document.getElementById("continue-card");
  const continueText = document.getElementById("continue-text");
  const btnContinue = document.getElementById("btn-continue");

  const pageFrame = document.getElementById("page-frame");
  const rhEyebrow = document.getElementById("rh-eyebrow");
  const rhTitleText = document.getElementById("rh-title-text");
  const progressFill = document.getElementById("progress-fill");
  const swipeHint = document.getElementById("swipe-hint");

  let currentIndex = 0;

  // ----------------------------------------------------------
  // View switching
  // ----------------------------------------------------------
  function showView(name) {
    [viewCover, viewToc, viewReader].forEach((v) =>
      v.classList.remove("active"),
    );
    if (name === "cover") viewCover.classList.add("active");
    if (name === "toc") viewToc.classList.add("active");
    if (name === "reader") viewReader.classList.add("active");
    window.scrollTo({
      top: 0,
      behavior: "instant" in window ? "instant" : "auto",
    });
  }

  function openCover() {
    renderToc();
    showView("cover");
  }

  function openToc() {
    renderToc();
    showView("toc");
  }

  function openReader(index, { fromSwipe = false } = {}) {
    if (index < 0 || index >= PAGES.length) return;
    currentIndex = index;
    renderPage(index);
    showView("reader");
    saveProgress(index);
    if (!fromSwipe) {
      maybeShowSwipeHint();
    }
  }

  // ----------------------------------------------------------
  // Render: Table of contents
  // ----------------------------------------------------------
  function renderToc() {
    const readSet = getReadSet();
    const progress = getProgress();

    // Continue card
    if (
      progress &&
      typeof progress.lastIndex === "number" &&
      PAGES[progress.lastIndex]
    ) {
      const page = PAGES[progress.lastIndex];
      continueCard.classList.add("show");
      continueText.textContent =
        page.type === "epilog"
          ? page.title
          : `Bab ${page.number}: ${page.title}`;
      btnContinue.onclick = () => openReader(progress.lastIndex);
    } else {
      continueCard.classList.remove("show");
    }

    // List
    tocList.innerHTML = "";

    const chapterLabel = document.createElement("div");
    chapterLabel.className = "toc-section-label";
    chapterLabel.textContent = "Daftar Bab";
    tocList.appendChild(chapterLabel);

    PAGES.forEach((page, idx) => {
      if (page.type === "epilog") {
        const epLabel = document.createElement("div");
        epLabel.className = "toc-section-label";
        epLabel.textContent = "Penutup";
        tocList.appendChild(epLabel);
      }

      const item = document.createElement("button");
      item.className = "toc-item" + (page.type === "epilog" ? " epilog" : "");
      if (readSet.has(idx)) item.classList.add("read");
      item.setAttribute("type", "button");

      const numHtml =
        page.type === "epilog"
          ? `<span class="toc-num">E</span>`
          : `<span class="toc-num">${String(page.number).padStart(2, "0")}</span>`;

      const chip = page.type === "epilog" ? "Epilog" : `Bab ${page.number}`;

      item.innerHTML = `
        ${numHtml}
        <span class="toc-info">
          <span class="toc-chip">${chip}</span>
          <span class="toc-name">${escapeHtml(page.title)}</span>
        </span>
        <span class="toc-arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </span>
      `;

      item.addEventListener("click", () => openReader(idx));
      tocList.appendChild(item);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ----------------------------------------------------------
  // Render: Reader page
  // ----------------------------------------------------------
  const cornerOrnamentSvg = `
    <svg viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 2 L2 16 Q2 22 8 22 L22 22" stroke="#8b3a2f" stroke-width="1.6" fill="none"/>
      <path d="M2 2 L16 2 Q22 2 22 8 L22 22" stroke="#8b3a2f" stroke-width="1.6" fill="none"/>
      <circle cx="22" cy="22" r="2.4" fill="#c9a14a"/>
      <path d="M2 2 L9 2 M2 2 L2 9" stroke="#2d3b2e" stroke-width="1.6"/>
    </svg>
  `;

  function renderPage(index) {
    const page = PAGES[index];
    const isEpilog = page.type === "epilog";

    rhEyebrow.textContent = isEpilog
      ? "Penutup"
      : `Bab ${page.number} dari ${NOVEL_DATA.chapters.length}`;
    rhTitleText.textContent = page.title;

    const paragraphsHtml = page.paragraphs
      .map((p) => `<p>${escapeHtml(p)}</p>`)
      .join("\n");

    const prevDisabled = index <= 0 ? "disabled" : "";
    const nextDisabled = index >= PAGES.length - 1 ? "disabled" : "";
    const prevPage = PAGES[index - 1];
    const nextPage = PAGES[index + 1];

    pageFrame.innerHTML = `
      <article class="parchment">
        <div class="parchment-side-l"></div>
        <div class="parchment-side-r"></div>
        <div class="corner-orn c-tl">${cornerOrnamentSvg}</div>
        <div class="corner-orn c-tr">${cornerOrnamentSvg}</div>
        <div class="corner-orn c-bl">${cornerOrnamentSvg}</div>
        <div class="corner-orn c-br">${cornerOrnamentSvg}</div>

        <div class="chapter-head">
          <div class="chapter-eyebrow ${isEpilog ? "is-epilog" : ""}">
            ${isEpilog ? "Sang Garuda &amp; Naga" : "Sang Garuda &amp; Naga"}
          </div>
          <div class="chapter-num-big">${isEpilog ? "EPILOG" : "BAB " + String(page.number).padStart(2, "0")}</div>
          <h2 class="chapter-title">${escapeHtml(page.title)}</h2>
          <div class="chapter-rule"></div>
        </div>

        <div class="chapter-body">
          ${paragraphsHtml}
        </div>

        <div class="chapter-end-orn">
          <span class="line"></span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3l3 6 6 1-4.5 4.5L17.5 21 12 17.5 6.5 21l1-6.5L3 10l6-1z"/></svg>
          <span class="line right"></span>
        </div>
      </article>

      <div class="reader-nav">
        <button class="nav-btn prev-btn" id="btn-prev-page" ${prevDisabled}>
          <span class="nb-label">&larr; Sebelumnya</span>
          <span class="nb-title">${prevPage ? truncateTitle(prevPage) : "—"}</span>
        </button>
        <button class="nav-btn next-btn" id="btn-next-page" ${nextDisabled}>
          <span class="nb-label">Berikutnya &rarr;</span>
          <span class="nb-title">${nextPage ? truncateTitle(nextPage) : "Tamat"}</span>
        </button>
      </div>

      <div class="back-to-toc-row">
        <button type="button" id="btn-back-toc-inline">Kembali ke Daftar Isi</button>
      </div>
    `;

    document.getElementById("btn-prev-page").addEventListener("click", () => {
      if (index > 0) openReader(index - 1);
    });
    document.getElementById("btn-next-page").addEventListener("click", () => {
      if (index < PAGES.length - 1) openReader(index + 1);
    });
    document
      .getElementById("btn-back-toc-inline")
      .addEventListener("click", openToc);

    updateProgressBar(index);
  }

  function truncateTitle(page) {
    const label =
      page.type === "epilog" ? page.title : `Bab ${page.number}: ${page.title}`;
    return label.length > 26 ? label.slice(0, 24) + "…" : label;
  }

  function updateProgressBar(index) {
    const pct = ((index + 1) / PAGES.length) * 100;
    progressFill.style.width = pct + "%";
  }

  // ----------------------------------------------------------
  // Swipe gesture (mobile) — geser kiri/kanan untuk ganti bab
  // ----------------------------------------------------------
  let touchStartX = null;
  let touchStartY = null;

  viewReader.addEventListener(
    "touchstart",
    (e) => {
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
    },
    { passive: true },
  );

  viewReader.addEventListener(
    "touchend",
    (e) => {
      if (touchStartX === null) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;

      // Pastikan ini gesture horizontal yang jelas, bukan scroll vertikal
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) {
        if (dx < 0 && currentIndex < PAGES.length - 1) {
          openReader(currentIndex + 1, { fromSwipe: true });
        } else if (dx > 0 && currentIndex > 0) {
          openReader(currentIndex - 1, { fromSwipe: true });
        }
      }
      touchStartX = null;
      touchStartY = null;
    },
    { passive: true },
  );

  function maybeShowSwipeHint() {
    const seen = sessionStorage.getItem("sgdn_swipe_hint_seen");
    if (seen) return;
    if (window.matchMedia && !window.matchMedia("(pointer: coarse)").matches)
      return;
    swipeHint.classList.add("show");
    setTimeout(() => swipeHint.classList.remove("show"), 3200);
    sessionStorage.setItem("sgdn_swipe_hint_seen", "1");
  }

  // ----------------------------------------------------------
  // Keyboard navigation (desktop convenience)
  // ----------------------------------------------------------
  document.addEventListener("keydown", (e) => {
    if (!viewReader.classList.contains("active")) return;
    if (e.key === "ArrowRight" && currentIndex < PAGES.length - 1) {
      openReader(currentIndex + 1);
    } else if (e.key === "ArrowLeft" && currentIndex > 0) {
      openReader(currentIndex - 1);
    } else if (e.key === "Escape") {
      openToc();
    }
  });

  // ----------------------------------------------------------
  // Cover backdrop (blur fill untuk layar lebar/landscape)
  // ----------------------------------------------------------
  const coverBackdrop = document.getElementById("cover-backdrop");
  if (coverBackdrop) {
    coverBackdrop.style.backgroundImage = "url('assets/cover.png')";
  }

  // ----------------------------------------------------------
  // Entry point wiring
  // ----------------------------------------------------------
  viewCover.addEventListener("click", () => {
    viewCover.classList.add("opening");
    setTimeout(() => {
      viewCover.classList.remove("opening");
      openToc();
    }, 420);
  });

  document.getElementById("btn-toc-cover").addEventListener("click", (e) => {
    e.stopPropagation();
    openCover();
  });
  document.getElementById("btn-reader-toc").addEventListener("click", openToc);
  document
    .getElementById("btn-reader-cover")
    .addEventListener("click", openCover);

  // Inisialisasi
  renderToc();
  showView("cover");
})();
