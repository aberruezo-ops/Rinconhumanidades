-- Enfermería pasa a ser una agenda "de día completo": sin hora ni duración, solo
-- fecha + paciente + tipo (cura o PRP). El resto de agendas siguen exigiendo hora.
--
-- Escrito de forma que se pueda volver a ejecutar sin fallar si ya se aplicó antes.

-- catálogo de tipos de cita de enfermería: solo cura y PRP
update appointment_types set active = false where agenda = 'enfermeria' and name = 'Infiltración células madre';

-- start_time / duration_minutes / starts_at / ends_at pasan a ser opcionales a nivel de columna...
alter table appointments alter column start_time drop not null;
alter table appointments alter column duration_minutes drop not null;
alter table appointments alter column starts_at drop not null;
alter table appointments alter column ends_at drop not null;

-- ...pero solo pueden faltar en enfermería; el resto de agendas los siguen exigiendo
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'appointments_time_required_unless_enfermeria') then
    alter table appointments
      add constraint appointments_time_required_unless_enfermeria check (
        (agenda = 'enfermeria' and start_time is null and duration_minutes is null)
        or (agenda <> 'enfermeria' and start_time is not null and duration_minutes is not null)
      );
  end if;
end $$;

-- si no hay start_time no hay nada que calcular (antes siempre había valor)
create or replace function appointments_set_times() returns trigger as $$
begin
  if new.start_time is null then
    new.starts_at := null;
    new.ends_at := null;
  else
    new.starts_at := (new.date + new.start_time);
    new.ends_at := new.starts_at + (new.duration_minutes || ' minutes')::interval;
  end if;
  return new;
end;
$$ language plpgsql;

-- sin hora no hay solape que comprobar: las citas de enfermería quedan fuera de esta red de seguridad
alter table appointments drop constraint if exists appointments_agenda_tsrange_excl;
alter table appointments
  add constraint appointments_agenda_tsrange_excl
  exclude using gist (agenda with =, tsrange(starts_at, ends_at) with &&)
  where (status <> 'cancelada' and agenda <> 'enfermeria');
