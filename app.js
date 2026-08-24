/* ══════════════════════════════════════════════════════════════════
   Audioguía — Teatro Español de Azul
   Toda la lógica. El contenido editable vive en content.json.
   ══════════════════════════════════════════════════════════════════ */

const CONTENT_URL = "content.json";

let SITE = null, LANGS = [], SECTIONS = [];
let lang = null, activeItem = null, activeSection = null;
let sliderIdx = 0;
let flatItems = [];          // recorrido lineal, para prev/next y para los QR numéricos

const $ = id => document.getElementById(id);
const t = obj => (obj && typeof obj === "object") ? (obj[lang] || obj.es || "") : (obj || "");

function fmt(s) { s = isNaN(s) ? 0 : s; return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`; }

const PLAY_SVG  = `<svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor"><path d="M0 0L16 9L0 18V0Z"/></svg>`;
const PAUSE_SVG = `<svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor"><rect width="5" height="18" rx="1"/><rect x="9" width="5" height="18" rx="1"/></svg>`;

const EXPLORE_LABEL = { es: "Ver ítems del circuito", en: "Explore this circuit", pt: "Ver itens do circuito", fr: "Explorer ce circuit" };

/* ── ARRANQUE ───────────────────────────────────────────────────── */

async function boot() {
  let data;
  try {
    const res = await fetch(CONTENT_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    showFatal(
      location.protocol === "file:"
        ? "Esta audioguía tiene que abrirse desde un servidor web, no haciendo doble clic en el archivo. Subila al hosting y entrá por la URL."
        : "No se pudo cargar el contenido (content.json). Verificá que el archivo esté junto a index.html."
    );
    console.error("Error cargando el contenido:", err);
    return;
  }

  SITE     = data.site || {};
  LANGS    = data.langs || [];
  SECTIONS = data.sections || [];

  if (!SECTIONS.length || !SECTIONS[0].items || !SECTIONS[0].items.length) {
    showFatal("El contenido está vacío. Revisá content.json.");
    return;
  }

  flatItems = SECTIONS.flatMap(s => s.items.map(it => ({ item: it, section: s })));

  if (SITE.splashBg) $("splash-bg").style.backgroundImage = `url('${SITE.splashBg}')`;

  initSplash();

  const saved = localStorage.getItem("audioguia_lang");
  if (saved && LANGS.some(l => l.code === saved)) selectLang(saved);
}

function showFatal(msg) {
  $("fatal-error-msg").textContent = msg;
  $("fatal-error").hidden = false;
  $("splash").style.display = "none";
}

/* ── RUTEO (QR) ─────────────────────────────────────────────────────
   Acepta:
     #01 #1 #14     → número de parada dentro del recorrido (lo que dicen los QR)
     #a01           → id interno del ítem
     #historico     → id de circuito
     ?id=01         → misma lógica, por si algún QR usa query en vez de hash
   ─────────────────────────────────────────────────────────────────── */

function resolveTarget(raw) {
  if (!raw) return null;
  const key = String(raw).replace(/^#/, "").trim().toLowerCase();
  if (!key) return null;

  if (/^\d{1,3}$/.test(key)) {
    const n = parseInt(key, 10);
    return (n >= 1 && n <= flatItems.length) ? flatItems[n - 1] : null;
  }

  const byId = flatItems.find(e => e.item.id.toLowerCase() === key);
  if (byId) return byId;

  const sec = SECTIONS.find(s => s.id.toLowerCase() === key);
  if (sec) return { item: sec.items[0], section: sec, isSection: true };

  return null;
}

function initialTarget() {
  const qs = new URLSearchParams(location.search).get("id");
  return resolveTarget(location.hash) || resolveTarget(qs);
}

/* ── AUDIO ──────────────────────────────────────────────────────── */

const audio = new Audio();
audio.preload = "metadata";
let audioLoaded = false;

audio.addEventListener("timeupdate", () => {
  if (!audio.duration || !isFinite(audio.duration)) return;
  const pct = (audio.currentTime / audio.duration * 100).toFixed(1);
  $("progress-fill").style.width = pct + "%";
  $("progress-thumb").style.left = `calc(${pct}% - 5px)`;
  $("player-time").textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration)}`;
});

audio.addEventListener("ended", () => {
  $("play-btn").innerHTML = PLAY_SVG;
  $("play-btn").setAttribute("aria-label", "Reproducir");
  $("progress-fill").style.width = "0%";
  $("progress-thumb").style.left = "0%";
  if (activeItem) $("player-time").textContent = `0:00 / ${fmt(audio.duration)}`;
});

audio.addEventListener("loadedmetadata", () => {
  audioLoaded = true;
  $("player-time").textContent = `0:00 / ${fmt(audio.duration)}`;
});

// si el mp3 no existe o no se puede leer, el player queda deshabilitado
// en vez de quedarse colgado en "0:00 / …"
audio.addEventListener("error", () => {
  if (!audio.getAttribute("src")) return;   // src vacío: no es un error real
  disablePlayer();
  console.warn("No se pudo cargar el audio:", audio.getAttribute("src"));
});

function disablePlayer() {
  $("play-btn").disabled = true;
  $("play-btn").innerHTML = PLAY_SVG;
  $("player-time").textContent = "— / —";
  $("progress-track").style.opacity = "0.3";
}

function loadAudio(item) {
  audio.pause();
  audioLoaded = false;
  $("play-btn").innerHTML = PLAY_SVG;
  $("play-btn").setAttribute("aria-label", "Reproducir");
  $("progress-fill").style.width = "0%";
  $("progress-thumb").style.left = "0%";

  const url = item.audioUrl
    ? (typeof item.audioUrl === "object" ? (item.audioUrl[lang] || item.audioUrl.es || "") : item.audioUrl)
    : "";

  if (!url) {
    audio.removeAttribute("src");
    audio.load();
    disablePlayer();
    return;
  }

  audio.src = url;
  audio.load();
  $("play-btn").disabled = false;
  $("player-time").textContent = "0:00 / …";
  $("progress-track").style.opacity = "1";

  // autoplay: funciona porque siempre se dispara desde un gesto del usuario.
  // si el navegador lo bloquea, queda en pausa sin mostrar error.
  audio.play().then(() => {
    $("play-btn").innerHTML = PAUSE_SVG;
    $("play-btn").setAttribute("aria-label", "Pausar");
  }).catch(() => {});
}

/* ── SPLASH / IDIOMA ────────────────────────────────────────────── */

function initSplash() {
  $("splash-eyebrow").textContent = SITE.eyebrow || "";
  $("splash-title").textContent = t(SITE.title);
  $("splash-sub").textContent = t(SITE.subtitle);
  const c = $("splash-langs"); c.innerHTML = "";
  LANGS.forEach(l => {
    const btn = document.createElement("button");
    btn.className = "lang-btn";
    btn.innerHTML = `<span>${l.flag}</span><span>${l.label}</span>`;
    btn.addEventListener("click", () => selectLang(l.code));
    c.appendChild(btn);
  });
}

function selectLang(code) {
  const first = (lang === null);
  lang = code;
  localStorage.setItem("audioguia_lang", code);
  $("splash").classList.add("out");
  $("main").style.cssText = "display:flex;flex-direction:column;";
  $("btn-lang").textContent = code.toUpperCase();
  document.documentElement.lang = code;
  renderMain();

  if (first) {
    const target = initialTarget();
    if (target && !target.isSection) {
      loadItem(target.item, target.section);
    } else {
      const sec = target ? target.section : SECTIONS[0];
      loadItem(sec.items[0], sec);
      if (sec.intro) setTimeout(() => openSectionIntro(sec), 400);
    }
  } else {
    // cambio de idioma en caliente: mismo ítem, audio y textos nuevos
    loadItem(activeItem, activeSection);
  }
}

function showSplash() { $("splash").classList.remove("out"); initSplash(); }

/* ── RENDER ─────────────────────────────────────────────────────── */

function renderMain() {
  $("header-title").textContent = t(SITE.title);
  $("drawer-title").textContent = t(SITE.title);
  $("read-label").textContent = t(SITE.readLabel);
  renderDrawer();
  renderSectionNav();
}

function loadItem(item, section) {
  if (lbOpen) forceCloseLightbox();
  activeItem = item; activeSection = section;
  $("item-section-label").textContent = t(section.label);
  $("item-title").textContent = t(item.title);
  $("read-label").textContent = t(SITE.readLabel);
  loadAudio(item);

  // normalizeMedia() acepta tanto "images/01/01.jpg" como { src, caption }
  const rawMedia = item.media || item.images || [];
  renderMedia(rawMedia.length ? rawMedia : [SITE.fallbackImage]);

  updateNavActive();
  updateDrawerActive();
  updateItemNav();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateItemNav() {
  const idx = flatItems.findIndex(e => e.item.id === activeItem.id);
  const total = flatItems.length;

  $("item-progress").innerHTML =
    `<span class="item-progress-current">${idx + 1}</span> / ${total}`;

  const prevEntry = flatItems[idx - 1] || null;
  const btnPrev = $("btn-prev");
  if (prevEntry) {
    btnPrev.disabled = false;
    $("prev-label").textContent = t(prevEntry.item.title);
    btnPrev.onclick = () => loadItem(prevEntry.item, prevEntry.section);
  } else {
    btnPrev.disabled = true;
    $("prev-label").textContent = "";
    btnPrev.onclick = null;
  }

  const nextEntry = flatItems[idx + 1] || null;
  const btnNext = $("btn-next");
  if (nextEntry) {
    btnNext.disabled = false;
    $("next-label").textContent = t(nextEntry.item.title);
    btnNext.onclick = () => loadItem(nextEntry.item, nextEntry.section);
  } else {
    btnNext.disabled = true;
    $("next-label").textContent = "";
    btnNext.onclick = null;
  }
}

/* ── SLIDER DE MEDIA ────────────────────────────────────────────── */

/* Acepta las dos formas en content.json:
     "images": [ "images/01/01.jpg" ]
     "images": [ { "src": "images/01/01.jpg", "caption": { "es": "...", "en": "..." } } ]  */
function normalizeMedia(entry) {
  if (!entry) return null;
  if (typeof entry === "string") return { type: "image", url: entry, caption: null };
  const url = entry.url || entry.src;
  if (!url) return null;
  return { type: entry.type || "image", url: url, caption: entry.caption || null };
}

let currentMedia = [];   // el media de la parada activa, ya normalizado

function renderMedia(mediaArr) {
  sliderIdx = 0;
  const w = $("slider-wrap");
  w.innerHTML = "";

  // filtra entradas vacías: una coma de más en content.json no rompe los puntitos
  const list = mediaArr.map(normalizeMedia).filter(Boolean);
  if (!list.length) list.push({ type: "image", url: SITE.fallbackImage, caption: null });
  currentMedia = list;

  list.forEach((m, i) => {
    let el;
    if (m.type === "video") {
      el = document.createElement("video");
      el.src = m.url;
      el.autoplay = (i === 0);
      el.muted = true;
      el.loop = true;
      el.playsInline = true;
      el.setAttribute("playsinline", "");
    } else {
      el = document.createElement("img");
      el.src = m.url;
      el.alt = "";
      // solo la primera se carga ya; el resto cuando el visitante desliza
      el.loading = i === 0 ? "eager" : "lazy";
      el.decoding = "async";
      el.addEventListener("error", () => {
        if (SITE.fallbackImage && el.src.indexOf(SITE.fallbackImage) === -1) {
          el.src = SITE.fallbackImage;         // falta la foto: no mostramos el ícono roto
        } else {
          el.style.visibility = "hidden";
        }
      });
    }
    el.className = "slide" + (i === 0 ? " active" : "");
    w.appendChild(el);
  });

  if (list.length > 1) {
    const prev = document.createElement("button");
    prev.className = "slider-nav prev"; prev.textContent = "‹";
    prev.setAttribute("aria-label", "Imagen anterior");
    prev.addEventListener("click", () => moveSlide(-1));

    const next = document.createElement("button");
    next.className = "slider-nav next"; next.textContent = "›";
    next.setAttribute("aria-label", "Imagen siguiente");
    next.addEventListener("click", () => moveSlide(1));

    const dots = document.createElement("div");
    dots.className = "slider-dots"; dots.id = "slider-dots";
    list.forEach((_, i) => {
      const d = document.createElement("button");
      d.className = "slider-dot" + (i === 0 ? " active" : "");
      d.setAttribute("aria-label", `Imagen ${i + 1}`);
      d.addEventListener("click", () => goSlide(i));
      dots.appendChild(d);
    });

    w.appendChild(prev); w.appendChild(next); w.appendChild(dots);
  }

  // epígrafe
  const cap = document.createElement("div");
  cap.className = "slide-caption";
  cap.id = "slide-caption";
  w.appendChild(cap);

  // botón de ampliar
  const exp = document.createElement("button");
  exp.className = "slider-expand";
  exp.setAttribute("aria-label", "Ver a pantalla completa");
  exp.innerHTML = `<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5 1H1v4M9 1h4v4M5 13H1V9M9 13h4V9"/></svg>`;
  exp.addEventListener("click", e => { e.stopPropagation(); openLightbox(sliderIdx); });
  w.appendChild(exp);

  updateCaption();
}

function captionOf(m) {
  if (!m || !m.caption) return "";
  return (typeof m.caption === "object" ? (m.caption[lang] || m.caption.es || "") : m.caption).trim();
}

function updateCaption() {
  const el = $("slide-caption");
  if (!el) return;
  const txt = captionOf(currentMedia[sliderIdx]);
  el.innerHTML = "";
  if (txt) { const sp = document.createElement("span"); sp.textContent = txt; el.appendChild(sp); }
  // sin epígrafe no dibujamos el degradado encima de la foto
  el.style.display = txt ? "" : "none";
  $("slider-wrap").classList.toggle("has-caption", !!txt);
}

function goSlide(idx) {
  const slides = $("slider-wrap").querySelectorAll(".slide");
  const dots   = $("slider-wrap").querySelectorAll(".slider-dot");
  if (!slides.length) return;
  idx = ((idx % slides.length) + slides.length) % slides.length;

  const leaving = slides[sliderIdx];
  if (leaving && leaving.tagName === "VIDEO") leaving.pause();

  if (slides[sliderIdx]) slides[sliderIdx].classList.remove("active");
  if (dots[sliderIdx]) dots[sliderIdx].classList.remove("active");

  sliderIdx = idx;
  slides[sliderIdx].classList.add("active");
  if (dots[sliderIdx]) dots[sliderIdx].classList.add("active");

  const entering = slides[sliderIdx];
  if (entering && entering.tagName === "VIDEO") entering.play().catch(() => {});

  updateCaption();
}

function moveSlide(dir) {
  const s = $("slider-wrap").querySelectorAll(".slide");
  if (s.length < 2) return;
  goSlide(sliderIdx + dir);
}

/* ── SWIPE ──────────────────────────────────────────────────────── */

let touchStartX = null, touchStartY = null;

$("slider-wrap").addEventListener("touchstart", e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

$("slider-wrap").addEventListener("touchend", e => {
  if (touchStartX === null) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  touchStartX = touchStartY = null;

  if (e.target.closest("button")) return;          // flechas, puntitos, ampliar

  if (Math.abs(dx) >= 50) { moveSlide(dx < 0 ? 1 : -1); return; }
  // toque quieto sobre la foto: abre el visor
  if (Math.abs(dx) < 10 && Math.abs(dy) < 10) openLightbox(sliderIdx);
}, { passive: true });

// mismo gesto en desktop
$("slider-wrap").addEventListener("click", e => {
  if (e.target.closest("button")) return;
  if (e.target.tagName === "IMG") openLightbox(sliderIdx);
});

/* ── VISOR A PANTALLA COMPLETA ──────────────────────────────────── */

let lbIdx = 0, lbOpen = false, lbOpenedAt = 0;

function openLightbox(idx) {
  if (!currentMedia.length) return;
  lbIdx = idx;
  lbOpen = true;
  lbOpenedAt = Date.now();

  const lb = $("lightbox");
  lb.hidden = false;
  requestAnimationFrame(() => lb.classList.add("open"));
  document.body.style.overflow = "hidden";

  buildLbDots();
  showLbImage();
}

function closeLightbox() {
  if (!lbOpen) return;
  lbOpen = false;
  const lb = $("lightbox");
  lb.classList.remove("open");
  document.body.style.overflow = "";
  setTimeout(() => { if (!lbOpen) lb.hidden = true; }, 260);
  goSlide(lbIdx);   // el carrusel queda donde lo dejó el visitante
}

// cierre inmediato, sin tocar el carrusel (se usa al cambiar de parada)
function forceCloseLightbox() {
  lbOpen = false;
  const lb = $("lightbox");
  lb.classList.remove("open");
  lb.hidden = true;
  document.body.style.overflow = "";
}

function buildLbDots() {
  const dots = $("lb-dots");
  dots.innerHTML = "";
  if (currentMedia.length < 2) return;
  currentMedia.forEach((_, i) => {
    const d = document.createElement("button");
    d.className = "lb-dot" + (i === lbIdx ? " active" : "");
    d.setAttribute("aria-label", `Imagen ${i + 1}`);
    d.addEventListener("click", () => { lbIdx = i; showLbImage(); });
    dots.appendChild(d);
  });
}

function showLbImage() {
  const m = currentMedia[lbIdx];
  if (!m) return;

  const img = $("lb-img");
  img.classList.add("loading");
  img.onload = img.onerror = () => img.classList.remove("loading");
  img.src = m.url;

  $("lb-caption").textContent = captionOf(m);
  $("lb-counter").textContent = currentMedia.length > 1
    ? `${lbIdx + 1} / ${currentMedia.length}` : "";

  const solo = currentMedia.length < 2;
  $("lb-prev").hidden = solo;
  $("lb-next").hidden = solo;

  $("lb-dots").querySelectorAll(".lb-dot")
    .forEach((d, i) => d.classList.toggle("active", i === lbIdx));

  // precarga vecinos para que el siguiente toque sea instantáneo
  [lbIdx + 1, lbIdx - 1].forEach(i => {
    const n = currentMedia[(i + currentMedia.length) % currentMedia.length];
    if (n && n.url !== m.url) { const p = new Image(); p.src = n.url; }
  });
}

function moveLb(dir) {
  if (currentMedia.length < 2) return;
  lbIdx = (lbIdx + dir + currentMedia.length) % currentMedia.length;
  showLbImage();
}

$("lb-close").addEventListener("click", closeLightbox);
$("lb-prev").addEventListener("click", () => moveLb(-1));
$("lb-next").addEventListener("click", () => moveLb(1));

// Al abrir con un toque, el navegador dispara un click sintético justo después,
// en las mismas coordenadas y ya sobre el visor: sin esta guarda, el visor se
// abriría y se cerraría solo.
$("lightbox").addEventListener("click", e => {
  if (Date.now() - lbOpenedAt < 400) { e.stopPropagation(); e.preventDefault(); }
}, true);

// toque en el fondo (no en la foto) cierra
$("lb-stage").addEventListener("click", e => {
  if (e.target.id === "lb-stage") closeLightbox();
});

document.addEventListener("keydown", e => {
  if (!lbOpen) return;
  if (e.key === "Escape") closeLightbox();
  else if (e.key === "ArrowRight") moveLb(1);
  else if (e.key === "ArrowLeft") moveLb(-1);
});

let lbTouchX = null, lbTouchY = null;
$("lb-stage").addEventListener("touchstart", e => {
  if (e.touches.length > 1) { lbTouchX = null; return; }   // no interferir con el zoom
  lbTouchX = e.touches[0].clientX;
  lbTouchY = e.touches[0].clientY;
}, { passive: true });

$("lb-stage").addEventListener("touchend", e => {
  if (lbTouchX === null) return;
  const dx = e.changedTouches[0].clientX - lbTouchX;
  const dy = e.changedTouches[0].clientY - lbTouchY;
  lbTouchX = lbTouchY = null;
  if (e.target.closest("button")) return;
  if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy)) moveLb(dx < 0 ? 1 : -1);
  else if (dy >= 90 && Math.abs(dy) > Math.abs(dx)) closeLightbox();   // deslizar hacia abajo cierra
}, { passive: true });

/* ── CONTROLES DEL PLAYER ───────────────────────────────────────── */

$("play-btn").addEventListener("click", () => {
  if (audio.paused) {
    audio.play().then(() => {
      $("play-btn").innerHTML = PAUSE_SVG;
      $("play-btn").setAttribute("aria-label", "Pausar");
    }).catch(() => {});
  } else {
    audio.pause();
    $("play-btn").innerHTML = PLAY_SVG;
    $("play-btn").setAttribute("aria-label", "Reproducir");
  }
});

$("progress-track").addEventListener("click", e => {
  if (!audio.duration || !isFinite(audio.duration)) return;
  const r = e.currentTarget.getBoundingClientRect();
  audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
});

/* ── NAV INLINE ─────────────────────────────────────────────────── */

function renderSectionNav() {
  const nav = $("section-nav"); nav.innerHTML = "";
  let globalNum = 1;

  SECTIONS.forEach(section => {
    const h = document.createElement("div");
    h.className = "section-nav-heading";
    h.id = section.id;
    h.textContent = t(section.label);
    if (section.intro) h.addEventListener("click", () => openSectionIntro(section));
    nav.appendChild(h);

    let lastGroup = null;
    section.items.forEach(item => {
      const num = globalNum++;
      if (item.group) {
        const g = t(item.group);
        if (g !== lastGroup) {
          lastGroup = g;
          const sep = document.createElement("div");
          sep.className = "nav-group-sep";
          sep.textContent = g;
          nav.appendChild(sep);
        }
      }
      const btn = document.createElement("button");
      btn.className = "nav-item";
      btn.dataset.itemId = item.id;
      btn.innerHTML = `<span class="nav-num">${num}</span><span class="nav-item-label">${t(item.title)}</span><span class="nav-item-dur">${item.duration || ""}</span>`;
      btn.addEventListener("click", () => loadItem(item, section));
      nav.appendChild(btn);
    });
  });
}

function updateNavActive() {
  $("section-nav").querySelectorAll(".nav-item")
    .forEach(b => b.classList.toggle("active", b.dataset.itemId === activeItem.id));
}

/* ── POPUP INTRO DE CIRCUITO ────────────────────────────────────── */

function openSectionIntro(section) {
  $("section-popup-eyebrow").textContent = t(SITE.title);
  $("section-popup-title").textContent = t(section.label);
  $("section-popup-body").textContent = t(section.intro);
  $("section-popup-cta-label").textContent = EXPLORE_LABEL[lang] || EXPLORE_LABEL.es;
  $("section-popup-overlay").classList.add("open");

  $("section-popup-cta").onclick = () => {
    $("section-popup-overlay").classList.remove("open");
    const el = document.getElementById(section.id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
}

$("section-popup-close").addEventListener("click", () => $("section-popup-overlay").classList.remove("open"));
$("section-popup-overlay").addEventListener("click", e => {
  if (e.target === $("section-popup-overlay")) $("section-popup-overlay").classList.remove("open");
});

/* ── DRAWER ─────────────────────────────────────────────────────── */

function renderDrawer() {
  const body = $("drawer-body"); body.innerHTML = "";
  let globalNum = 1;

  SECTIONS.forEach(section => {
    const lbl = document.createElement("div");
    lbl.className = "drawer-section-label";
    lbl.textContent = t(section.label);
    body.appendChild(lbl);

    let lastGroup = null;
    section.items.forEach(item => {
      const num = globalNum++;
      if (item.group) {
        const g = t(item.group);
        if (g !== lastGroup) {
          lastGroup = g;
          const sep = document.createElement("div");
          sep.className = "drawer-group-sep";
          sep.textContent = g;
          body.appendChild(sep);
        }
      }
      const btn = document.createElement("button");
      btn.className = "drawer-item";
      btn.dataset.itemId = item.id;
      btn.innerHTML = `<span class="drawer-item-num">${num}</span><span class="drawer-item-text">${t(item.title)}</span><span class="drawer-item-dur">${item.duration || ""}</span>`;
      btn.addEventListener("click", () => { loadItem(item, section); closeDrawer(); });
      body.appendChild(btn);
    });
  });
}

function updateDrawerActive() {
  $("drawer-body").querySelectorAll(".drawer-item")
    .forEach(b => b.classList.toggle("active", b.dataset.itemId === activeItem.id));
}

function openDrawer()  { $("drawer").classList.add("open");    $("drawer-overlay").classList.add("open"); }
function closeDrawer() { $("drawer").classList.remove("open"); $("drawer-overlay").classList.remove("open"); }

$("btn-menu").addEventListener("click", openDrawer);
$("btn-close-drawer").addEventListener("click", closeDrawer);
$("drawer-overlay").addEventListener("click", closeDrawer);

/* ── POPUP TEXTO COMPLETO ───────────────────────────────────────── */

$("read-btn").addEventListener("click", () => {
  if (!activeItem) return;
  $("popup-eyebrow").textContent = t(activeSection.label);
  $("popup-title").textContent = t(activeItem.title);
  $("popup-body").textContent = t(activeItem.text);
  $("popup-overlay").classList.add("open");
});

$("popup-close").addEventListener("click", () => $("popup-overlay").classList.remove("open"));
$("popup-overlay").addEventListener("click", e => {
  if (e.target === $("popup-overlay")) $("popup-overlay").classList.remove("open");
});

/* ── CAMBIO DE IDIOMA ───────────────────────────────────────────── */

$("btn-lang").addEventListener("click", showSplash);
$("splash-dismiss").addEventListener("click", () => {
  if (lang) $("splash").classList.add("out");   // solo si ya eligió idioma alguna vez
});

/* ── HASH ───────────────────────────────────────────────────────── */

window.addEventListener("hashchange", () => {
  if (!lang) return;
  const target = resolveTarget(location.hash);
  if (target) {
    loadItem(target.item, target.section);
    if (target.isSection && target.section.intro) openSectionIntro(target.section);
    return;
  }
  const el = document.getElementById(location.hash.replace("#", ""));
  if (el) el.scrollIntoView({ behavior: "smooth" });
});

boot();
