-- Índices para las consultas más frecuentes de la app:
-- - Historial de citas de un paciente (backoffice > pacientes > ficha): appointments.patient_id
--   no tenía ningún índice, así que esa consulta hacía un escaneo completo de la tabla.
-- - Filtro por estado en Listados: appointments.status.
-- - "Pacientes por avisar" / "Recordatorios de mañana" (whatsapp_sent_at is null) e Inicio
--   (próximo día abierto): índices parciales que calzan exactamente con el patrón de consulta
--   real (is null / is_open = true), más baratos y más útiles que un índice completo.
create index if not exists appointments_patient_id_idx on appointments (patient_id);
create index if not exists appointments_status_idx on appointments (status);
create index if not exists appointments_whatsapp_pendiente_idx on appointments (date) where whatsapp_sent_at is null;
create index if not exists agenda_days_open_date_idx on agenda_days (date) where is_open = true;

-- La búsqueda de pacientes (autocompletado al dar de alta una cita, listado de backoffice)
-- consulta first_name y last_name por separado (or first_name.ilike / last_name.ilike /
-- phone.ilike), pero el único índice de nombre existente era sobre el nombre completo
-- concatenado — no lo podía usar ninguna de esas dos ramas, así que la búsqueda por nombre
-- hacía un escaneo completo. Se sustituye por un índice trigram por columna.
drop index if exists patients_name_trgm_idx;
create index if not exists patients_first_name_trgm_idx on patients using gin (first_name gin_trgm_ops);
create index if not exists patients_last_name_trgm_idx on patients using gin (last_name gin_trgm_ops);
