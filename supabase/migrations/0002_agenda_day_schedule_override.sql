-- Permite fijar un horario distinto (no solo abrir/cerrar) para un día concreto de una
-- agenda: por defecto se usa el patrón de agenda_config, pero una semana puntual puede
-- necesitar otro día, otra fecha u otra hora sin cambiar el patrón general.

alter table agenda_days
  add column start_time_override time,
  add column end_time_override time;

alter table agenda_days
  add constraint agenda_days_override_pair_check
  check ((start_time_override is null) = (end_time_override is null));

alter table agenda_days
  add constraint agenda_days_override_range_check
  check (start_time_override is null or start_time_override < end_time_override);
