// Edita este archivo para configurar la quiniela / Edit this file to configure the pool.
window.QUINIELA_CONFIG = {
  parents: ["Alexa", "Ryan"],
  // Rango de fechas (YYYY-MM-DD) / Selectable date range
  startDate: "2026-11-16",
  endDate: "2027-01-14",
  dueDate: "2026-12-22", // Fecha probable de parto / Due date
  maxPerDate: 3, // Debe coincidir con el trigger en supabase/schema.sql
  defaultLang: "en"
};
