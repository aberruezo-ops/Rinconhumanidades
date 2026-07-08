-- Duración de cita personalizable por compañía aseguradora.
-- null = usa el valor por defecto de agenda_config.default_duration_minutes para esa agenda.
-- "Particular" no es una fila de esta tabla, así que siempre usa el valor por defecto
-- (su duración ya se ajusta a mano en el formulario, como hoy).

alter table insurance_companies add column if not exists duration_minutes int;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'insurance_companies_duration_minutes_check'
  ) then
    alter table insurance_companies
      add constraint insurance_companies_duration_minutes_check
      check (duration_minutes is null or (duration_minutes between 5 and 240));
  end if;
end $$;
