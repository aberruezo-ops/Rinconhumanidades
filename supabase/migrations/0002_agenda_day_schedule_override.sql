-- Permite fijar un horario distinto (no solo abrir/cerrar) para un día concreto de una
-- agenda: por defecto se usa el patrón de agenda_config, pero una semana puntual puede
-- necesitar otro día, otra fecha u otra hora sin cambiar el patrón general.
--
-- Escrito de forma que se pueda volver a ejecutar sin fallar si ya se aplicó antes
-- (columnas/constraints con "if not exists" / comprobación previa).

alter table agenda_days
  add column if not exists start_time_override time,
  add column if not exists end_time_override time;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'agenda_days_override_pair_check') then
    alter table agenda_days
      add constraint agenda_days_override_pair_check
      check ((start_time_override is null) = (end_time_override is null));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'agenda_days_override_range_check') then
    alter table agenda_days
      add constraint agenda_days_override_range_check
      check (start_time_override is null or start_time_override < end_time_override);
  end if;
end $$;
