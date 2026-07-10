# Dante. Gestión de citas para consulta de traumatología

## Contexto

Consulta privada de traumatología en Jaén. La usuaria principal es una administrativa que gestiona toda la agenda desde el móvil, a veces tablet o escritorio. Hoy trabaja con Doctoralia y una agenda que le dan problemas: citas que no se comunican al paciente, pacientes que entran en días cerrados y aparecen en la puerta sin previo aviso, y ninguna flexibilidad para abrir o cerrar días sueltos. Esta aplicación sustituye la gestión interna. Doctoralia queda fuera del alcance (como mucho, canal de captación externo).

## Usuarios

- **Olga (administrativa)**: usuaria principal y única en el MVP. Acceso completo con contraseña.
- **Traumatólogo (futuro)**: rol de solo lectura limitado a zonas muy concretas, principalmente listados. No se implementa en el MVP, pero el sistema de autenticación y permisos debe nacer preparado para dos roles (admin y lectura) para no rehacerlo después.

No hay portal de pacientes ni reserva online en esta versión.

## Las tres agendas

1. **Traumatólogo (Alex)**. Consulta. Día y horario por defecto: lunes de 16:00 a 20:30.
2. **Enfermería**. Curas y PRP. Día por defecto: lunes, coincidiendo con el día de la consulta de traumatología (jornada 17:00 a 19:30, aunque el patrón se puede dejar sin días y abrir solo un día concreto cuando se acumulan casos). Las citas de enfermería **no llevan hora exacta**: solo día, paciente y tipo (cura o PRP) — no hay solapes que comprobar, solo importa qué pacientes tocan ese día.
3. **Quirófano**. Día por defecto: lunes, a partir de las 12:00 (jornada configurada hasta las 21:30, aunque en la práctica no hay una hora de fin fija: se apunta a todos los pacientes que necesiten quirófano ese día). Dos estados propios: **programado** y **pendiente** (pre-reserva a la espera de confirmación, requiere seguimiento).

Estos son solo los valores de partida: desde el backoffice se puede cambiar el día (cualquier día de la semana, no solo el indicado) y el horario de cada agenda en cualquier momento.

## Backoffice de configuración (requisito crítico)

Zona de administración separada de la agenda diaria donde Olga define el funcionamiento de la consulta sin tocar código:

- **Días por defecto de cada agenda**: qué días de la semana pasa consulta el traumatólogo (hoy lunes), enfermería (hoy martes) y quirófano (hoy miércoles). Cambiable en cualquier momento a cualquier día.
- **Duración por defecto de las citas**, configurable por agenda o por tipo de cita (consulta, cura, infiltración, quirófano). Los huecos de la agenda se generan a partir de esta duración y del horario de jornada.
- **Horario de jornada**: hora de inicio y fin por agenda.
- **Catálogo de compañías aseguradoras**: alta, edición y baja. En los formularios de cita la compañía se elige de este catálogo (más "Particular"), no se escribe a mano, para evitar variantes tipo "Adeslas" / "adeslas" / "ADESLAS". Cada compañía puede usar la duración por defecto de la agenda o una duración personalizada propia (en minutos); al elegir esa compañía en una cita, la hora de fin se recalcula sola. "Particular" siempre usa la duración por defecto (su hora de fin se ajusta a mano, como siempre).
- **Tipos de cita de enfermería** (cura, PRP), editables.
- Días de antelación del aviso al paciente (para cuando lleguen los SMS de la fase 3).
- **Base de datos de pacientes** (`/backoffice/pacientes`): listado buscable por nombre o teléfono de todos los pacientes registrados (los particulares no aparecen, no se registran). Cada paciente tiene su ficha con teléfono, compañía, DNI/notas si los tiene, y su historial completo de citas (próximas y pasadas) en las tres agendas.

### Gestión de días (dentro del backoffice)

Interfaz semana a semana (no un calendario de casillas sueltas): para cada semana del mes se
elige qué día o días de esa semana hay consulta (checkboxes L-D) y la hora de inicio/fin de
esa semana, con un botón para guardar la semana. Una semana sin ningún día marcado queda
cerrada. Esto permite:

- Rellenar el mes completo de un click según el día por defecto ("Rellenar según patrón"), y
  luego ajustar semana a semana lo que se salga del patrón.
