-- Se quita el check "avisar antes de la cita": ahora se avisa por WhatsApp a todos los
-- pacientes con teléfono (el botón aparece en la propia agenda de cada cita, coloreado según
-- lo cerca que esté), así que ya no hace falta marcar cita a cita quién necesita recordatorio.
alter table appointments drop column if exists needs_reminder;
