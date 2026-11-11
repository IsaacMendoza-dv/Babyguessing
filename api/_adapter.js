// Adapta los handlers estilo Netlify (event -> {statusCode, headers, body}) a funciones de Vercel (req, res).
// Los archivos que empiezan con "_" no se exponen como rutas en Vercel.
module.exports = (handler) => async (req, res) => {
  const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
  const result = await handler({ httpMethod: req.method, body, headers: req.headers });
  res.status(result.statusCode);
  for (const [key, value] of Object.entries(result.headers || {})) res.setHeader(key, value);
  res.send(result.body);
};