- Cambiar el día de la semana en una semana puntual (desmarcar el día habitual, marcar otro) y/o
  darle un horario distinto al de la jornada general, sin tocar el patrón por defecto.
- Avanzar al mes siguiente para seguir programando.

Una cita solo puede crearse en un día abierto de su agenda. Un hueco ocupado deja de estar disponible inmediatamente.

## Datos

### Paciente (registrado)
- Nombre, apellidos, teléfono, compañía aseguradora (seleccionada del catálogo del backoffice).
- DNI solo se solicita en quirófano.
- Los pacientes **particulares no se registran**: su cita ocupa hueco pero no guarda datos personales (opcionalmente una etiqueta libre tipo "particular 12:00"). A esos los llama ella por teléfono.

### Cita (todas las agendas)
- Agenda (traumatólogo / enfermería / quirófano), fecha. Hora de inicio y fin exactas en traumatólogo y quirófano (se elige directamente el rango, no una duración); en enfermería no se registra hora, solo el día.
- Paciente registrado (opcional si es particular) o etiqueta libre.
- Compañía aseguradora.
- Estado: confirmada sin avisar (recién creada, todavía sin recordatorio de WhatsApp), confirmada/avisada (ya se le ha avisado), completada, no presentado, cancelada. En quirófano además: pendiente. Toda cita nueva empieza en "confirmada sin avisar"; al avisar por WhatsApp pasa sola a "confirmada/avisada".

### Campos adicionales solo en quirófano
- Patología o motivo de la operación.
- Marca de la prótesis.
- DNI.
- Observaciones (texto libre).

### Seguimiento
- Se avisa por WhatsApp a todas las citas con paciente registrado (teléfono) que no estén canceladas ni completadas — no hay que marcar cita a cita quién necesita recordatorio. El botón de avisar aparece en la propia cita, en las agendas de traumatólogo, enfermería y quirófano, y también en Listados, coloreado según lo cerca que esté la cita: rojo con menos de 48h, amarillo entre 48h y 4 días, verde con más de 4 días. Al pulsarlo, si la cita estaba "confirmada sin avisar" pasa sola a "confirmada/avisada".
- Al abrir la app (Inicio) aparece además un aviso agregado con los pacientes a los que hay que llamar o escribir por WhatsApp dentro de los días de antelación configurados para esa agenda (`agenda_config.notice_days_default`), y los candidatos de quirófano cuya fecha aproximada deseada está a un mes o menos.
- **Candidatos de quirófano sin cita cerrada**: pacientes en estudio para quirófano que todavía no tienen día ni hora reservados — no son una cita, es una lista aparte (`/agenda/quirofano/candidatos`) con como mucho un paciente (o nombre libre), una fecha aproximada deseada (opcional) y observaciones. Al concretar día y hora se crea la cita real de quirófano de la forma habitual, y el candidato se marca como convertido (o se descarta si no sigue adelante).

## Creación de citas

- Formulario mínimo, optimizado para móvil: pocos campos, autocompletado de paciente por nombre o teléfono para evitar duplicados.
- **Entrada por voz o texto libre** (`/citas/dictado`, adelantada desde la Fase 2 original): botón de dictado que usa el reconocimiento nativo del dispositivo (Web Speech API), o pegar el texto directamente. El texto se interpreta con IA (fecha, hora, agenda, paciente, tipo, motivo) y se muestra la cita propuesta ya rellena en el formulario normal para confirmar y ajustar antes de guardar. Nunca se guarda sin confirmación visual. Requiere `ANTHROPIC_API_KEY`.
- Detección de solapes: si la nueva cita choca con otra existente, avisar antes de guardar.
- Reagendar en dos toques: mover una cita a otro día/hora abiertos.

## Comunicación con pacientes

- Implementado (adelantado desde la Fase 2 original): botón "avisar por WhatsApp" en cada cita de Listados que abre wa.me con un mensaje pretexto (fecha, hora, consulta). Sin coste, envío manual con un toque. La cita registra si el aviso se envió y cuándo (`whatsapp_sent_at`); solo aparece si hay paciente registrado con teléfono (no en particulares) y la cita no está cancelada/completada.
- Fase posterior: SMS automático de confirmación unos días antes (configurable), solo a pacientes registrados. Requiere proveedor de SMS con coste por mensaje; queda fuera del MVP.

## Listados

