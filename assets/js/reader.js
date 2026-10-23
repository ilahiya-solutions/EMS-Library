/*==================== EMS LIBRARY – PDF.js READER ====================
  Renders a PDF page-by-page onto <canvas> elements, lazily (only pages
  near the viewport are drawn), with zoom / fit / navigation controls.
  Depends on the global `pdfjsLib` (loaded from a pinned CDN build in
  reader.html) and degrades to the "open original PDF" fallback link if
  that script failed to load or the document fails to open. ====================*/
(function () {
  var params = new URLSearchParams(window.location.search);
  var src = params.get("src") || "";
  var title = params.get("title") || "Untitled";
  var meta = params.get("meta") || "";

  var els = {
    title: document.getElementById("reader-title"),
    subtitle: document.getElementById("reader-subtitle"),
    status: document.getElementById("reader-status"),
    statusText: document.getElementById("reader-status-text"),
    retry: document.getElementById("retry-button"),
    pages: document.getElementById("reader-pages"),
    viewport: document.getElementById("reader-viewport"),
    prev: document.getElementById("prev-page"),
    next: document.getElementById("next-page"),
    pageInput: document.getElementById("page-input"),
    pageCount: document.getElementById("page-count"),
    zoomIn: document.getElementById("zoom-in"),
    zoomOut: document.getElementById("zoom-out"),
    zoomLevel: document.getElementById("zoom-level"),
    fitWidth: document.getElementById("fit-width"),
    fitPage: document.getElementById("fit-page"),
    download: document.getElementById("download-link"),
    fallback: document.getElementById("fallback-link"),
  };

  document.title = title + " – EMS Library Reader";
  els.title.textContent = title;
  if (meta) els.subtitle.textContent = meta;

  function isSafeLocalPath(p) {
    if (!p) return false;
    if (/^[a-z]+:/i.test(p)) return false; // no protocols (http:, javascript:, etc.)
    if (p.indexOf("..") !== -1) return false;
    return true;
  }

  // These two are useful even if PDF.js itself never loads.
  if (isSafeLocalPath(src)) {
    els.download.href = src;
    els.download.removeAttribute("hidden");
    els.fallback.href = src;
    els.fallback.removeAttribute("hidden");
  }

  if (!isSafeLocalPath(src)) {
    showError("This book's file path is missing or invalid.", false);
    return;
  }

  if (typeof window.pdfjsLib === "undefined") {
    showError(
      "The PDF reader library failed to load (check your connection).",
      true
    );
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  var state = {
    pdf: null,
    numPages: 0,
    scale: 1,
    fitMode: "width", // "width" | "page" | null once the user manually zooms
    pageEls: [], // { container, canvas, rendered, task }
    currentPage: 1,
    renderQueue: [],
    renderBusy: false,
  };

  function showError(message, allowRetry) {
    els.pages.hidden = true;
    els.status.hidden = false;
    els.statusText.textContent = message;
    els.retry.hidden = !allowRetry;
  }

  function showLoading(text) {
    els.status.hidden = false;
    els.pages.hidden = true;
    els.statusText.textContent = text || "Loading document…";
    els.retry.hidden = true;
  }

  els.retry.addEventListener("click", loadDocument);

  function loadDocument() {
    showLoading("Loading document…");
    var task = pdfjsLib.getDocument({ url: src });
    task.onProgress = function (p) {
      if (p && p.total) {
        var pct = Math.min(100, Math.round((p.loaded / p.total) * 100));
        els.statusText.textContent = "Loading document… " + pct + "%";
      }
    };
    task.promise.then(
      function (pdf) {
        state.pdf = pdf;
        state.numPages = pdf.numPages;
        els.pageCount.textContent = String(pdf.numPages);
        els.pageInput.max = String(pdf.numPages);
        buildPageShells().then(function () {
          els.status.hidden = true;
          els.pages.hidden = false;
          applyFitMode();
        });
      },
      function (err) {
        var msg = "This PDF could not be opened.";
        if (err && err.name === "MissingPDFException") {
          msg = "This PDF file could not be found.";
        } else if (err && err.name === "InvalidPDFException") {
          msg = "This file is not a valid PDF.";
        } else if (err && err.name === "PasswordException") {
          msg = "This PDF is password protected and cannot be opened here.";
        }
        showError(msg, true);
      }
    );
  }

  // Create one placeholder per page (sized from page 1's aspect ratio) so
  // the layout doesn't jump as pages render in.
  function buildPageShells() {
    return state.pdf.getPage(1).then(function (firstPage) {
      var baseViewport = firstPage.getViewport({ scale: 1 });
      var ratio = baseViewport.height / baseViewport.width;
      els.pages.innerHTML = "";
      state.pageEls = [];

      for (var i = 1; i <= state.numPages; i++) {
        var container = document.createElement("div");
        container.className = "reader-page";
        container.dataset.pageNumber = String(i);
        container.style.aspectRatio = "1 / " + ratio;

        var canvas = document.createElement("canvas");
        container.appendChild(canvas);

        var label = document.createElement("span");
        label.className = "reader-page-label";
        label.textContent = "Page " + i;
        container.appendChild(label);

        els.pages.appendChild(container);
        state.pageEls.push({ container: container, canvas: canvas, rendered: false, task: null });
      }

      setupObserver();
      return true;
    });
  }

  function pageWidthScale(page) {
    var vp = page.getViewport({ scale: 1 });
    var available = els.viewport.clientWidth - 32;
    return Math.max(0.1, available / vp.width);
  }

  function pageFitScale(page) {
    var vp = page.getViewport({ scale: 1 });
    var availW = els.viewport.clientWidth - 32;
    var availH = els.viewport.clientHeight - 32;
    return Math.max(0.1, Math.min(availW / vp.width, availH / vp.height));
  }

  function applyFitMode() {
    if (!state.pdf || !state.fitMode) return;
    state.pdf.getPage(1).then(function (page) {
      state.scale =
        state.fitMode === "page" ? pageFitScale(page) : pageWidthScale(page);
      updateZoomLabel();
      rerenderAllVisible();
    });
  }

  function updateZoomLabel() {
    els.zoomLevel.textContent = Math.round(state.scale * 100) + "%";
  }

  function queueRender(index) {
    var entry = state.pageEls[index];
    if (!entry) return;
    if (entry.task) {
      entry.task.cancel();
      entry.task = null;
    }
    entry.rendered = false;
    if (state.renderQueue.indexOf(index) === -1) state.renderQueue.push(index);
    pumpQueue();
  }

  function pumpQueue() {
    if (state.renderBusy || state.renderQueue.length === 0) return;
    // Prioritise the page closest to what's currently in view.
    state.renderQueue.sort(function (a, b) {
      return Math.abs(a + 1 - state.currentPage) - Math.abs(b + 1 - state.currentPage);
    });
    var index = state.renderQueue.shift();
    var entry = state.pageEls[index];
    if (!entry) {
      pumpQueue();
      return;
    }
    state.renderBusy = true;

    state.pdf.getPage(index + 1).then(function (page) {
      var viewport = page.getViewport({ scale: state.scale * (window.devicePixelRatio || 1) });
      var canvas = entry.canvas;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = "100%";
      canvas.style.height = "auto";

      var ctx = canvas.getContext("2d");
      var task = page.render({ canvasContext: ctx, viewport: viewport });
      entry.task = task;
      task.promise.then(
        function () {
          entry.rendered = true;
          entry.task = null;
          state.renderBusy = false;
          pumpQueue();
        },
        function (err) {
          entry.task = null;
          state.renderBusy = false;
          if (err && err.name !== "RenderingCancelledException") {
            // Leave the placeholder visible rather than a broken canvas.
          }
          pumpQueue();
        }
      );
    });
  }

  function rerenderAllVisible() {
    state.pageEls.forEach(function (entry, i) {
      var rect = entry.container.getBoundingClientRect();
      var inView = rect.bottom > -400 && rect.top < window.innerHeight + 400;
      if (inView) queueRender(i);
      else entry.rendered = false;
    });
  }

  var observer;
  function setupObserver() {
    if (observer) observer.disconnect();
    observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          var index = parseInt(e.target.dataset.pageNumber, 10) - 1;
          if (e.isIntersecting) {
            var entry = state.pageEls[index];
            if (entry && !entry.rendered) queueRender(index);
            if (e.intersectionRatio > 0.5) {
              state.currentPage = index + 1;
              els.pageInput.value = String(state.currentPage);
            }
          }
        });
      },
      { root: els.viewport, rootMargin: "600px 0px", threshold: [0, 0.5] }
    );
    state.pageEls.forEach(function (entry) {
      observer.observe(entry.container);
    });
  }

  function goToPage(n) {
    n = Math.max(1, Math.min(state.numPages, n));
    var entry = state.pageEls[n - 1];
    if (!entry) return;
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    entry.container.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  els.prev.addEventListener("click", function () {
    goToPage(state.currentPage - 1);
  });
  els.next.addEventListener("click", function () {
    goToPage(state.currentPage + 1);
  });
  els.pageInput.addEventListener("change", function () {
    var n = parseInt(els.pageInput.value, 10);
    if (!isNaN(n)) goToPage(n);
  });

  function setZoom(scale) {
    state.fitMode = null;
    state.scale = Math.max(0.25, Math.min(4, scale));
    updateZoomLabel();
    rerenderAllVisible();
  }
  els.zoomIn.addEventListener("click", function () {
    setZoom(state.scale * 1.2);
  });
  els.zoomOut.addEventListener("click", function () {
    setZoom(state.scale / 1.2);
  });
  els.fitWidth.addEventListener("click", function () {
    state.fitMode = "width";
    applyFitMode();
  });
  els.fitPage.addEventListener("click", function () {
    state.fitMode = "page";
    applyFitMode();
  });

  document.addEventListener("keydown", function (e) {
    if (document.activeElement === els.pageInput) return;
    if (e.key === "ArrowRight") els.next.click();
    else if (e.key === "ArrowLeft") els.prev.click();
    else if (e.key === "+" || e.key === "=") els.zoomIn.click();
    else if (e.key === "-" || e.key === "_") els.zoomOut.click();
  });

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyFitMode, 200);
  });

  loadDocument();
})();
