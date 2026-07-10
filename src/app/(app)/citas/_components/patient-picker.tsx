"use client";

import { useEffect, useRef, useState } from "react";
import { searchPatientsAction, type PatientSearchResult } from "@/lib/actions/patients";

type SelectedPatient = { id: string; label: string; phone?: string };

type Props = {
  initialPatient?: SelectedPatient | null;
  onPatientSelected: (patient: PatientSearchResult | null) => void;
};

export function PatientPicker({ initialPatient, onPatientSelected }: Props) {
  const [query, setQuery] = useState(initialPatient?.label ?? "");
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [selected, setSelected] = useState(initialPatient ?? null);
  const [showNewPatientFields, setShowNewPatientFields] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selected || query.trim().length < 2) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const matches = await searchPatientsAction(query);
      setResults(matches);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  const visibleResults = selected || query.trim().length < 2 ? [] : results;

  function selectPatient(patient: PatientSearchResult) {
    setSelected({ id: patient.id, label: `${patient.first_name} ${patient.last_name}`, phone: patient.phone });
    setQuery(`${patient.first_name} ${patient.last_name}`);
    setResults([]);
    onPatientSelected(patient);
  }

  function clearSelection() {
    setSelected(null);
    setQuery("");
    onPatientSelected(null);
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="patient_id" value={selected?.id ?? ""} />

      {selected ? (
        <div className="space-y-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-900">{selected.label}</span>
            <button type="button" onClick={clearSelection} className="text-sm text-slate-500 hover:text-slate-900">
              Cambiar
            </button>
          </div>
          <p className="text-sm text-slate-700">
            <span className="text-slate-500">Teléfono:</span> {selected.phone || "—"}
          </p>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o teléfono…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            autoComplete="off"
          />
          {visibleResults.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-md">
              {visibleResults.map((patient) => (
                <li key={patient.id}>
                  <button
                    type="button"
                    onClick={() => selectPatient(patient)}
                    className="block w-full px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <span className="block text-slate-900">
                      {patient.first_name} {patient.last_name}
                    </span>
                    <span className="block text-sm text-slate-500">{patient.phone}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!selected && (
        <button
          type="button"
          onClick={() => setShowNewPatientFields((v) => !v)}
          className="text-sm text-slate-500 underline hover:text-slate-900"
        >
          {showNewPatientFields ? "Cancelar alta de paciente nuevo" : "No está en la lista: registrar paciente nuevo"}
        </button>
      )}

      {!selected && showNewPatientFields && (
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-dashed border-slate-300 p-3">
          <input
            name="new_first_name"
            placeholder="Nombre"
            autoComplete="given-name"
            className="col-span-1 rounded-lg border border-slate-300 px-3 py-2"
          />
          <input
            name="new_last_name"
            placeholder="Apellidos"
            autoComplete="family-name"
            className="col-span-1 rounded-lg border border-slate-300 px-3 py-2"
          />
          <input
            name="new_phone"
            type="tel"
            inputMode="tel"
            placeholder="Teléfono"
            autoComplete="tel"
            className="col-span-2 rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
      )}
    </div>
  );
}
