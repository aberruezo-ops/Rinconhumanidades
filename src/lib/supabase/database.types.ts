// Tipos escritos a mano a partir de supabase/migrations/0001_init.sql.
// Si el esquema cambia, actualizar este archivo junto con la migración.

export type AppRole = "admin" | "readonly";
export type AgendaType = "traumatologo" | "enfermeria" | "quirofano";
export type AppointmentStatus =
  | "programada"
  | "confirmada"
  | "completada"
  | "no_presentado"
  | "cancelada"
  | "pendiente";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: AppRole;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: AppRole;
        };
        Update: {
          full_name?: string | null;
          role?: AppRole;
        };
        Relationships: [];
      };
      insurance_companies: {
        Row: {
          id: string;
          name: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          active?: boolean;
        };
        Update: {
          name?: string;
          active?: boolean;
        };
        Relationships: [];
      };
      appointment_types: {
        Row: {
          id: string;
          agenda: AgendaType;
          name: string;
          default_duration_minutes: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          agenda: AgendaType;
          name: string;
          default_duration_minutes: number;
          active?: boolean;
        };
        Update: {
          agenda?: AgendaType;
          name?: string;
          default_duration_minutes?: number;
          active?: boolean;
        };
        Relationships: [];
      };
      agenda_config: {
        Row: {
          agenda: AgendaType;
          default_weekdays: number[];
          default_duration_minutes: number;
          start_time: string;
          end_time: string;
          notice_days_default: number;
          updated_at: string;
        };
        Insert: {
          agenda: AgendaType;
          default_weekdays?: number[];
          default_duration_minutes?: number;
          start_time?: string;
          end_time?: string;
          notice_days_default?: number;
        };
        Update: {
          default_weekdays?: number[];
          default_duration_minutes?: number;
          start_time?: string;
          end_time?: string;
          notice_days_default?: number;
        };
        Relationships: [];
      };
      agenda_days: {
        Row: {
          id: string;
          agenda: AgendaType;
          date: string;
          is_open: boolean;
          start_time_override: string | null;
          end_time_override: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agenda: AgendaType;
          date: string;
          is_open: boolean;
          start_time_override?: string | null;
          end_time_override?: string | null;
        };
        Update: {
          is_open?: boolean;
          start_time_override?: string | null;
          end_time_override?: string | null;
        };
        Relationships: [];
      };
      patients: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          phone: string;
          insurance_company_id: string | null;
          dni: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          phone: string;
          insurance_company_id?: string | null;
          dni?: string | null;
          notes?: string | null;
        };
        Update: {
          first_name?: string;
          last_name?: string;
          phone?: string;
          insurance_company_id?: string | null;
          dni?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "patients_insurance_company_id_fkey";
            columns: ["insurance_company_id"];
            isOneToOne: false;
            referencedRelation: "insurance_companies";
            referencedColumns: ["id"];
          },
        ];
      };
      appointments: {
        Row: {
          id: string;
          agenda: AgendaType;
          date: string;
          start_time: string;
          duration_minutes: number;
          starts_at: string;
          ends_at: string;
          patient_id: string | null;
          particular_label: string | null;
          insurance_company_id: string | null;
          appointment_type_id: string | null;
          status: AppointmentStatus;
          pathology: string | null;
          prosthesis_brand: string | null;
          dni: string | null;
          observations: string | null;
          follow_up_date: string | null;
          whatsapp_sent_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agenda: AgendaType;
          date: string;
          start_time: string;
          duration_minutes: number;
          patient_id?: string | null;
          particular_label?: string | null;
          insurance_company_id?: string | null;
          appointment_type_id?: string | null;
          status?: AppointmentStatus;
          pathology?: string | null;
          prosthesis_brand?: string | null;
          dni?: string | null;
          observations?: string | null;
          follow_up_date?: string | null;
          whatsapp_sent_at?: string | null;
          created_by?: string | null;
        };
        Update: {
          agenda?: AgendaType;
          date?: string;
          start_time?: string;
          duration_minutes?: number;
          patient_id?: string | null;
          particular_label?: string | null;
          insurance_company_id?: string | null;
          appointment_type_id?: string | null;
          status?: AppointmentStatus;
          pathology?: string | null;
          prosthesis_brand?: string | null;
          dni?: string | null;
          observations?: string | null;
          follow_up_date?: string | null;
          whatsapp_sent_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_insurance_company_id_fkey";
            columns: ["insurance_company_id"];
            isOneToOne: false;
            referencedRelation: "insurance_companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_appointment_type_id_fkey";
            columns: ["appointment_type_id"];
            isOneToOne: false;
            referencedRelation: "appointment_types";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
