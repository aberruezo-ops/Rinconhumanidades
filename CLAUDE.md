@AGENTS.md

# Dante — gestión de citas de traumatología

Lee **ESPECIFICACION.md** antes de tocar nada: ahí está el producto completo (usuarios, las tres agendas, backoffice, datos, fases).

## Stack

- Next.js 16 (App Router, `src/` dir, TypeScript, Tailwind v4) — instalado en este repo, no v15/v14. Su documentación embebida vive en `node_modules/next/dist/docs/`; léela antes de asumir APIs de versiones anteriores (`params`/`searchParams` son `Promise` siempre, `middleware.ts` se llama `proxy.ts` con función `proxy()`, `cookies()`/`headers()` son async).
- Supabase (Postgres + Auth + RLS) como backend. Migraciones SQL en `supabase/migrations/`.
- Sin librería de componentes; Tailwind a mano, mobile-first (la usuaria trabaja principalmente desde el móvil).

## Idioma

Todo el texto visible de la interfaz, mensajes, commits y nombres de página van en **español**. Identificadores de código (variables, tablas, columnas) en inglés.

## Reglas de dominio que no hay que romper

- Tres agendas fijas: `traumatologo`, `enfermeria`, `quirofano`. No añadir una cuarta sin que lo pida el usuario.
- Una cita solo puede crearse en un día abierto de su agenda (`agenda_days.is_open = true`). Si no hay fila para esa fecha, el día se considera cerrado.
- Los pacientes "particulares" no se registran como paciente: la cita (o el candidato de quirófano) puede llevar `particular_label` en vez de `patient_id`. Aun así, **el teléfono es imprescindible siempre, sin excepción**: tanto `appointments` como `quirofano_candidatos` tienen su columna `particular_phone` (paralela a `particular_label`), exigida por la app al dar de alta o editar cualquiera de las dos, particular o registrado. El campo Teléfono debe mostrarse siempre en cualquier sitio donde aparezca el paciente — alta, edición, consulta, cancelar/descartar y cualquier listado —, venga de `patients.phone` (registrado) o de `particular_phone` (particular). Si se añade en el futuro cualquier otro lugar donde se cree o edite un paciente particular, debe llevar este mismo campo obligatorio desde el principio.
- El DNI solo se pide en quirófano.
- Compañía aseguradora siempre se elige del catálogo (`insurance_companies`), nunca texto libre. "Particular" = `insurance_company_id` nulo, no es una fila de la tabla.
- Solapes: la app avisa antes de guardar si hay choque de horario, pero **no bloquea**: se puede guardar más de una cita a la misma hora a propósito (sobrecarga de agenda). No hay `EXCLUDE` constraint en Postgres para esto — se quitó deliberadamente; no reintroducirlo.
- Enfermería no tiene hora: `appointments.start_time`/`duration_minutes` son `null` siempre que `agenda = 'enfermeria'` (y obligatorios en el resto). El formulario pide "Hora inicio"/"Hora fin" (no duración) para traumatólogo/quirófano; en enfermería no se muestra ningún campo de hora. Al escribir o cambiar la hora de inicio, la hora de fin se recalcula sola según la duración configurada en el backoffice (por agenda, o por compañía si tiene una propia) — nunca se deja en blanco a la espera de que la rellene la usuaria.
- Roles: `admin` (Olga, único activo) y `readonly` (futuro traumatólogo). Las políticas RLS ya contemplan ambos aunque hoy solo exista `admin`.
- Alta de cita por dictado/texto libre (`/citas/dictado`, usa `ANTHROPIC_API_KEY`): la IA solo rellena el formulario normal, nunca guarda directamente — la confirmación visual antes de guardar es obligatoria.

## Fases

Solo se construye la Fase 1 (MVP) salvo que se indique lo contrario. La entrada por voz/texto libre se adelantó a la Fase 1. Fase 2 (avisos de seguimiento, botón WhatsApp) y Fase 3 (SMS, exportación) quedan fuera hasta que se pida explícitamente.

## Verificación

Tras cada bloque de cambios, comprobar que compila: `npm run build` (o `npx tsc --noEmit` para una comprobación más rápida de tipos).
