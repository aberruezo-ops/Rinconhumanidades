-- Dos cambios de reglas de negocio pedidos directamente por la usuaria:
--
-- 1) Los pacientes "particulares" (sin registrar) también deben llevar teléfono: no puede
--    haber una cita sin forma de contactar al paciente, igual que ya es obligatorio para los
--    pacientes registrados (patients.phone es not null desde el principio). Se añade la
--    columna en appointments; no se marca "not null" porque las citas particulares que ya
--    existan hoy no tienen este dato y no se quiere romper nada — se rellenará a mano cuando
--    se pueda. La app sí lo exige ya como obligatorio para citas nuevas o editadas.
--
-- 2) Los solapes de horario dejan de bloquear el guardado. Se sigue avisando en el formulario
--    antes de guardar (eso no cambia), pero ahora se permite guardar varias citas a la misma
--    hora a propósito, para cuando hay sobrecarga de agenda. Se retira el EXCLUDE de Postgres
--    que hasta ahora lo impedía a nivel de base de datos.

alter table appointments add column if not exists particular_phone text;

alter table appointments drop constraint if exists appointments_agenda_tsrange_excl;