- Filtros combinables: fecha (opcional; vacío = próximas citas desde hoy), agenda, estado, aviso de WhatsApp (pendiente/enviado).
- Chips de filtro rápido: Hoy, cada agenda, "Confirmada sin avisar", "Por avisar (WhatsApp)" (sin aviso enviado), "Todas las próximas".
- Vista imprimible limpia (CSS de impresión).
- Compartir por WhatsApp o correo (Web Share API o enlaces mailto / wa.me con el texto del listado).

## Inicio (funcional, no solo un resumen)

- **Pacientes por avisar**: citas dentro de su ventana de antelación sin avisar todavía, y candidatos de quirófano cerca de su fecha deseada.
- **Recordatorios de mañana**: citas del día siguiente (cualquier agenda) con paciente registrado y sin avisar, con botón de WhatsApp directo — pensado para despachar de un tirón los avisos del día antes de cerrar la consulta.
- **Huecos libres del día**: por agenda, los huecos que quedan libres (traumatólogo y quirófano, con hora) o un acceso directo a "+ Nueva cita" (enfermería, sin hora). Cada hueco libre es un enlace que abre el formulario de nueva cita con agenda, fecha y hora ya rellenos.
- Acceso directo al cuadro de mandos.
- Calendario del mes (días abiertos por agenda) y citas del día por agenda, como hasta ahora.

## Cuadro de mandos (`/estadisticas`)

Solo admin. Navegación mes a mes (como el backoffice de días):

- Citas del mes (no canceladas), % de cancelaciones, % de no presentados.
- Ocupación: huecos ocupados / huecos generados en los días abiertos del mes, para traumatólogo y quirófano (enfermería no tiene huecos con hora, así que muestra total de citas y promedio por día en su lugar).
- Ratio por compañía aseguradora (incluye "Particular").
- Ratio en enfermería por tipo de cita (cura, PRP, …).
- Ratio de quirófano por estado (pendiente vs. resto).

## Rendimiento y facilidad de uso

- `requireUser()` (sesión + rol) se memoiza por petición (React `cache`): antes se repetía una vez en el layout y otra vez en cada página, duplicando el viaje a Supabase en cada navegación.
- Índices en Postgres para las consultas más repetidas: `appointments.patient_id` (historial de un paciente), `appointments.status`, `appointments(date) where whatsapp_sent_at is null` (avisos pendientes), `agenda_days(date) where is_open` (próximo día abierto), y trigram por columna en `patients.first_name`/`last_name` (la búsqueda de pacientes consulta cada columna por separado; el índice anterior era sobre el nombre completo concatenado y no lo usaba ninguna consulta real).
- Pantallas de carga (esqueleto) en las páginas con más consultas (Inicio, agenda, listados, cuadro de mandos, pacientes) para que la navegación nunca se quede en blanco mientras carga.
- Teclado adecuado en móvil: teléfono (`type="tel"`) al registrar un paciente nuevo, autocompletar de nombre/apellidos, mayúsculas automáticas en el DNI.
- Confirmación antes de cancelar una cita o descartar un candidato de quirófano (las únicas acciones de un toque que no se pueden deshacer fácilmente desde la interfaz).

## Seguridad y RGPD

- Datos de salud y DNI: categoría especial RGPD. Cifrado en tránsito (HTTPS) y en reposo (el proveedor de base de datos debe cifrarlo, ej. Supabase/Postgres).
- Autenticación obligatoria, sesión con expiración razonable, un solo usuario.
- Sin analítica de terceros ni trackers.
- Backup automático de la base de datos.

## Fuera de alcance (por ahora)

- Reserva online por parte del paciente.
- Integración o sincronización con Doctoralia.
- Gestión documental de informes (llegan por correo aparte).
- Multiusuario, facturación.

## Fases propuestas

**Fase 1 (MVP):** autenticación con roles preparados (solo Olga activa), backoffice de configuración (días por defecto, duraciones, jornada, compañías, tipos de cita), tres agendas con vista día/semana/mes, gestión de apertura/cierre de días, alta/edición/cancelación de citas con autocompletado y detección de solapes, campos de quirófano, estados, listados imprimibles.

**Fase 2:** avisos de seguimiento ("llamar antes de"), compartir listados. (La entrada por voz/texto libre y el botón WhatsApp con mensaje pretexto se adelantaron y ya están en la Fase 1.)

**Fase 3:** SMS automáticos, exportación de datos, mejoras que pida la usuaria tras uso real.
