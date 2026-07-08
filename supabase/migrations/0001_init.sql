-- Dante — esquema inicial (Fase 1)

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists btree_gist;

create type app_role as enum ('admin', 'readonly');
create type agenda_type as enum ('traumatologo', 'enfermeria', 'quirofano');
create type appointment_status as enum ('programada', 'confirmada', 'completada', 'no_presentado', 'cancelada', 'pendiente');

-- ═══════════════════════════ perfiles y roles ═══════════════════════════

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role app_role not null default 'admin',
  created_at timestamptz not null default now()
);

-- se crea automáticamente un perfil admin al dar de alta un usuario en Supabase Auth
create function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', 'admin');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- usada por las políticas RLS; security definer para poder leer profiles pese a su propia RLS
create function current_user_role() returns app_role as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public;

-- ═══════════════════════════ catálogos del backoffice ═══════════════════

create table insurance_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table appointment_types (
  id uuid primary key default gen_random_uuid(),
  agenda agenda_type not null,
  name text not null,
  default_duration_minutes int not null check (default_duration_minutes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (agenda, name)
);

create table agenda_config (
  agenda agenda_type primary key,
  -- 1 = lunes … 7 = domingo
  default_weekdays smallint[] not null default '{}',
  default_duration_minutes int not null default 15 check (default_duration_minutes > 0),
  start_time time not null default '09:00',
  end_time time not null default '14:00',
  notice_days_default int not null default 3 check (notice_days_default >= 0),
  updated_at timestamptz not null default now()
);

-- ═══════════════════════════ apertura/cierre de días ═══════════════════

-- una fecha sin fila aquí se considera cerrada; "programar el mes" hace un upsert
-- masivo de is_open=true para las fechas del mes que caen en agenda_config.default_weekdays
create table agenda_days (
  id uuid primary key default gen_random_uuid(),
  agenda agenda_type not null,
  date date not null,
  is_open boolean not null,
  created_at timestamptz not null default now(),
  unique (agenda, date) -- ya cubre las consultas por (agenda, date), no hace falta índice aparte
);

-- ═══════════════════════════ pacientes ═══════════════════════════

-- los pacientes "particulares" no se registran aquí: su cita lleva particular_label
create table patients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  phone text not null,
  insurance_company_id uuid references insurance_companies (id),
  dni text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index patients_name_trgm_idx on patients using gin ((first_name || ' ' || last_name) gin_trgm_ops);
create index patients_phone_trgm_idx on patients using gin (phone gin_trgm_ops);

-- ═══════════════════════════ citas ═══════════════════════════

create table appointments (
  id uuid primary key default gen_random_uuid(),
  agenda agenda_type not null,
  date date not null,
  start_time time not null,
  duration_minutes int not null check (duration_minutes > 0),
  -- calculados por trigger (appointments_set_times), no escribir a mano
  starts_at timestamp not null,
  ends_at timestamp not null,
  patient_id uuid references patients (id),
  particular_label text,
  insurance_company_id uuid references insurance_companies (id),
  appointment_type_id uuid references appointment_types (id),
  status appointment_status not null default 'programada',
  -- solo quirófano:
  pathology text,
  prosthesis_brand text,
  dni text,
  observations text,
  follow_up_date date,
  whatsapp_sent_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_patient_or_label check (patient_id is not null or particular_label is not null),
  constraint appointment_pendiente_solo_quirofano check (status <> 'pendiente' or agenda = 'quirofano'),
  constraint appointment_campos_quirofano check (
    agenda = 'quirofano' or (pathology is null and prosthesis_brand is null and dni is null)
  ),
  -- red de seguridad a nivel de base de datos contra solapes (además del aviso en el formulario)
  exclude using gist (agenda with =, tsrange(starts_at, ends_at) with &&) where (status <> 'cancelada')
);

create index appointments_agenda_date_idx on appointments (agenda, date);
create index appointments_follow_up_idx on appointments (follow_up_date) where follow_up_date is not null;

create function appointments_set_times() returns trigger as $$
begin
  new.starts_at := (new.date + new.start_time);
  new.ends_at := new.starts_at + (new.duration_minutes || ' minutes')::interval;
  return new;
end;
$$ language plpgsql;

create trigger appointments_set_times_trigger
  before insert or update on appointments
  for each row execute function appointments_set_times();

create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger patients_set_updated_at before update on patients for each row execute function set_updated_at();
create trigger appointments_set_updated_at before update on appointments for each row execute function set_updated_at();
create trigger agenda_config_set_updated_at before update on agenda_config for each row execute function set_updated_at();

-- ═══════════════════════════ datos semilla ═══════════════════════════

insert into agenda_config (agenda, default_weekdays, default_duration_minutes, start_time, end_time, notice_days_default) values
  ('traumatologo', '{1}', 15, '16:00', '19:30', 3),
  ('enfermeria', '{2}', 20, '16:00', '19:30', 3),
  ('quirofano', '{3}', 60, '16:00', '19:30', 3);

insert into appointment_types (agenda, name, default_duration_minutes) values
  ('enfermeria', 'Cura', 15),
  ('enfermeria', 'Infiltración células madre', 30),
  ('enfermeria', 'PRP', 30);

insert into insurance_companies (name) values
  ('Adeslas'), ('Sanitas'), ('DKV'), ('Asisa'), ('Mapfre'), ('Caser');

-- ═══════════════════════════ RLS ═══════════════════════════

alter table profiles enable row level security;
alter table insurance_companies enable row level security;
alter table appointment_types enable row level security;
alter table agenda_config enable row level security;
alter table agenda_days enable row level security;
alter table patients enable row level security;
alter table appointments enable row level security;

create policy profiles_select on profiles for select using (id = auth.uid() or current_user_role() = 'admin');
create policy profiles_update_own on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- admin: lectura y escritura total. readonly: solo lectura. (hoy solo existe admin)
create policy insurance_companies_select on insurance_companies for select using (current_user_role() in ('admin', 'readonly'));
create policy insurance_companies_write on insurance_companies for insert with check (current_user_role() = 'admin');
create policy insurance_companies_update on insurance_companies for update using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy insurance_companies_delete on insurance_companies for delete using (current_user_role() = 'admin');

create policy appointment_types_select on appointment_types for select using (current_user_role() in ('admin', 'readonly'));
create policy appointment_types_write on appointment_types for insert with check (current_user_role() = 'admin');
create policy appointment_types_update on appointment_types for update using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy appointment_types_delete on appointment_types for delete using (current_user_role() = 'admin');

create policy agenda_config_select on agenda_config for select using (current_user_role() in ('admin', 'readonly'));
create policy agenda_config_update on agenda_config for update using (current_user_role() = 'admin') with check (current_user_role() = 'admin');

create policy agenda_days_select on agenda_days for select using (current_user_role() in ('admin', 'readonly'));
create policy agenda_days_write on agenda_days for insert with check (current_user_role() = 'admin');
create policy agenda_days_update on agenda_days for update using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy agenda_days_delete on agenda_days for delete using (current_user_role() = 'admin');

create policy patients_select on patients for select using (current_user_role() in ('admin', 'readonly'));
create policy patients_write on patients for insert with check (current_user_role() = 'admin');
create policy patients_update on patients for update using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy patients_delete on patients for delete using (current_user_role() = 'admin');

create policy appointments_select on appointments for select using (current_user_role() in ('admin', 'readonly'));
create policy appointments_write on appointments for insert with check (current_user_role() = 'admin');
create policy appointments_update on appointments for update using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy appointments_delete on appointments for delete using (current_user_role() = 'admin');

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  profiles, insurance_companies, appointment_types, agenda_config, agenda_days, patients, appointments
  to authenticated;
