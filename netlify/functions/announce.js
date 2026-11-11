const crypto = require("crypto");
const { SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY, FROM_EMAIL, ADMIN_TOKEN, PARENTS = "Alexa,Ryan" } = process.env;

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body)
});

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

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

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { code: "method" });
  let b;
  try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { code: "invalid" }); }
  if (!ADMIN_TOKEN || !safeEqual(b.token || "", ADMIN_TOKEN)) return json(401, { code: "unauthorized" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.birthDate || "")) return json(400, { code: "invalid" });

  const r = await fetch(`${SUPABASE_URL}/rest/v1/guesses?select=name,email,lang&guess_date=eq.${b.birthDate}`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` }
  });
  if (!r.ok) return json(500, { code: "server" });
  const winners = await r.json();

  if (b.preview) return json(200, { winners: winners.map((w) => ({ name: w.name, email: w.email })), sent: 0 });

  let sent = 0;
  const failed = [];
  for (const w of winners) {
    const lang = templates[w.lang] ? w.lang : "es";
    const parents = PARENTS.split(",").map((s) => s.trim()).filter(Boolean).join(` ${AND[lang]} `);
    const tpl = templates[lang](w.name, fmtDate(b.birthDate, lang), parents);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to: [w.email], subject: tpl.subject, text: tpl.text, html: `<p>${esc(tpl.text)}</p>` })
    });
    if (res.ok) sent++; else failed.push(w.email);
  }
  return json(200, { winners: winners.length, sent, failed });
};
