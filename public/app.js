(() => {
  const cfg = window.QUINIELA_CONFIG;
  const $ = (id) => document.getElementById(id);
  let lang = localStorage.getItem("lang") || cfg.defaultLang;
  if (!window.I18N[lang]) lang = cfg.defaultLang;
  let board = {}; // { "YYYY-MM-DD": [{name}] }
  let selected = null;

  const parentsText = () => cfg.parents.join(` ${window.I18N[lang].and} `);
  const t = (key, vars = {}) =>
    window.I18N[lang][key].replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : k === "parents" ? parentsText() : `{${k}}`));
  const locale = () => ({ es: "es-MX", en: "en-US", fil: "fil-PH" })[lang];
  const parse = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const fmt = (s) => parse(s).toLocaleDateString(locale(), { dateStyle: "long" });
  const short = (d) => d.toLocaleDateString(locale(), { month: "short", day: "numeric" });
  const weekday = (d) => d.toLocaleDateString(locale(), { weekday: "long" });
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function setMsg(text, kind) { const m = $("msg"); m.textContent = text; m.className = kind || ""; }

  function renderText() {
    document.documentElement.lang = lang;
    ["title", "subtitle", "step1", "step2", "footer"].forEach((k) => ($(k).textContent = t(k)));
    $("legend").textContent = t("legend", { max: cfg.maxPerDate });
    $("viewCal").textContent = t("viewCal");
    $("viewList").textContent = t("viewList");
    $("nameLabel").textContent = t("name");
    $("emailLabel").textContent = t("email");
    $("submit").textContent = t("submit");
    $("selected").textContent = selected ? t("selected", { date: fmt(selected) }) : t("none");
    document.title = t("title");
    $("barText").textContent = selected ? fmt(selected) : "";
    $("barGo").textContent = t("continue");
    $("bar").hidden = !selected || formVisible;
    renderCountdown();
  }


  function renderCountdown() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const n = Math.round((parse(cfg.dueDate) - today) / 86400000);
    $("countdown").textContent = n > 1 ? t("countdown", { n }) : n === 1 ? t("countdownOne") : n === 0 ? t("countdownToday") : t("countdownPast");
  }

  function confetti() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = $("confetti"), ctx = cv.getContext("2d");
    cv.width = innerWidth; cv.height = innerHeight;
    const colors = ["#4f7cff", "#7a5cff", "#ff7ab6", "#ffc233", "#3ccf91"];
    const ps = Array.from({ length: 140 }, () => ({
      x: cv.width / 2, y: cv.height / 3, vx: (Math.random() - 0.5) * 16, vy: Math.random() * -14 - 4,
      s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: colors[(Math.random() * colors.length) | 0]
    }));
    let frames = 0;
    (function tick() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ps.forEach((p) => {
        p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); ctx.restore();
      });
      if (++frames < 150) requestAnimationFrame(tick); else ctx.clearRect(0, 0, cv.width, cv.height);
    })();
  }
  function renderBoard() { renderList(); renderCalendar(); }

  // ---- Calendar view ----
  let view = "cal";
  let detailDate = null;
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  function applyView() {
    $("calendar").hidden = view !== "cal";
    $("listView").hidden = view !== "list";
    $("viewCal").setAttribute("aria-pressed", String(view === "cal"));
    $("viewList").setAttribute("aria-pressed", String(view === "list"));
  }

  function renderCalendar() {
    const root = $("calGrid");
    root.textContent = "";
    const start = parse(cfg.startDate), end = parse(cfg.endDate);
    const dows = [...Array(7)].map((_, i) => new Date(2023, 0, 1 + i).toLocaleDateString(locale(), { weekday: "narrow" }));
    for (let m = new Date(start.getFullYear(), start.getMonth(), 1); m <= end; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
      const wrap = mk("div", "cal-month");
      wrap.append(mk("h3", "cal-title", cap(m.toLocaleDateString(locale(), { month: "long", year: "numeric" }))));
      const grid = mk("div", "cal-grid");
      dows.forEach((d) => grid.append(mk("div", "cal-dow", d)));
      for (let i = 0; i < m.getDay(); i++) grid.append(mk("div"));
      const last = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      for (let day = 1; day <= last; day++) {
        const date = new Date(m.getFullYear(), m.getMonth(), day);
        if (date < start || date > end) { grid.append(mk("div")); continue; }
        const key = iso(date);
        const n = (board[key] || []).length;
        const full = n >= cfg.maxPerDate;
        const b = mk("button", "cal-day" + (full ? " full" : "") + (key === cfg.dueDate ? " due" : "") + (key === selected ? " sel" : "") + (key === detailDate ? " detail" : ""));
        b.type = "button";
        b.dataset.key = key;
        b.setAttribute("aria-pressed", String(key === selected));
        b.setAttribute("aria-label", `${fmt(key)}, ${t("calOf", { n, max: cfg.maxPerDate })}${full ? `, ${t("full")}` : ""}${key === cfg.dueDate ? `, ${t("dueDate")}` : ""}`);
        b.append(mk("span", "n", String(day)));
        const dots = mk("span", "dots");
        for (let i = 0; i < cfg.maxPerDate; i++) dots.append(mk("i", i < n ? "on" : ""));
        b.append(dots);
        if (key === cfg.dueDate) b.append(mk("span", "flag", "🍼"));
        b.addEventListener("click", () => {
          detailDate = key;
          const changed = !full && selected !== key;
          if (!full) selected = key;
          renderText(); renderBoard();
          if (changed) { const s = $("selected"); s.classList.remove("flash"); void s.offsetWidth; s.classList.add("flash"); }
          root.querySelector(`[data-key="${key}"]`)?.focus({ preventScroll: true });
        });
        grid.append(b);
      }
      wrap.append(grid);
      root.append(wrap);
    }
    renderDetail();
  }

  function renderDetail() {
    const box = $("calDetail");
    box.textContent = "";
    if (!detailDate) { box.append(mk("p", "muted", t("calHint"))); return; }
    const names = (board[detailDate] || []).map((g) => g.name);
    const head = mk("div", "cal-detail-head");
    head.append(mk("strong", null, t("calWho", { date: fmt(detailDate) })));
    head.append(mk("span", "chip" + (names.length >= cfg.maxPerDate ? " chip-warn" : ""), names.length >= cfg.maxPerDate ? t("full") : t("calOf", { n: names.length, max: cfg.maxPerDate })));
    box.append(head);
    if (!names.length) { box.append(mk("p", "muted", t("calNobody"))); return; }
    const ul = mk("ul", "cal-names");
    names.forEach((n) => ul.append(mk("li", null, n)));
    box.append(ul);
  }

  $("viewCal").addEventListener("click", () => { view = "cal"; applyView(); });
  $("viewList").addEventListener("click", () => { view = "list"; applyView(); });

  function renderList() {
    const body = $("rows");
    const settled = body.classList.contains("settled");
    body.textContent = "";
    for (let d = parse(cfg.startDate); d <= parse(cfg.endDate); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      const key = iso(d);
      const guesses = board[key] || [];
      const full = guesses.length >= cfg.maxPerDate;
      const tr = document.createElement("tr");
      tr.setAttribute("role", "row");
      if (!settled) tr.style.animationDelay = `${Math.min(body.children.length * 25, 900)}ms`;
      if (key === cfg.dueDate) tr.className = "due";
      if (key === selected) tr.className += " sel";

      const cells = [short(d), cap(weekday(d))].map((txt, i) => { const td = document.createElement("td"); td.className = i ? "c-day" : "c-date"; td.textContent = txt; return td; });
      const who = document.createElement("td");
      who.textContent = guesses.map((g) => g.name).join(", ");
      if (key === cfg.dueDate) who.textContent = ["🍼 " + t("dueDate"), who.textContent].filter(Boolean).join(" • ");
      who.className = "c-who";
      const act = document.createElement("td");
      act.className = "c-act";
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pick";
      b.disabled = full;
      b.textContent = full ? t("full") : key === selected ? t("picked") : t("pick");
      b.setAttribute("aria-pressed", String(key === selected));
      b.setAttribute("aria-label", `${t("pick")}: ${fmt(key)}`);
      b.addEventListener("click", () => {
        selected = key; $("rows").classList.add("settled"); renderText(); renderBoard();
        const s = $("selected"); s.classList.remove("flash"); void s.offsetWidth; s.classList.add("flash");
      });
      act.append(b);
      [...cells, who, act].forEach((td) => td.setAttribute("role", "cell"));
      tr.append(...cells, who, act);
      body.append(tr);
    }
  }

  async function loadBoard() {
    try {
      const r = await fetch("/api/guesses");
      board = (await r.json()).board || {};
    } catch { board = {}; }
    $("rows").classList.add("settled");
    renderBoard();
  }

  $("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg("");
    const name = $("name").value.trim(), email = $("email").value.trim();
    if (!selected || !name || !/^\S+@\S+\.\S+$/.test(email)) return setMsg(t("errInvalid"), "error");
    $("submit").disabled = true;
    const chosen = selected;
    try {
      const r = await fetch("/api/guesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, guessDate: chosen, lang })
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        setMsg(t("ok", { date: fmt(chosen) }), "ok");
        confetti();
        $("form").reset();
        selected = null;
      } else if (data.code === "date_full") setMsg(t("errFull"), "error");
      else if (data.code === "duplicate") setMsg(t("errDup"), "error");
      else if (data.code === "invalid") setMsg(t("errInvalid"), "error");
      else setMsg(t("errGeneric"), "error");
    } catch { setMsg(t("errGeneric"), "error"); }
    $("submit").disabled = false;
    renderText();
    loadBoard();
  });

  let formVisible = false;
  $("barGo").addEventListener("click", () => {
    $("formSection").scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => $("name").focus({ preventScroll: true }), 500);
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { formVisible = e.isIntersecting; $("bar").hidden = !selected || formVisible; }, { threshold: 0.35 })
      .observe($("formSection"));
  }

  const names = Object.fromEntries(Object.entries(window.I18N).map(([code, v]) => [code, v.langName]));
  const switcher = LangSwitch.init($("lang"), {
    names, value: lang,
    onChange: (code) => {
      lang = code;
      localStorage.setItem("lang", lang);
      renderTableHead(); renderText(); renderBoard();
    }
  });

  // ---- Welcome screen (first visit): pick a language before anything else ----
  const welcome = $("welcome");
  const pageParts = ["header", "main", "footer"].map((s) => document.querySelector(s));
  const setInert = (on) => pageParts.forEach((p) => p && (on ? p.setAttribute("inert", "") : p.removeAttribute("inert")));

  if (document.documentElement.classList.contains("no-lang")) {
    setInert(true);
    welcome.querySelector(".choice").focus({ preventScroll: true });
  }

  welcome.addEventListener("click", (e) => {
    const b = e.target.closest(".choice");
    if (!b) return;
    lang = b.dataset.code;
    localStorage.setItem("lang", lang);
    switcher.set(lang);
    renderTableHead(); renderText(); renderBoard();
    welcome.classList.add("leaving");
    setTimeout(() => {
      document.documentElement.classList.remove("no-lang");
      welcome.classList.remove("leaving");
      setInert(false);
      window.scrollTo(0, 0);
    }, 450);
  });

  function renderTableHead() {
    ["colDate", "colDay", "colWho"].forEach((k) => ($(k).textContent = t(k)));
  }

  applyView();
  renderTableHead();
  renderText();
  renderBoard();
  loadBoard();
})();
