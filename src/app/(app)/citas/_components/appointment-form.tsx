"use client";

import { useActionState, useEffect, useState } from "react";
import { PatientPicker } from "./patient-picker";
import { checkOverlapAction, type AppointmentFormState } from "@/lib/actions/appointments";
import { statusesForAgenda, defaultStatusForReminder, isConfirmableStatus } from "@/lib/domain/agendas";
import { timeToMinutes, minutesToTime } from "@/lib/domain/slots";
import type { AgendaType, AppointmentStatus } from "@/lib/supabase/database.types";
import type { PatientSearchResult } from "@/lib/actions/patients";

type Company = { id: string; name: string; duration_minutes: number | null };
type ApptType = { id: string; name: string; default_duration_minutes: number };

export type AppointmentFormDefaults = {
  date: string;
  start_time: string;
  end_time: string;
  patient: { id: string; label: string } | null;
  particular_label: string;
  insurance_company_id: string;
  appointment_type_id: string;
  status: AppointmentStatus;
  pathology: string;
  prosthesis_brand: string;
  dni: string;
  observations: string;
  needs_reminder: boolean;
};

export function AppointmentForm({
  agenda,
  appointmentId,
  action,
  insuranceCompanies,
  appointmentTypes,
  agendaDefaultDurationMinutes,
  defaults,
}: {
  agenda: AgendaType;
  appointmentId?: string;
  action: (state: AppointmentFormState, formData: FormData) => Promise<AppointmentFormState>;
  insuranceCompanies: Company[];
  appointmentTypes: ApptType[];
  agendaDefaultDurationMinutes: number;
  defaults: AppointmentFormDefaults;
}) {
  const [state, formAction, pending] = useActionState<AppointmentFormState, FormData>(action, undefined);

  const [patientMode, setPatientMode] = useState<"registrado" | "particular">(
    defaults.patient || !defaults.particular_label ? "registrado" : "particular",
  );
  const [date, setDate] = useState(defaults.date);
  const [startTime, setStartTime] = useState(defaults.start_time);
  const [endTime, setEndTime] = useState(defaults.end_time);
  const [insuranceCompanyId, setInsuranceCompanyId] = useState(defaults.insurance_company_id);
  const [status, setStatus] = useState<AppointmentStatus>(defaults.status);
  const [needsReminder, setNeedsReminder] = useState(defaults.needs_reminder);
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);

  // El check "avisar antes de la cita" decide entre los dos estados de "confirmada": si el
  // estado actual ya es uno de los dos, lo actualiza; si está en completada/no presentado/
  // cancelada/pendiente, no lo toca (eso se cambia a mano desde el desplegable de estado).
  function handleReminderToggle(checked: boolean) {
    setNeedsReminder(checked);
    setStatus((prev) => (isConfirmableStatus(prev) ? defaultStatusForReminder(checked) : prev));
  }

  const isQuirofano = agenda === "quirofano";
  const isEnfermeria = agenda === "enfermeria";

  useEffect(() => {
    if (isEnfermeria) return;
    const timeout = setTimeout(async () => {
      if (!date || !startTime || !endTime) return;
      const duration = timeToMinutes(endTime) - timeToMinutes(startTime);
      if (duration <= 0) return;
      const warning = await checkOverlapAction(agenda, date, startTime, duration, appointmentId);
      setOverlapWarning(warning);
    }, 300);
    return () => clearTimeout(timeout);
  }, [agenda, date, startTime, endTime, appointmentId, isEnfermeria]);

  // La duración por defecto es la de la agenda, salvo que la compañía tenga una propia configurada
  // en el backoffice (los particulares no son una compañía, así que siempre usan la de la agenda).
  function durationForCompany(companyId: string): number {
    const company = insuranceCompanies.find((c) => c.id === companyId);
    return company?.duration_minutes ?? agendaDefaultDurationMinutes;
  }

  function applyCompany(companyId: string) {
    setInsuranceCompanyId(companyId);
    if (!isEnfermeria && startTime) {
      setEndTime(minutesToTime(timeToMinutes(startTime) + durationForCompany(companyId)));
    }
  }

  function handlePatientSelected(patient: PatientSearchResult | null) {
    if (patient?.insurance_company_id) {
      applyCompany(patient.insurance_company_id);
    }
  }

  const statusOptions = statusesForAgenda(agenda);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="agenda" value={agenda} />

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700" htmlFor="date">
          Fecha
        </label>
        <input
          id="date"
          name="date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
        />
      </div>

      {!isEnfermeria && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="start_time">
              Hora inicio
            </label>
            <input
              id="start_time"
              name="start_time"
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="end_time">
              Hora fin
            </label>
            <input
              id="end_time"
              name="end_time"
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </div>
        </div>
      )}

      {overlapWarning && (
        <p className="rounded-lg bg-accent-100 px-3 py-2 text-sm text-accent-600">⚠ {overlapWarning}</p>
      )}

      {isEnfermeria && (
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700" htmlFor="appointment_type_id">
            Tipo de cita
          </label>
          <select
            id="appointment_type_id"
            name="appointment_type_id"
            defaultValue={defaults.appointment_type_id}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          >
            <option value="">— Sin especificar —</option>
            {appointmentTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Paciente</p>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="patient_mode"
              value="registrado"
              checked={patientMode === "registrado"}
              onChange={() => setPatientMode("registrado")}
            />
            Registrado
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="patient_mode"
              value="particular"
              checked={patientMode === "particular"}
              onChange={() => setPatientMode("particular")}
            />
            Particular (sin registrar)
          </label>
        </div>

        {patientMode === "registrado" ? (
          <PatientPicker initialPatient={defaults.patient} onPatientSelected={handlePatientSelected} />
        ) : (
          <input
            name="particular_label"
            placeholder={isEnfermeria || !startTime ? "Particular" : `Particular ${startTime}`}
            defaultValue={defaults.particular_label}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700" htmlFor="insurance_company_id">
          Compañía
        </label>
        <select
          id="insurance_company_id"
          name="insurance_company_id"
          value={insuranceCompanyId}
          onChange={(e) => applyCompany(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
        >
          <option value="">Particular</option>
          {insuranceCompanies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700" htmlFor="status">
          Estado
        </label>
        <select
          id="status"
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
        >
          {statusOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {isQuirofano && (
        <div className="space-y-3 rounded-lg border border-slate-200 p-3">
          <p className="text-sm font-medium text-slate-700">Datos de quirófano</p>
          <input
            name="pathology"
            placeholder="Patología o motivo"
            defaultValue={defaults.pathology}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
          <input
            name="prosthesis_brand"
            placeholder="Marca de la prótesis"
            defaultValue={defaults.prosthesis_brand}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
          <input
            name="dni"
            placeholder="DNI"
            defaultValue={defaults.dni}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700" htmlFor="observations">
          Observaciones
        </label>
        <textarea
          id="observations"
          name="observations"
          rows={2}
          defaultValue={defaults.observations}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          name="needs_reminder"
          checked={needsReminder}
          onChange={(e) => handleReminderToggle(e.target.checked)}
          className="h-4 w-4"
        />
        Avisar antes de la cita
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 py-3 font-medium text-white disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar cita"}
      </button>
    </form>
  );
}
