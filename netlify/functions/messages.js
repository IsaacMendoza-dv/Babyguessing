// Mensajes para los papás: POST crea un mensaje (solo quien ya envió su apuesta). No hay lectura pública.
const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

const COLORS = ["yellow", "pink", "blue", "green", "orange"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body)
});

const sb = (path, opts = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(opts.headers || {})
    }
  });

// Quita caracteres de control, normaliza saltos de línea y recorta.
const clean = (value, max, keepNewlines = false) => {
  let s = String(value ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  s = keepNewlines ? s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n") : s.replace(/\s+/g, " ");
  return s.trim().slice(0, max);
};

exports.handler = async (event) => {
  try {
    // Los mensajes son privados: solo los papás los leen, desde /admin (netlify/functions/announce.js, con clave).
    // Esta ruta publica solo permite ESCRIBIR un mensaje (POST).

    if (event.httpMethod === "POST") {
      let b;
      try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { code: "invalid" }); }
      const name = clean(b.name, 60);
      const message = clean(b.message, 280, true);
      const email = String(b.email || "").trim().toLowerCase();
      const color = COLORS.includes(b.color) ? b.color : "yellow";
      const lang = ["es", "en", "fil"].includes(b.lang) ? b.lang : "es";

      if (!message) return json(400, { code: "invalid", field: "message" });
      if (!name) return json(400, { code: "invalid", field: "name" });
      if (email.length > 120 || !EMAIL_RE.test(email)) return json(400, { code: "invalid", field: "email" });

      // Solo puede dejar mensaje quien ya envió su apuesta con ese correo.
      const g = await sb(`guesses?select=id&email=eq.${encodeURIComponent(email)}&limit=1`);
      if (!g.ok) { console.error("guess lookup failed", g.status, await g.text()); return json(500, { code: "server" }); }
      if (!(await g.json()).length) return json(403, { code: "no_guess" });

      const r = await sb("messages?select=id,name,message,color,created_at", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ name, message, color, lang, guess_email: email })
      });
      if (r.ok) return json(201, { message: (await r.json())[0] });
      const err = await r.text();
      if (err.includes("too_many_messages")) return json(429, { code: "limit" });
      console.error("messages POST failed", r.status, err);
      return json(500, { code: "server" });
    }

    return json(405, { code: "method" });
  } catch (e) {
    console.error("messages handler error:", e && e.message);
    return json(500, { code: "server" });
  }
};
