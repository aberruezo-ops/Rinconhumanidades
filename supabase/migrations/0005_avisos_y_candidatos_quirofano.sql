-- 1. Nuevo estado "avisado": paso intermedio entre "programada" y "confirmada" para marcar
--    que ya se ha llamado o escrito por WhatsApp al paciente, a la espera de que confirme.
alter type appointment_status add value if not exists 'avisado';

-- 2. "Avisar antes de la cita" pasa de una fecha libre (follow_up_date) a un simple sí/no:
--    si está marcado, la cita aparece en el aviso de Inicio dentro de los días de antelación
--    configurados para esa agenda (agenda_config.notice_days_default), hasta que se marque el
--    aviso de WhatsApp como enviado. follow_up_date queda sustituido y sin uso; se elimina.
alter table appointments add column if not exists needs_reminder boolean not null default false;
drop index if exists appointments_follow_up_idx;
alter table appointments drop column if exists follow_up_date;

-- 3. Candidatos de quirófano sin cita cerrada: pacientes en estudio para quirófano que todavía
--    no tienen día ni hora reservados, como mucho un deseo de fecha aproximada. Al acercarse esa
--    fecha (un mes antes) aparecen en el aviso de Inicio para llamarles y cerrar/confirmar la
--    cita real (que se crea como una cita normal en la agenda de quirófano cuando se concreta).
create table if not exists quirofano_candidatos (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients (id),
  particular_label text,
  desired_date date,
  observations text,
  whatsapp_sent_at timestamptz,
  status text not null default 'pendiente' check (status in ('pendiente', 'convertido', 'descartado')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quirofano_candidato_patient_or_label check (patient_id is not null or particular_label is not null)
);

create index if not exists quirofano_candidatos_desired_date_idx
  on quirofano_candidatos (desired_date) where status = 'pendiente';

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_updated_at_quirofano_candidatos'
  ) then
    create trigger set_updated_at_quirofano_candidatos
      before update on quirofano_candidatos
      for each row execute function set_updated_at();
  end if;
end $$;

alter table quirofano_candidatos enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'quirofano_candidatos' and policyname = 'quirofano_candidatos_select') then
    create policy quirofano_candidatos_select on quirofano_candidatos for select using (current_user_role() in ('admin', 'readonly'));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'quirofano_candidatos' and policyname = 'quirofano_candidatos_write') then
    create policy quirofano_candidatos_write on quirofano_candidatos for insert with check (current_user_role() = 'admin');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'quirofano_candidatos' and policyname = 'quirofano_candidatos_update') then
    create policy quirofano_candidatos_update on quirofano_candidatos for update using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'quirofano_candidatos' and policyname = 'quirofano_candidatos_delete') then
    create policy quirofano_candidatos_delete on quirofano_candidatos for delete using (current_user_role() = 'admin');
  end if;
end $$;

grant select, insert, update, delete on quirofano_candidatos to authenticated;
