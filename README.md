# Quiniela del bebé de Alexa y Ryan

Sitio en español, inglés y filipino. Máximo 3 personas por fecha.

## Estructura
- `public/config.js`: padres, rango de fechas, idioma por defecto.
- `public/i18n.js`: todos los textos (es / en / fil).
- `public/admin.html`: ver ganadores y enviar correos (`/admin`).
- `netlify/functions/`: API (`guesses`, `announce`).
- `supabase/schema.sql`: tabla y regla de máximo 3 por fecha.

## Puesta en marcha
1. Crea un proyecto gratis en Supabase y ejecuta `supabase/schema.sql` en el SQL Editor.
2. Crea cuenta en Resend (resend.com) y verifica un dominio/remitente.
3. Sube este repo a GitHub y conéctalo en Netlify (New site > Import from Git). Cada `git push` despliega.
4. En Netlify > Site settings > Environment variables define:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
   - `RESEND_API_KEY`, `FROM_EMAIL` (ej. `Quiniela <hola@tudominio.com>`)
   - `ADMIN_TOKEN` (una clave larga y secreta)
   - `PARENTS` (opcional, nombres separados por coma, por defecto `Alexa,Ryan`)
5. Cuando nazca el bebé, abre `/admin`, pon el token y la fecha, usa "Ver ganadores" y luego "Enviar correos".

## Alternativa: Vercel
El repo también funciona en Vercel (`api/` + `vercel.json`). Importa el repo en vercel.com, deja Framework en "Other" y define las mismas variables de entorno del paso 4. Las rutas `/api/guesses` y `/api/announce` funcionan igual.

## Notas
- Si cambias el máximo por fecha, actualiza `maxPerDate` en `config.js` y el número 3 en `schema.sql`.
- Un correo solo puede apostar una vez.

## Pizarrón de mensajes (post-its)
Después de enviar su apuesta, cada persona puede dejar un mensaje de amor para los papás y el bebé, con su firma. **Solo los papás lo leen**, en `/admin`.

- **Base de datos:** ejecuta el bloque "Pizarrón de mensajes" de `supabase/schema.sql` en Supabase > SQL Editor (crea la tabla `messages`, máximo 3 mensajes por correo).
- **Quién puede escribir:** solo quien ya envió una apuesta con ese correo (lo verifica el servidor).
- **Papás:** en `/admin` ven los mensajes como post-its en un pizarrón de corcho con páginas (8 por página en computadora, 4 en celular), buscador y modo lectura (un mensaje a la vez, en grande). Pueden descargarlos en CSV y borrar alguno.
- **Privacidad:** el servidor ya no entrega los mensajes al público (`/api/messages` solo permite escribir). Leerlos exige la clave de administrador.
