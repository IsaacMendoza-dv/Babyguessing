const crypto = require("crypto");
const { SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY, FROM_EMAIL, ADMIN_TOKEN, PARENTS = "Alexa,Ryan" } = process.env;

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body)
});

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const oneLine = (s) => String(s).replace(/[\r\n\t]+/g, " ").trim();

const AND = { es: "y", en: "and", fil: "at" };
const LOCALE = { es: "es-MX", en: "en-US", fil: "fil-PH" };
const fmtDate = (iso, lang) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString(LOCALE[lang], { dateStyle: "long" }); };
const templates = {
  es: (n, d, p) => ({ subject: `¡Ganaste la quiniela del bebé de ${p}!`, text: `¡Felicidades, ${n}! Adivinaste la fecha de nacimiento (${d}) del bebé de ${p}. ¡Eres ganador!` }),
  en: (n, d, p) => ({ subject: `You won the baby pool for ${p}!`, text: `Congratulations, ${n}! You guessed the birth date (${d}) of ${p}'s baby. You're a winner!` }),
  fil: (n, d, p) => ({ subject: `Nanalo ka sa hulaan ng baby nina ${p}!`, text: `Congratulations, ${n}! Tama ang hula mo sa petsa ng kapanganakan (${d}) ng baby nina ${p}. Panalo ka!` })
};

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const sbGet = (query) =>
  fetch(`${SUPABASE_URL}/rest/v1/guesses?${query}`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` }
  });

const emailConfigured = () => Boolean(RESEND_API_KEY && FROM_EMAIL);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function sendOne(w, birthDate) {
  const lang = templates[w.lang] ? w.lang : "es";
  const parents = PARENTS.split(",").map((s) => s.trim()).filter(Boolean).join(` ${AND[lang]} `);
  const tpl = templates[lang](oneLine(w.name), fmtDate(birthDate, lang), parents);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to: [w.email], subject: tpl.subject, text: tpl.text, html: `<p>${esc(tpl.text)}</p>` })
    });
    if (res.ok) return { email: w.email, ok: true };
    const data = await res.json().catch(() => ({}));
    const reason = data.message || `HTTP ${res.status}`;
    console.error("resend failed", res.status, reason);
    return { email: w.email, ok: false, error: reason };
  } catch (e) {
    console.error("resend request error", e && e.message);
    return { email: w.email, ok: false, error: "network" };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { code: "method" });
  let b;
  try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { code: "invalid" }); }
  if (!ADMIN_TOKEN || !safeEqual(b.token || "", ADMIN_TOKEN)) return json(401, { code: "unauthorized" });

  // Compatibilidad: { preview: true } equivale a action "preview".
  const action = b.action || (b.preview ? "preview" : "send");

  try {
    if (action === "list") {
      const r = await sbGet("select=name,email,guess_date,lang,created_at&order=guess_date,created_at");
      if (!r.ok) { console.error("supabase list failed", r.status, await r.text()); return json(500, { code: "server" }); }
      return json(200, { guesses: await r.json(), emailConfigured: emailConfigured(), from: FROM_EMAIL || null });
    }

    // ---- Pizarrón de mensajes (solo los papás) ----
    const sbMessages = (query, opts = {}) =>
      fetch(`${SUPABASE_URL}/rest/v1/messages?${query}`, {
        ...opts,
        headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, ...(opts.headers || {}) }
      });

    if (action === "messages") {
      const r = await sbMessages("select=id,name,message,color,lang,created_at&order=created_at.desc");
      if (!r.ok) { console.error("supabase messages failed", r.status, await r.text()); return json(500, { code: "server" }); }
      return json(200, { messages: await r.json() });
    }

    if (action === "deleteMessage") {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.id || "")) return json(400, { code: "invalid" });
      const r = await sbMessages(`id=eq.${b.id}`, { method: "DELETE" });
      if (!r.ok) { console.error("supabase delete message failed", r.status, await r.text()); return json(500, { code: "server" }); }
      return json(200, { ok: true });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.birthDate || "") || Number.isNaN(Date.parse(b.birthDate))) return json(400, { code: "invalid" });

    const r = await sbGet(`select=name,email,lang&guess_date=eq.${b.birthDate}&order=created_at`);
    if (!r.ok) { console.error("supabase winners failed", r.status, await r.text()); return json(500, { code: "server" }); }
    const winners = await r.json();

    if (action === "preview") return json(200, { winners: winners.map((w) => ({ name: w.name, email: w.email, lang: w.lang })) });

    if (action === "send") {
      if (!emailConfigured()) return json(503, { code: "email_not_configured" });
      const results = [];
      for (let i = 0; i < winners.length; i++) {
        if (i) await sleep(700); // Resend limita a ~2 envíos por segundo
        results.push(await sendOne(winners[i], b.birthDate));
      }
      return json(200, { total: winners.length, sent: results.filter((x) => x.ok).length, results });
    }

    return json(400, { code: "invalid" });
  } catch (e) {
    console.error("announce error", e && e.message);
    return json(500, { code: "server" });
  }
};
