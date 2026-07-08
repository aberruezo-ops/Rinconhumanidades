"use server";

import Anthropic from "@anthropic-ai/sdk";
import { requireAdmin, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isAgendaType } from "@/lib/domain/agendas";
import { minutesToTime, timeToMinutes } from "@/lib/domain/slots";
import type { AgendaType } from "@/lib/supabase/database.types";

export type InterpretedAppointment = {
  agenda: AgendaType;
  date: string;
  start_time: string | null;
  end_time: string | null;
  patient_name: string | null;
  is_particular: boolean;
  appointment_type: string | null;
  observations: string | null;
  matched_patient: { id: string; label: string } | null;
};

export type InterpretResult = { data?: InterpretedAppointment; error?: string };

const EXTRACT_TOOL: Anthropic.Tool = {
  name: "extraer_cita",
  description: "Extrae los datos de una cita médica a partir de un texto dictado o pegado en español.",
  input_schema: {
    type: "object",
    properties: {
      agenda: {
        type: "string",
        enum: ["traumatologo", "enfermeria", "quirofano"],
        description: "traumatologo = consulta de traumatología, enfermeria = curas/PRP, quirofano = cirugía",
      },
      date: { type: "string", description: "Fecha en formato YYYY-MM-DD, resuelta a partir de la fecha de hoy indicada" },
      start_time: {
        type: ["string", "null"],
        description: "Hora de inicio en formato HH:MM (24h), o null si no se menciona ninguna hora",
      },
      end_time: {
        type: ["string", "null"],
        description: "Hora de fin en formato HH:MM (24h), o null si no se menciona ni se puede deducir",
      },
      patient_name: { type: ["string", "null"], description: "Nombre completo del paciente si se menciona, o null" },
      is_particular: {
        type: "boolean",
        description: "true si se dice 'particular' o no se menciona ningún paciente/aseguradora concreto",
      },
      appointment_type: {
        type: ["string", "null"],
        enum: ["Cura", "PRP", null],
        description: "Solo relevante si agenda es enfermeria",
      },
      observations: { type: ["string", "null"], description: "Motivo, patología u observaciones mencionadas" },
    },
    required: ["agenda", "date", "is_particular"],
  },
};

function escapeLike(value: string): string {
  return value.replace(/[%_]/g, (m) => `\\${m}`);
}

export async function interpretAppointmentTextAction(
  text: string,
  hints: { agenda?: string; date?: string },
): Promise<InterpretResult> {
  const user = await requireUser();
  requireAdmin(user);

  const trimmed = text.trim();
  if (!trimmed) return { error: "Escribe o dicta algo primero." };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { error: "Falta configurar ANTHROPIC_API_KEY en el servidor para poder interpretar texto." };
  }

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const weekday = now.toLocaleDateString("es-ES", { weekday: "long", timeZone: "UTC" });

  const client = new Anthropic({ apiKey });

  let response;
  try {
    response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system:
        `Eres un asistente que extrae los datos de una cita de una consulta de traumatología a partir ` +
        `de texto dictado o pegado en español. Hoy es ${todayIso} (${weekday}). Resuelve fechas relativas ` +
        `("mañana", "el martes que viene", "pasado mañana", etc.) respecto a esa fecha. ` +
        `Las agendas posibles son: traumatologo (consulta), enfermeria (curas o PRP, normalmente sin hora ` +
        `si no se menciona ninguna), quirofano (cirugía). Usa la agenda que se deduzca del texto, aunque ` +
        `difiera de la pista sugerida. Si no se menciona hora de fin, deja end_time en null.`,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "tool", name: "extraer_cita" },
      messages: [
        {
          role: "user",
          content:
            `Pista de agenda sugerida: ${hints.agenda ?? "ninguna"}. ` +
            `Pista de fecha sugerida: ${hints.date ?? "ninguna"}.\n\n` +
            `Texto a interpretar:\n"""${trimmed}"""`,
        },
      ],
    });
  } catch {
    return { error: "No se ha podido contactar con el servicio de interpretación. Inténtalo de nuevo." };
  }

  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUse) return { error: "No se ha podido interpretar el texto." };

  const raw = toolUse.input as Record<string, unknown>;
  const agenda = String(raw.agenda ?? "");
  if (!isAgendaType(agenda)) return { error: "No se ha podido determinar la agenda a partir del texto." };

  const date = typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : hints.date;
  if (!date) return { error: "No se ha podido determinar la fecha a partir del texto." };

  let startTime = typeof raw.start_time === "string" && /^\d{2}:\d{2}$/.test(raw.start_time) ? raw.start_time : null;
  let endTime = typeof raw.end_time === "string" && /^\d{2}:\d{2}$/.test(raw.end_time) ? raw.end_time : null;

  const supabase = await createClient();

  if (agenda === "enfermeria") {
    startTime = null;
    endTime = null;
  } else if (startTime && !endTime) {
    const { data: config } = await supabase
      .from("agenda_config")
      .select("default_duration_minutes")
      .eq("agenda", agenda)
      .single();
    endTime = minutesToTime(timeToMinutes(startTime) + (config?.default_duration_minutes ?? 15));
  }

  const patientName = typeof raw.patient_name === "string" ? raw.patient_name.trim() : null;
  const isParticular = Boolean(raw.is_particular) || !patientName;

  let matchedPatient: { id: string; label: string } | null = null;
  if (!isParticular && patientName) {
    const escaped = escapeLike(patientName);
    const { data: matches } = await supabase
      .from("patients")
      .select("id, first_name, last_name")
      .or(`first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%`)
      .limit(1);
    if (matches && matches[0]) {
      matchedPatient = { id: matches[0].id, label: `${matches[0].first_name} ${matches[0].last_name}` };
    }
  }

  return {
    data: {
      agenda,
      date,
      start_time: startTime,
      end_time: endTime,
      patient_name: patientName,
      is_particular: isParticular,
      appointment_type: typeof raw.appointment_type === "string" ? raw.appointment_type : null,
      observations: typeof raw.observations === "string" ? raw.observations : null,
      matched_patient: matchedPatient,
    },
  };
}
