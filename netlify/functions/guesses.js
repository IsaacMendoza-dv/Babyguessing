const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

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

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "GET") {
      const r = await sb("guesses?select=guess_date,name&order=created_at");
      if (!r.ok) { console.error("supabase GET failed", r.status, await r.text()); return json(500, { code: "server" }); }
      const board = {};
      for (const g of await r.json()) (board[g.guess_date] ||= []).push({ name: g.name });
      return json(200, { board });
    }

    if (event.httpMethod === "POST") {
      let b;
      try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { code: "invalid" }); }
      const name = String(b.name || "").trim();
      const email = String(b.email || "").trim().toLowerCase();
      const guessDate = String(b.guessDate || "");
      const lang = ["es", "en", "fil"].includes(b.lang) ? b.lang : "es";
      // Cada campo responde con su propio código para que la página muestre el mensaje correcto.
      if (!name || name.length > 80) return json(400, { code: "invalid", field: "name" });
      if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json(400, { code: "invalid", field: "email" });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(guessDate) || Number.isNaN(Date.parse(guessDate))) return json(400, { code: "invalid", field: "date" });
      const r = await sb("guesses", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ name, email, guess_date: guessDate, lang })
      });
      if (r.ok) return json(201, { ok: true });
      const err = await r.text();
      if (err.includes("date_full")) return json(409, { code: "date_full" });
      if (err.includes("guesses_email_uniq") || err.includes("23505")) return json(409, { code: "duplicate" });
      console.error("supabase POST failed", r.status, err);
      return json(500, { code: "server" });
    }

    return json(405, { code: "method" });
  } catch (e) {
    console.error("guesses handler error:", e && e.message, "| SUPABASE_URL set:", Boolean(SUPABASE_URL), "| SUPABASE_SERVICE_KEY set:", Boolean(SUPABASE_SERVICE_KEY));
    return json(500, { code: "server" });
  }
};
