/**
 * Posterium — Assessment 2
 *
 * Module 4 pattern:
 *   async getData(url) → fetch → response.json() → data.results
 *   loop preview[] and prepend https://media.nfsacollection.net/
 *
 * Endpoints (NFSA collection API):
 *   GET /search?query=poster&hasMedia=yes&page=n
 *   GET /title/:id
 */
(function () {
  "use strict";

  const SEARCH_URL = "https://api.collection.nfsa.gov.au/search";
  const TITLE_API = "https://api.collection.nfsa.gov.au/title/";
  const MEDIA_URL = "https://media.nfsacollection.net/";
  const TITLE_PAGE = "https://www.collection.nfsa.gov.au/title/";
  const PAGE_SIZE = 25;
  const MAX_POSTERS = 500;
  const QUERY = "poster";

  const headerLogo = document.getElementById("header-logo");
  const logoBtn = document.getElementById("logo-btn");
  const statusEl = document.getElementById("status");
  const fanView = document.getElementById("fan-view");
  const fanEl = document.getElementById("fan");
  const decadeList = document.getElementById("decade-list");
  const decadePrev = document.getElementById("decade-prev");
  const decadeNext = document.getElementById("decade-next");
  const titleEl = document.getElementById("poster-title");
  const metaEl = document.getElementById("poster-meta");
  const summaryEl = document.getElementById("poster-summary");
  const popupEl = document.getElementById("year-popup");
  const popupKicker = document.getElementById("popup-kicker");
  const popupList = document.getElementById("popup-list");
  const popupClose = document.getElementById("popup-close");
  const detailEl = document.getElementById("detail");
  const detailImage = document.getElementById("detail-image");
  const detailTitle = document.getElementById("detail-title");
  const detailKicker = document.getElementById("detail-kicker");
  const detailSummary = document.getElementById("detail-summary");
  const detailLink = document.getElementById("detail-link");
  const creditEl = document.querySelector(".nfsa-credit");
  const siteHeader = document.querySelector(".site-header");

  const state = {
    posters: [],
    groups: new Map(),
    decades: [],
    decade: "",
    fanDecade: "",
    index: 0,
    query: "",
    hoverDecade: null,
    compact: window.matchMedia("(max-width: 767px)").matches,
    failed: {},
    hideTimer: null,
  };

  function decadeWindow() {
    return window.innerWidth < 520 ? 3 : 5;
  }

  function decadeLabel(year) {
    if (!year || year < 1800 || year > 2100) return "Undated";
    return Math.floor(year / 10) * 10 + "s";
  }

  function displayTitle(raw) {
    let t = String(raw || "")
      .replace(/[\[\]]/g, "")
      .trim();
    t = t.replace(/\s*:\s*POSTER.*$/i, "");
    t = t.replace(/\s*:\s*DOCUMENTATION.*$/i, "");
    t = t.replace(
      /\bPOSTER,?\s*(ONE[-\s]?SHEETER|DAYBILL|INSERT|ONE SHEET).*$/i,
      "",
    );
    t = t.replace(/\bPOSTER\b/gi, "");
    t = t.replace(/\s*\.\s*\d{4}(?:\s*[-–]\s*\d{4})?.*$/, "");
    t = t.replace(/\s{2,}/g, " ").replace(/^[,.\-–—:\s]+|[,.\-–—:\s]+$/g, "");
    if (!t) return "";
    return t
      .toLowerCase()
      .replace(/(^|[\s/(&\-])([a-z])/g, function (_, p, c) {
        return p + c.toUpperCase();
      });
  }

  function isNamelessTitle(raw) {
    const t = displayTitle(raw).toLowerCase();
    return (
      !t ||
      t === "untitled" ||
      t === "untitled poster" ||
      t === "daybill" ||
      t === "one-sheet" ||
      t === "one sheeter" ||
      t === "poster"
    );
  }

  function pickTitle(item) {
    const related = (item.relatedTitles || []).map(function (r) {
      return r && r.title;
    });
    const candidates = [item.name, item.title].concat(related);
    for (let i = 0; i < candidates.length; i++) {
      const raw = candidates[i];
      const cleaned = displayTitle(String(raw || ""));
      if (cleaned && !isNamelessTitle(cleaned)) return String(raw || "");
    }
    return "";
  }

  function imageFromPreview(item) {
    const images = (item.preview || []).filter(function (p) {
      return p && p.type === "image" && p.filePath;
    });
    if (!images.length) return null;
    const img = images[0];
    return {
      image: MEDIA_URL + img.filePath,
      thumb: MEDIA_URL + (img.thumbnailFilePath || img.filePath),
    };
  }

  function mapResult(item) {
    const media = imageFromPreview(item);
    if (!media) return null;
    const title = pickTitle(item);
    if (!title || isNamelessTitle(title)) return null;
    const year =
      item.productionDates && item.productionDates[0]
        ? item.productionDates[0].fromYear || null
        : null;
    const creator =
      (item.credits || []).find(function (c) {
        return c.role === "Creator";
      }) || null;
    return {
      id: String(item.id),
      title: title,
      year: year,
      decade: decadeLabel(year),
      description: (item.summary || "").trim(),
      image: media.image,
      thumb: media.thumb,
      url: TITLE_PAGE + item.id,
      contributor: creator ? displayTitle(creator.name) : "",
    };
  }

  function showLoading(percent) {
    const pct = Math.max(4, Math.min(100, Math.round(percent)));
    fanView.hidden = true;
    statusEl.hidden = false;
    if (siteHeader) siteHeader.hidden = true;
    if (creditEl) creditEl.hidden = true;
    let dots = "";
    for (let i = 0; i < 8; i++) {
      dots += '<span style="--i:' + i + '"></span>';
    }
    statusEl.innerHTML =
      '<img class="brand-logo brand-logo-lg" src="assets/logo.png" alt="Posterium" />' +
      "<h2>Loading</h2>" +
      '<div class="load-orbit" aria-hidden="true">' +
      dots +
      "</div>" +
      '<div class="load-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
      pct +
      '"><i style="width:' +
      pct +
      '%"></i></div>' +
      '<p class="load-pct">' +
      pct +
      "%</p>";
  }

  function showStatus(kind, title, hint, retry) {
    fanView.hidden = true;
    statusEl.hidden = false;
    if (siteHeader) siteHeader.hidden = kind === "loading";
    if (kind === "loading") {
      showLoading(8);
      return;
    }
    let extra = "";
    const action = retry
      ? '<button class="retry" type="button" id="retry-btn">Retry</button>'
      : kind === "empty"
        ? '<button class="retry" type="button" id="retry-btn">Home</button>'
        : "";
    statusEl.innerHTML =
      extra +
      "<h2>" +
      title +
      "</h2>" +
      (hint ? '<p class="hint">' + hint + "</p>" : "") +
      action;
    const btn = document.getElementById("retry-btn");
    if (btn) {
      btn.addEventListener("click", function () {
        if (kind === "empty") {
          state.query = "";
          render();
        } else {
          loadArchive();
        }
      });
    }
  }

  function dropBroken(id) {
    if (state.failed[id]) return;
    state.failed[id] = true;
    state.posters = state.posters.filter(function (p) {
      return p.id !== id;
    });
    const nextGroups = new Map();
    state.groups.forEach(function (list, decade) {
      const kept = list.filter(function (p) {
        return p.id !== id;
      });
      if (kept.length) nextGroups.set(decade, kept);
    });
    state.groups = nextGroups;
    state.decades = Array.from(state.groups.keys()).sort(function (a, b) {
      if (a === "Undated") return 1;
      if (b === "Undated") return -1;
      return parseInt(a, 10) - parseInt(b, 10);
    });
    if (!state.groups.has(state.decade)) {
      state.decade = state.decades[0] || "";
      state.index = 0;
    }
    const list = currentList();
    if (state.index >= list.length) state.index = 0;
    render();
  }

  function currentList() {
    return state.groups.get(state.decade) || [];
  }

  function slotStyle(offset, compact) {
    const abs = Math.abs(offset);
    const spread = compact ? 102 : 150;
    const rot = compact ? 16 : 24;
    const drop = compact
      ? abs * abs * 12 + abs * 10
      : abs * abs * 10 + abs * 8;
    const scale = compact
      ? offset === 0
        ? 1.08
        : 1 - abs * 0.07
      : offset === 0
        ? 1.22
        : 1 - abs * 0.12;
    const y = drop - (offset === 0 ? (compact ? 6 : 8) : 0);
    const hidden = abs > (compact ? 1 : 2);
    return {
      x: offset * spread + "px",
      rot: offset * rot + "deg",
      s: String(hidden ? scale * 0.82 : scale),
      y: y + "px",
      z: String(20 - abs),
      hidden: hidden,
    };
  }

  function renderFan(list) {
    const n = list.length;
    if (!n) return;
    if (state.fanDecade !== state.decade) {
      fanEl.innerHTML = "";
      state.fanDecade = state.decade;
    }
    state.index = ((state.index % n) + n) % n;
    const radius = state.compact ? 1 : 2;
    const needed = {};
    const slots = [];
    for (let offset = -(radius + 1); offset <= radius + 1; offset++) {
      const i = (state.index + offset + n) % n;
      if (needed[i]) continue;
      needed[i] = true;
      slots.push({ poster: list[i], offset: offset, i: i });
    }

    const keep = {};
    Array.prototype.forEach.call(fanEl.children, function (node) {
      keep[node.getAttribute("data-i")] = node;
    });

    slots.forEach(function (slot) {
      const style = slotStyle(slot.offset, state.compact);
      let article = keep[String(slot.i)];
      if (!article) {
        article = document.createElement("article");
        article.setAttribute("data-i", String(slot.i));
        const img = document.createElement("img");
        img.alt = "";
        img.draggable = false;
        article.appendChild(img);
        fanEl.appendChild(article);
      }
      article.className =
        "poster-slot" +
        (slot.offset === 0 ? " is-center" : "") +
        (style.hidden ? " is-ghost" : "");
      article.style.setProperty("--x", style.x);
      article.style.setProperty("--rot", style.rot);
      article.style.setProperty("--s", style.s);
      article.style.setProperty("--y", style.y);
      article.style.zIndex = style.z;
      const img = article.querySelector("img");
      img.onerror = function () {
        dropBroken(slot.poster.id);
      };
      if (img.getAttribute("src") !== slot.poster.thumb) {
        img.src = slot.poster.thumb;
      }
      article.onclick = function () {
        if (slot.offset === 0) openDetail(slot.poster);
        else step(slot.offset);
      };
      delete keep[String(slot.i)];
    });

    Object.keys(keep).forEach(function (id) {
      keep[id].remove();
    });

    const current = list[state.index];
    titleEl.textContent = displayTitle(current.title);
    metaEl.textContent = [current.year, current.contributor]
      .filter(Boolean)
      .join("  ·  ");
    summaryEl.textContent = current.description || "";
  }

  function hidePopup() {
    if (state.hideTimer) {
      window.clearTimeout(state.hideTimer);
      state.hideTimer = null;
    }
    state.hoverDecade = null;
    popupEl.hidden = true;
  }

  function scheduleHide() {
    if (state.hideTimer) window.clearTimeout(state.hideTimer);
    state.hideTimer = window.setTimeout(hidePopup, 400);
  }

  function cancelHide() {
    if (state.hideTimer) {
      window.clearTimeout(state.hideTimer);
      state.hideTimer = null;
    }
  }

  function showPopup(decade) {
    cancelHide();
    const list = state.groups.get(decade) || [];
    if (!list.length) {
      hidePopup();
      return;
    }
    state.hoverDecade = decade;
    popupKicker.textContent = decade;
    popupList.innerHTML = "";
    list.forEach(function (poster) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = displayTitle(poster.title);
      btn.addEventListener("click", function () {
        state.decade = decade;
        const full = state.groups.get(decade) || [];
        const i = full.findIndex(function (p) {
          return p.id === poster.id;
        });
        state.index = i < 0 ? 0 : i;
        hidePopup();
        render();
      });
      li.appendChild(btn);
      popupList.appendChild(li);
    });
    popupClose.textContent =
      list.length + (list.length === 1 ? " result" : " results");
    popupEl.hidden = false;
  }

  function renderDecades() {
    const WINDOW = decadeWindow();
    const decades = state.decades;
    const activeIndex = Math.max(0, decades.indexOf(state.decade));
    const half = Math.floor(WINDOW / 2);
    const start = Math.min(
      Math.max(0, activeIndex - half),
      Math.max(0, decades.length - WINDOW),
    );
    const visible = decades.slice(start, start + WINDOW);

    decadeList.innerHTML = "";
    visible.forEach(function (decade) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = decade;
      btn.className = decade === state.decade ? "is-active" : "";
      btn.addEventListener("mouseenter", function () {
        showPopup(decade);
      });
      btn.addEventListener("click", function () {
        state.decade = decade;
        state.index = 0;
        showPopup(decade);
        render();
      });
      li.appendChild(btn);
      decadeList.appendChild(li);
    });

    decadePrev.disabled = activeIndex <= 0;
    decadeNext.disabled = activeIndex >= decades.length - 1;
  }

  function render() {
    if (siteHeader) siteHeader.hidden = false;
    if (creditEl) creditEl.hidden = false;
    const list = currentList();
    if (!list.length) {
      showStatus(
        "empty",
        "No posters found",
        "This shelf of the archive is empty right now.",
      );
      renderDecades();
      return;
    }
    statusEl.hidden = true;
    fanView.hidden = false;
    renderDecades();
    renderFan(list);
  }

  function step(dir) {
    const list = currentList();
    if (!list.length) return;
    state.index = (state.index + dir + list.length) % list.length;
    renderFan(list);
  }

  async function getData(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        response.status === 429
          ? "The NFSA archive asked us to slow down. Try again in a moment."
          : "Error fetching data. Please try again later. (" +
            response.status +
            ")",
      );
    }
    return response.json();
  }

  function searchUrl(page) {
    return (
      SEARCH_URL +
      "?query=" +
      encodeURIComponent(QUERY) +
      "&hasMedia=yes&page=" +
      page
    );
  }

  async function openDetail(poster) {
    detailImage.src = poster.image;
    detailImage.alt = displayTitle(poster.title);
    detailTitle.textContent = displayTitle(poster.title);
    detailKicker.textContent = [poster.year, "National Film and Sound Archive"]
      .filter(Boolean)
      .join("  ·  ");
    detailSummary.textContent = poster.description || "Loading record…";
    detailLink.href = poster.url;
    detailEl.hidden = false;

    try {
      const record = await getData(TITLE_API + poster.id);
      if (record && record.summary) {
        detailSummary.textContent = record.summary;
      } else if (!poster.description) {
        detailSummary.textContent = "No summary in this record.";
      }
    } catch (error) {
      console.error("Error fetching title:", error);
      if (!poster.description) {
        detailSummary.textContent = "No summary in this record.";
      }
    }
  }

  function closeDetail() {
    detailEl.hidden = true;
  }

  async function loadArchive() {
    showLoading(6);
    try {
      const first = await getData(searchUrl(1));
      console.log("Full API Response:", first);

      const available =
        (first.meta && first.meta.count && first.meta.count.total) || 0;
      const target = Math.min(available || MAX_POSTERS, MAX_POSTERS);
      const pages = Math.max(1, Math.ceil(target / PAGE_SIZE));
      showLoading((1 / pages) * 100);
      const pageData = new Array(pages);
      pageData[0] = first;

      let done = 1;
      const jobs = [];
      for (let page = 2; page <= pages; page++) {
        jobs.push(
          getData(searchUrl(page)).then(function (data) {
            pageData[page - 1] = data;
            done += 1;
            showLoading((done / pages) * 100);
          }),
        );
      }
      await Promise.all(jobs);

      const posters = [];
      const seen = {};
      pageData.forEach(function (page) {
        const results = (page && page.results) || [];
        results.forEach(function (item) {
          const mapped = mapResult(item);
          if (!mapped || seen[mapped.id] || posters.length >= MAX_POSTERS) {
            return;
          }
          seen[mapped.id] = true;
          posters.push(mapped);
        });
      });

      if (!posters.length) {
        showStatus(
          "empty",
          "No posters found",
          "The NFSA search returned no image records.",
        );
        return;
      }

      const groups = new Map();
      posters.forEach(function (p) {
        const list = groups.get(p.decade) || [];
        list.push(p);
        groups.set(p.decade, list);
      });

      const firstDated = posters.find(function (p) {
        return p.year;
      });
      const firstId = firstDated ? firstDated.id : posters[0] && posters[0].id;

      groups.forEach(function (list) {
        list.sort(function (a, b) {
          if (firstId && a.id === firstId) return -1;
          if (firstId && b.id === firstId) return 1;
          return (a.year || 9999) - (b.year || 9999);
        });
      });

      const decades = Array.from(groups.keys()).sort(function (a, b) {
        if (a === "Undated") return 1;
        if (b === "Undated") return -1;
        return parseInt(a, 10) - parseInt(b, 10);
      });

      state.posters = posters;
      state.groups = groups;
      state.decades = decades;
      state.decade = (firstDated && firstDated.decade) || decades[0];
      state.index = 0;
      render();
    } catch (error) {
      console.error("Error fetching data:", error);
      showStatus(
        "error",
        "Something went wrong",
        error && error.message
          ? error.message
          : "Error fetching data. Please try again later.",
        true,
      );
    }
  }

  logoBtn.addEventListener("click", function () {
    window.location.reload();
  });
  decadePrev.addEventListener("click", function () {
    const i = state.decades.indexOf(state.decade);
    if (i > 0) {
      state.decade = state.decades[i - 1];
      state.index = 0;
      hidePopup();
      render();
    }
  });
  decadeNext.addEventListener("click", function () {
    const i = state.decades.indexOf(state.decade);
    if (i < state.decades.length - 1) {
      state.decade = state.decades[i + 1];
      state.index = 0;
      hidePopup();
      render();
    }
  });
  document.querySelector(".timeline").addEventListener("mouseleave", scheduleHide);
  popupEl.addEventListener("mouseenter", cancelHide);
  popupEl.addEventListener("mouseleave", scheduleHide);
  popupClose.addEventListener("click", hidePopup);
  document
    .getElementById("detail-close")
    .addEventListener("click", closeDetail);
  detailEl.addEventListener("click", function (e) {
    if (e.target === detailEl) closeDetail();
  });

  window.addEventListener("keydown", function (e) {
    if (!detailEl.hidden && e.key === "Escape") {
      closeDetail();
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
    }
    if (e.key === "Enter") {
      const list = currentList();
      if (list[state.index]) openDetail(list[state.index]);
    }
  });

  let startX = null;
  fanEl.addEventListener("pointerdown", function (e) {
    startX = e.clientX;
  });
  fanEl.addEventListener("pointerup", function (e) {
    if (startX == null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1);
  });

  window.addEventListener("resize", function () {
    const next = window.matchMedia("(max-width: 767px)").matches;
    if (next !== state.compact) {
      state.compact = next;
    }
    if (!fanView.hidden) render();
  });

  loadArchive();
})();
