(() => {
  const MAX = 3;
  const $ = (id) => document.getElementById(id);

  const TXT = {
    es: {
      langName: "Español", title: "Panel de administración", subtitle: "Mira cómo va la quiniela y avisa a los ganadores",
      tokenLabel: "Clave de administrador", enter: "Entrar", logout: "Salir", checking: "Verificando…",
      badToken: "Clave incorrecta. Revisa que no tenga espacios.", generic: "Algo salió mal. Intenta de nuevo.",
      summary: "Resumen", sBets: "Apuestas", sDates: "Fechas con apuestas", sFull: "Fechas llenas",
      emailOk: "Correos listos para enviar desde {from}", emailOff: "Correos sin configurar: faltan RESEND_API_KEY y FROM_EMAIL en Vercel",
      winners: "Ganadores", birth: "Fecha de nacimiento del bebé", search: "Buscar ganadores",
      none: "Nadie apostó el {date}.", found: "{n} ganador(es) el {date}", send: "Enviar correo a {n} ganador(es)", sending: "Enviando…",
      confirmTitle: "¿Enviar correos?", confirmText: "Se enviará un correo a {n} persona(s) por el {date}. No se puede deshacer.",
      cancel: "Cancelar", confirm: "Sí, enviar", sentOk: "Enviado", sentFail: "No se pudo enviar",
      allSent: "Listo: {sent} de {total} correos enviados.", someFailed: "Se enviaron {sent} de {total}. Revisa los errores abajo.",
      notConfigured: "El envío de correos no está configurado todavía. Agrega RESEND_API_KEY y FROM_EMAIL en Vercel y redespliega.",
      sandboxHint: "Si usas Resend sin dominio propio, solo puede enviar al correo con el que creaste tu cuenta de Resend.",
      all: "Todas las apuestas", csv: "Descargar CSV", empty: "Aún no hay apuestas.", spots: "{n}/{max} lugares",
      msgsTitle: "💌 Mensajes para los papás", msgsEmpty: "Aún no hay mensajes.", msgsCsv: "Descargar mensajes (CSV)", del: "Borrar", delConfirm: "¿Seguro?"
    },
    en: {
      langName: "English", title: "Admin panel", subtitle: "See how the pool is going and notify the winners",
      tokenLabel: "Admin key", enter: "Sign in", logout: "Sign out", checking: "Checking…",
      badToken: "Wrong key. Make sure it has no extra spaces.", generic: "Something went wrong. Please try again.",
      summary: "Summary", sBets: "Guesses", sDates: "Dates with guesses", sFull: "Full dates",
      emailOk: "Emails ready to send from {from}", emailOff: "Emails not configured: RESEND_API_KEY and FROM_EMAIL are missing in Vercel",
      winners: "Winners", birth: "Baby's birth date", search: "Find winners",
      none: "Nobody guessed {date}.", found: "{n} winner(s) on {date}", send: "Email {n} winner(s)", sending: "Sending…",
      confirmTitle: "Send emails?", confirmText: "An email will be sent to {n} person(s) for {date}. This cannot be undone.",
      cancel: "Cancel", confirm: "Yes, send", sentOk: "Sent", sentFail: "Could not send",
      allSent: "Done: {sent} of {total} emails sent.", someFailed: "{sent} of {total} sent. Check the errors below.",
      notConfigured: "Email sending is not set up yet. Add RESEND_API_KEY and FROM_EMAIL in Vercel and redeploy.",
      sandboxHint: "With Resend and no custom domain, it can only send to the email you used to sign up for Resend.",
      all: "All guesses", csv: "Download CSV", empty: "No guesses yet.", spots: "{n}/{max} spots",
      msgsTitle: "💌 Messages for the parents", msgsEmpty: "No messages yet.", msgsCsv: "Download messages (CSV)", del: "Delete", delConfirm: "Sure?"
    },
    fil: {
      langName: "Filipino", title: "Admin panel", subtitle: "Tingnan ang takbo ng hulaan at abisuhan ang mga nanalo",
      tokenLabel: "Admin key", enter: "Pumasok", logout: "Lumabas", checking: "Sinusuri…",
      badToken: "Maling key. Tiyaking walang dagdag na espasyo.", generic: "May nangyaring mali. Subukan muli.",
      summary: "Buod", sBets: "Mga hula", sDates: "Petsang may hula", sFull: "Puno na ang petsa",
      emailOk: "Handa nang magpadala ng email mula sa {from}", emailOff: "Hindi pa naka-set up ang email: kulang ang RESEND_API_KEY at FROM_EMAIL sa Vercel",
      winners: "Mga nanalo", birth: "Petsa ng kapanganakan ng baby", search: "Hanapin ang mga nanalo",
      none: "Walang humula noong {date}.", found: "{n} nanalo noong {date}", send: "Mag-email sa {n} nanalo", sending: "Nagpapadala…",
      confirmTitle: "Magpadala ng email?", confirmText: "Magpapadala ng email sa {n} tao para sa {date}. Hindi na ito mababawi.",
      cancel: "Kanselahin", confirm: "Oo, ipadala", sentOk: "Naipadala", sentFail: "Hindi naipadala",
      allSent: "Tapos na: {sent} sa {total} email ang naipadala.", someFailed: "{sent} sa {total} ang naipadala. Tingnan ang mga error sa ibaba.",
      notConfigured: "Hindi pa naka-set up ang pagpapadala ng email. Idagdag ang RESEND_API_KEY at FROM_EMAIL sa Vercel at i-redeploy.",
      sandboxHint: "Kung walang sariling domain sa Resend, sa email lang na ginamit mo sa pag-sign up ito makakapagpadala.",
      all: "Lahat ng hula", csv: "I-download ang CSV", empty: "Wala pang hula.", spots: "{n}/{max} na lugar",
      msgsTitle: "💌 Mga mensahe para sa mga magulang", msgsEmpty: "Wala pang mensahe.", msgsCsv: "I-download ang mga mensahe (CSV)", del: "Burahin", delConfirm: "Sigurado ka?"
    }
  };

  let lang = localStorage.getItem("lang");
  if (!TXT[lang]) lang = "en";
  let token = sessionStorage.getItem("adminToken") || "";
  let data = null; // respuesta de "list"
  let pending = null; // { date, winners }

  const t = (k, v = {}) => TXT[lang][k].replace(/\{(\w+)\}/g, (_, x) => (x in v ? v[x] : `{${x}}`));
  const locale = () => ({ es: "es-MX", en: "en-US", fil: "fil-PH" })[lang];
  const parse = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
  const fmt = (iso) => parse(iso).toLocaleDateString(locale(), { dateStyle: "long" });
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  async function api(body) {
    const r = await fetch("/api/announce", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, ...body }) });
    const json = await r.json().catch(() => ({}));
    return { status: r.status, json };
  }

  function renderStatic() {
    document.documentElement.lang = lang;
    document.title = t("title");
    $("title").textContent = t("title");
    $("subtitle").textContent = t("subtitle");
    $("tokenLabel").textContent = t("tokenLabel");
    $("enter").textContent = t("enter");
    $("logout").textContent = t("logout");
    $("summaryTitle").textContent = t("summary");
    $("winnersTitle").textContent = t("winners");
    $("dateLabel").textContent = t("birth");
    $("search").textContent = t("search");
    $("allTitle").textContent = t("all");
    $("csv").textContent = t("csv");
    $("msgsTitle").textContent = t("msgsTitle");
    $("msgsCsv").textContent = t("msgsCsv");
    $("confirmTitle").textContent = t("confirmTitle");
    $("cancel").textContent = t("cancel");
    $("ok").textContent = t("confirm");
  }

  function renderDashboard() {
    if (!data) return;
    const byDate = {};
    data.guesses.forEach((g) => (byDate[g.guess_date] ||= []).push(g));
    const dates = Object.keys(byDate).sort();
    const full = dates.filter((d) => byDate[d].length >= MAX).length;

    const stats = $("stats");
    stats.textContent = "";
    [[t("sBets"), data.guesses.length], [t("sDates"), dates.length], [t("sFull"), full]].forEach(([label, n]) => {
      const c = el("div", "stat");
      c.append(el("strong", null, String(n)), el("span", null, label));
      stats.append(c);
    });

    const status = $("emailStatus");
    // Solo se muestra cuando los correos están listos; el aviso de "sin configurar" se oculta.
    status.className = "chip chip-ok";
    status.textContent = data.emailConfigured ? t("emailOk", { from: data.from || "" }) : "";
    status.style.display = data.emailConfigured ? "" : "none";

    const list = $("allList");
    list.textContent = "";
    if (!dates.length) { list.append(el("p", "muted", t("empty"))); return; }
    dates.forEach((d) => {
      const group = el("div", "group");
      const head = el("div", "group-head");
      head.append(el("strong", null, fmt(d)), el("span", "chip", t("spots", { n: byDate[d].length, max: MAX })));
      group.append(head);
      byDate[d].forEach((g) => {
        const row = el("div", "person");
        row.append(el("span", "person-name", g.name), el("span", "person-mail", g.email));
        group.append(row);
      });
      list.append(group);
    });
  }

  function csvCell(v) {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // evita fórmulas al abrir en Excel
    return `"${s.replace(/"/g, '""')}"`;
  }
  function downloadCsv() {
    if (!data) return;
    const rows = [["date", "name", "email", "language", "created_at"], ...data.guesses.map((g) => [g.guess_date, g.name, g.email, g.lang, g.created_at])];
    const blob = new Blob(["\ufeff" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "quiniela.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function showWinners(date, winners) {
    pending = { date, winners };
    const out = $("winnersOut");
    out.textContent = "";
    if (!winners.length) { out.append(el("p", "admin-msg", t("none", { date: fmt(date) }))); return; }
    out.append(el("p", "admin-msg ok", t("found", { n: winners.length, date: fmt(date) })));
    const ul = el("ul", "winner-list");
    winners.forEach((w) => {
      const li = el("li", "winner");
      li.dataset.email = w.email;
      const info = el("div", "winner-info");
      info.append(el("strong", null, w.name), el("span", "person-mail", w.email));
      li.append(el("span", "trophy", "🏆"), info, el("span", "chip", (TXT[w.lang] || TXT.es).langName));
      const state = el("span", "winner-state");
      li.append(state);
      ul.append(li);
    });
    out.append(ul);
    const btn = el("button", null, t("send", { n: winners.length }));
    btn.type = "button";
    btn.className = "btn-primary send-btn";
    btn.id = "sendBtn";
    btn.addEventListener("click", askSend);
    out.append(btn, el("p", "admin-msg", ""));
    out.lastChild.id = "sendMsg";
  }

  function askSend() {
    if (!pending) return;
    $("confirmText").textContent = t("confirmText", { n: pending.winners.length, date: fmt(pending.date) });
    const dlg = $("confirm");
    dlg.returnValue = "";
    dlg.showModal();
  }

  async function doSend() {
    const btn = $("sendBtn"), msg = $("sendMsg");
    btn.disabled = true;
    btn.textContent = t("sending");
    msg.textContent = "";
    msg.className = "admin-msg";
    const { status, json } = await api({ action: "send", birthDate: pending.date });
    btn.textContent = t("send", { n: pending.winners.length });
    if (status === 503) { msg.className = "admin-msg err"; msg.textContent = t("notConfigured"); btn.disabled = false; return; }
    if (status !== 200) { msg.className = "admin-msg err"; msg.textContent = t("generic"); btn.disabled = false; return; }

    let anyFailed = false;
    json.results.forEach((r) => {
      const li = document.querySelector(`.winner[data-email="${CSS.escape(r.email)}"] .winner-state`);
      if (!li) return;
      li.className = "winner-state " + (r.ok ? "ok" : "err");
      li.textContent = r.ok ? `✓ ${t("sentOk")}` : `✕ ${t("sentFail")}: ${r.error}`;
      if (!r.ok) anyFailed = true;
    });
    msg.className = "admin-msg " + (anyFailed ? "err" : "ok");
    msg.textContent = anyFailed ? `${t("someFailed", { sent: json.sent, total: json.total })} ${t("sandboxHint")}` : t("allSent", { sent: json.sent, total: json.total });
    btn.disabled = anyFailed ? false : true;
  }

  async function loadList() {
    const { status, json } = await api({ action: "list" });
    if (status === 401) return "unauthorized";
    if (status !== 200) return "error";
    data = json;
    return "ok";
  }

  function showDash(on) {
    $("loginCard").hidden = on;
    $("dash").hidden = !on;
  }

  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("loginMsg");
    token = $("token").value.trim();
    msg.className = "admin-msg";
    msg.textContent = t("checking");
    $("enter").disabled = true;
    const res = await loadList();
    $("enter").disabled = false;
    if (res === "ok") {
      sessionStorage.setItem("adminToken", token);
      $("token").value = "";
      msg.textContent = "";
      showDash(true);
      renderDashboard();
      loadAdminMessages();
    } else {
      msg.className = "admin-msg err";
      msg.textContent = res === "unauthorized" ? t("badToken") : t("generic");
    }
  });

  $("logout").addEventListener("click", () => {
    sessionStorage.removeItem("adminToken");
    token = ""; data = null; pending = null; adminMsgs = [];
    $("winnersOut").textContent = "";
    $("adminBoard").textContent = "";
    showDash(false);
  });

  $("winnersForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const date = $("date").value;
    if (!date) return;
    const out = $("winnersOut");
    const { status, json } = await api({ action: "preview", birthDate: date });
    if (status !== 200) { out.textContent = ""; out.append(el("p", "admin-msg err", t("generic"))); return; }
    showWinners(date, json.winners);
  });

  $("confirm").addEventListener("close", () => { if ($("confirm").returnValue === "ok") doSend(); });
  $("csv").addEventListener("click", downloadCsv);

  // ---- Mensajes de amor (pizarron de los papas) ----
  let adminMsgs = [];
  const hashId = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);

  async function loadAdminMessages() {
    const { status, json } = await api({ action: "messages" });
    adminMsgs = status === 200 ? json.messages || [] : [];
    renderAdminMessages();
  }

  function renderAdminMessages() {
    const box = $("adminBoard"), empty = $("msgsEmpty");
    box.textContent = "";
    empty.textContent = t("msgsEmpty");
    empty.hidden = adminMsgs.length > 0;
    box.hidden = adminMsgs.length === 0;
    $("msgsCsv").disabled = adminMsgs.length === 0;
    adminMsgs.forEach((m) => {
      const note = el("article", `postit ${m.color || "yellow"}`);
      note.style.setProperty("--r", `${(Math.abs(hashId(m.id)) % 7) - 3}deg`);
      note.append(
        el("p", "postit-text", m.message),
        el("p", "postit-sign", `— ${m.name}`),
        el("p", "postit-date", new Date(m.created_at).toLocaleDateString(locale(), { dateStyle: "medium" }))
      );
      const del = el("button", "postit-del", t("del"));
      del.type = "button";
      del.addEventListener("click", async () => {
        if (!del.dataset.armed) { // primer clic: pedir confirmacion
          del.dataset.armed = "1";
          del.textContent = t("delConfirm");
          del.classList.add("armed");
          setTimeout(() => { if (del.isConnected) { delete del.dataset.armed; del.textContent = t("del"); del.classList.remove("armed"); } }, 4000);
          return;
        }
        del.disabled = true;
        const { status } = await api({ action: "deleteMessage", id: m.id });
        if (status === 200) { adminMsgs = adminMsgs.filter((x) => x.id !== m.id); renderAdminMessages(); }
        else { del.disabled = false; del.textContent = t("generic"); }
      });
      note.append(del);
      box.append(note);
    });
  }

  $("msgsCsv").addEventListener("click", () => {
    const rows = [["date", "name", "message", "color", "language"], ...adminMsgs.map((m) => [m.created_at, m.name, m.message, m.color, m.lang])];
    const blob = new Blob(["\ufeff" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mensajes.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  const names = Object.fromEntries(Object.entries(TXT).map(([code, v]) => [code, v.langName]));
  LangSwitch.init($("lang"), {
    names, value: lang,
    onChange: (code) => {
      lang = code;
      localStorage.setItem("lang", lang);
      renderStatic();
      renderDashboard();
      renderAdminMessages();
      if (pending) showWinners(pending.date, pending.winners);
    }
  });

  renderStatic();
  if (token) {
    loadList().then((res) => {
      if (res === "ok") { showDash(true); renderDashboard(); loadAdminMessages(); }
      else { sessionStorage.removeItem("adminToken"); token = ""; showDash(false); }
    });
  }
})();
