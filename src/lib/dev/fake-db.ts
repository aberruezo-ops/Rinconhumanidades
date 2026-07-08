import { isoWeekday, ymd, daysInMonth } from "@/lib/domain/dates";
import { FAKE_USER } from "@/lib/dev/fake-mode";

export type Row = Record<string, unknown>;
export type Store = Record<string, Row[]>;

function randomId(): string {
  return crypto.randomUUID();
}

function seed(): Store {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const nowIso = now.toISOString();

  const insuranceCompanies: Row[] = ["Adeslas", "Sanitas", "DKV", "Asisa", "Mapfre", "Caser"].map((name) => ({
    id: randomId(),
    name,
    active: true,
    duration_minutes: null,
    created_at: nowIso,
  }));
  const adeslas = insuranceCompanies[0];
  const sanitas = insuranceCompanies[1];

  const appointmentTypes: Row[] = [
    { id: randomId(), agenda: "enfermeria", name: "Cura", default_duration_minutes: 15, active: true, created_at: nowIso },
    { id: randomId(), agenda: "enfermeria", name: "PRP", default_duration_minutes: 30, active: true, created_at: nowIso },
  ];

  const agendaConfig: Row[] = [
    { agenda: "traumatologo", default_weekdays: [1], default_duration_minutes: 15, start_time: "16:00", end_time: "19:30", notice_days_default: 3, updated_at: nowIso },
    { agenda: "enfermeria", default_weekdays: [2], default_duration_minutes: 20, start_time: "16:00", end_time: "19:30", notice_days_default: 3, updated_at: nowIso },
    { agenda: "quirofano", default_weekdays: [3], default_duration_minutes: 60, start_time: "16:00", end_time: "19:30", notice_days_default: 3, updated_at: nowIso },
  ];

  const agendaDays: Row[] = [];
  for (const config of agendaConfig) {
    const weekdays = config.default_weekdays as number[];
    if (weekdays.length === 0) continue;
    const total = daysInMonth(year, month);
    for (let day = 1; day <= total; day++) {
      if (weekdays.includes(isoWeekday(year, month, day))) {
        agendaDays.push({ id: randomId(), agenda: config.agenda, date: ymd(year, month, day), is_open: true, created_at: nowIso });
      }
    }
  }
  // abre también una fecha suelta de enfermería (sin día fijo) para que la demo tenga algo que mostrar
  agendaDays.push({ id: randomId(), agenda: "enfermeria", date: ymd(year, month, Math.min(15, daysInMonth(year, month))), is_open: true, created_at: nowIso });

  const patients: Row[] = [
    { id: randomId(), first_name: "María", last_name: "García Pérez", phone: "600111222", insurance_company_id: adeslas.id, dni: null, notes: null, created_at: nowIso, updated_at: nowIso },
    { id: randomId(), first_name: "Juan", last_name: "López Ruiz", phone: "600333444", insurance_company_id: sanitas.id, dni: null, notes: null, created_at: nowIso, updated_at: nowIso },
    { id: randomId(), first_name: "Antonia", last_name: "Molina Ortega", phone: "600555666", insurance_company_id: null, dni: "12345678A", notes: null, created_at: nowIso, updated_at: nowIso },
  ];

  const firstAgendaDay = (agenda: string) => (agendaDays.find((d) => d.agenda === agenda)?.date as string | undefined) ?? ymd(year, month, 1);

  const appointments: Row[] = [
    {
      id: randomId(),
      agenda: "traumatologo",
      date: firstAgendaDay("traumatologo"),
      start_time: "16:00:00",
      duration_minutes: 15,
      patient_id: patients[0].id,
      particular_label: null,
      insurance_company_id: adeslas.id,
      appointment_type_id: null,
      status: "programada",
      pathology: null,
      prosthesis_brand: null,
      dni: null,
      observations: null,
      follow_up_date: null,
      whatsapp_sent_at: null,
      created_by: FAKE_USER.id,
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: randomId(),
      agenda: "traumatologo",
      date: firstAgendaDay("traumatologo"),
      start_time: "16:15:00",
      duration_minutes: 15,
      patient_id: null,
      particular_label: "Particular 16:15",
      insurance_company_id: null,
      appointment_type_id: null,
      status: "confirmada",
      pathology: null,
      prosthesis_brand: null,
      dni: null,
      observations: null,
      follow_up_date: null,
      whatsapp_sent_at: null,
      created_by: FAKE_USER.id,
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: randomId(),
      agenda: "quirofano",
      date: firstAgendaDay("quirofano"),
      start_time: "16:00:00",
      duration_minutes: 60,
      patient_id: patients[1].id,
      particular_label: null,
      insurance_company_id: sanitas.id,
      appointment_type_id: null,
      status: "pendiente",
      pathology: "Gonartrosis rodilla derecha",
      prosthesis_brand: null,
      dni: "87654321B",
      observations: "A la espera de confirmar quirófano",
      follow_up_date: ymd(year, month, Math.min(28, daysInMonth(year, month))),
      whatsapp_sent_at: null,
      created_by: FAKE_USER.id,
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: randomId(),
      agenda: "enfermeria",
      date: firstAgendaDay("enfermeria"),
      start_time: null,
      duration_minutes: null,
      patient_id: patients[2].id,
      particular_label: null,
      insurance_company_id: null,
      appointment_type_id: appointmentTypes[0].id,
      status: "programada",
      pathology: null,
      prosthesis_brand: null,
      dni: null,
      observations: null,
      follow_up_date: null,
      whatsapp_sent_at: null,
      created_by: FAKE_USER.id,
      created_at: nowIso,
      updated_at: nowIso,
    },
  ];

  return {
    profiles: [{ id: FAKE_USER.id, full_name: "Olga", role: "admin", created_at: nowIso }],
    insurance_companies: insuranceCompanies,
    appointment_types: appointmentTypes,
    agenda_config: agendaConfig,
    agenda_days: agendaDays,
    patients,
    appointments,
  };
}

declare global {
  var __danteFakeStore__: Store | undefined;
}

// En globalThis para sobrevivir al Fast Refresh de `next dev` (si no, cada
// recompilación reiniciaría los datos de la demo).
export function getFakeStore(): Store {
  if (!globalThis.__danteFakeStore__) {
    globalThis.__danteFakeStore__ = seed();
  }
  return globalThis.__danteFakeStore__;
}
