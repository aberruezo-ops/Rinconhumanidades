"use client";

import { useRef, useState } from "react";
import { interpretAppointmentTextAction, type InterpretedAppointment } from "@/lib/actions/dictation";
import { createAppointmentAction } from "@/lib/actions/appointments";
import { agendaLabel, DEFAULT_NEW_APPOINTMENT_STATUS } from "@/lib/domain/agendas";
import { AppointmentForm, type AppointmentFormDefaults } from "../_components/appointment-form";

type Company = { id: string; name: string; duration_minutes: number | null };
type ApptType = { id: string; name: string; default_duration_minutes: number };

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export function DictadoFlow({
  insuranceCompanies,
  appointmentTypes,
  agendaDurations,
  hintAgenda,
  hintDate,
}: {
  insuranceCompanies: Company[];
  appointmentTypes: ApptType[];
  agendaDurations: Record<string, number>;
  hintAgenda?: string;
  hintDate?: string;
}) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InterpretedAppointment | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  function toggleDictado() {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      setError("Este navegador no admite dictado por voz. Escribe o pega el texto.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new Ctor();
    recognition.lang = "es-ES";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const chunks: string[] = [];
      for (let i = 0; i < event.results.length; i++) {
        chunks.push(event.results[i][0].transcript);
      }
      setText((prev) => (prev ? `${prev} ${chunks.join(" ")}` : chunks.join(" ")));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  function clearText() {
    recognitionRef.current?.stop();
    setListening(false);
    setText("");
    setError(null);
  }

  async function handleInterpret() {
    setPending(true);
    setError(null);
    const res = await interpretAppointmentTextAction(text, { agenda: hintAgenda, date: hintDate });
    setPending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setResult(res.data ?? null);
  }

  if (result) {
    const defaults: AppointmentFormDefaults = {
      date: result.date,
      start_time: result.start_time ?? "",
      end_time: result.end_time ?? "",
      patient: result.matched_patient,
      particular_label: result.is_particular ? (result.patient_name ?? "") : "",
      insurance_company_id: "",
      appointment_type_id: appointmentTypes.find((t) => t.name === result.appointment_type)?.id ?? "",
      status: DEFAULT_NEW_APPOINTMENT_STATUS,
      pathology: "",
      prosthesis_brand: "",
      dni: "",
      observations: result.observations ?? "",
    };

    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">
          Interpretado como <strong>{agendaLabel(result.agenda)}</strong>. Revisa los datos y ajusta lo que haga falta
          antes de guardar — todavía no se ha guardado nada.
        </div>
        <button type="button" onClick={() => setResult(null)} className="text-sm text-slate-500 underline">
          ← Volver a dictar
        </button>
        <AppointmentForm
          agenda={result.agenda}
          action={createAppointmentAction}
          insuranceCompanies={insuranceCompanies}
          appointmentTypes={appointmentTypes}
          agendaDefaultDurationMinutes={agendaDurations[result.agenda] ?? 15}
          defaults={defaults}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Di o pega algo como: «Cita para Juan Pérez el martes a las cinco de la tarde, traumatología».
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="Dicta o pega aquí el texto de la cita…"
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={toggleDictado}
          className={`flex-1 rounded-lg py-2.5 text-sm font-medium ${
            listening ? "bg-red-600 text-white" : "border border-slate-300 text-slate-700"
          }`}
        >
          {listening ? "⏹ Detener" : "🎤 Dictar"}
        </button>
        <button
          type="button"
          onClick={handleInterpret}
          disabled={pending || !text.trim()}
          className="flex-1 rounded-lg bg-brand-600 hover:bg-brand-700 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Interpretando…" : "Interpretar"}
        </button>
      </div>
      {text.trim() && (
        <button type="button" onClick={clearText} className="text-sm text-slate-500 underline hover:text-slate-900">
          Borrar texto
        </button>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
