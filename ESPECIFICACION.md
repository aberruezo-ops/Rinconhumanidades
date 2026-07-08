# Dante. Gestión de citas para consulta de traumatología

## Contexto

Consulta privada de traumatología en Jaén. La usuaria principal es una administrativa que gestiona toda la agenda desde el móvil, a veces tablet o escritorio. Hoy trabaja con Doctoralia y una agenda que le dan problemas: citas que no se comunican al paciente, pacientes que entran en días cerrados y aparecen en la puerta sin previo aviso, y ninguna flexibilidad para abrir o cerrar días sueltos. Esta aplicación sustituye la gestión interna. Doctoralia queda fuera del alcance (como mucho, canal de captación externo).

## Usuarios

- **Olga (administrativa)**: usuaria principal y única en el MVP. Acceso completo con contraseña.
- **Traumatólogo (futuro)**: rol de solo lectura limitado a zonas muy concretas, principalmente listados. No se implementa en el MVP, pero el sistema de autenticación y permisos debe nacer preparado para dos roles (admin y lectura) para no rehacerlo después.

No hay portal de pacientes ni reserva online en esta versión.

## Las tres agendas

1. **Traumatólogo (Alex)**. Consulta. Día y horario por defecto: lunes de 16:00 a 19:30.
2. **Enfermería**. Curas e infiltraciones (células madre, PRP). Día y horario por defecto: martes de 16:00 a 19:30 (aunque el patrón se puede dejar sin días y abrir solo un día concreto cuando se acumulan casos).
3. **Quirófano**. Día y horario por defecto: miércoles de 16:00 a 19:30. Dos estados propios: **programado** y **pendiente** (pre-reserva a la espera de confirmación, requiere seguimiento).

Estos son solo los valores de partida: desde el backoffice se puede cambiar el día (cualquier día de la semana, no solo el indicado) y el horario de cada agenda en cualquier momento.

## Backoffice de configuración (requisito crítico)

Zona de administración separada de la agenda diaria donde Olga define el funcionamiento de la consulta sin tocar código:

- **Días por defecto de cada agenda**: qué días de la semana pasa consulta el traumatólogo (hoy lunes), enfermería (hoy martes) y quirófano (hoy miércoles). Cambiable en cualquier momento a cualquier día.
- **Duración por defecto de las citas**, configurable por agenda o por tipo de cita (consulta, cura, infiltración, quirófano). Los huecos de la agenda se generan a partir de esta duración y del horario de jornada.
- **Horario de jornada**: hora de inicio y fin por agenda.
- **Catálogo de compañías aseguradoras**: alta, edición y baja. En los formularios de cita la compañía se elige de este catálogo (más "Particular"), no se escribe a mano, para evitar variantes tipo "Adeslas" / "adeslas" / "ADESLAS".
- **Tipos de cita de enfermería** (cura, infiltración de células madre, PRP), editables.
- Días de antelación del aviso al paciente (para cuando lleguen los SMS de la fase 3).

### Gestión de días (dentro del backoffice)

La administrativa debe poder, por agenda:

- Programar el mes completo según el día por defecto (ej. todos los lunes de agosto para traumatología).
- Abrir o cerrar cualquier día suelto, ignorando el patrón por defecto (ej. cerrar un lunes concreto, abrir un miércoles excepcional).
- Ver de un vistazo qué días están abiertos y cerrados.

Una cita solo puede crearse en un día abierto de su agenda. Un hueco ocupado deja de estar disponible inmediatamente.

## Datos

### Paciente (registrado)
- Nombre, apellidos, teléfono, compañía aseguradora (seleccionada del catálogo del backoffice).
- DNI solo se solicita en quirófano.
- Los pacientes **particulares no se registran**: su cita ocupa hueco pero no guarda datos personales (opcionalmente una etiqueta libre tipo "particular 12:00"). A esos los llama ella por teléfono.

### Cita (todas las agendas)
- Agenda (traumatólogo / enfermería / quirófano), fecha, hora exacta.
- Paciente registrado (opcional si es particular) o etiqueta libre.
- Compañía aseguradora.
- Estado: programada, confirmada, completada, no presentado, cancelada. En quirófano además: pendiente.

### Campos adicionales solo en quirófano
- Patología o motivo de la operación.
- Marca de la prótesis.
- DNI.
- Observaciones (texto libre).

### Seguimiento
- Cualquier cita puede llevar una fecha de aviso: "llamar antes del X". Pensado sobre todo para quirófanos pendientes a meses vista (ej. paciente interesado para septiembre, avisar a finales de agosto).
- Al abrir la app se muestran los avisos vencidos o próximos.

## Creación de citas

- Formulario mínimo, optimizado para móvil: pocos campos, autocompletado de paciente por nombre o teléfono para evitar duplicados.
- **Entrada por voz**: botón de dictado que usa el reconocimiento nativo del dispositivo (Web Speech API). El texto dictado se interpreta (nombre, fecha, hora, agenda, motivo) y se muestra la cita propuesta para confirmar con un toque antes de guardar. Nunca se guarda sin confirmación visual.
- Detección de solapes: si la nueva cita choca con otra existente, avisar antes de guardar.
- Reagendar en dos toques: mover una cita a otro día/hora abiertos.

## Comunicación con pacientes

- Fase inicial: botón "avisar por WhatsApp" en cada cita que abre wa.me con un mensaje pretexto (fecha, hora, consulta). Sin coste, envío manual con un toque. La cita registra si el aviso se envió y cuándo.
- Fase posterior: SMS automático de confirmación unos días antes (configurable), solo a pacientes registrados. Requiere proveedor de SMS con coste por mensaje; queda fuera del MVP.

## Listados

- Listado por día y por agenda, filtrable.
- Vista imprimible limpia (CSS de impresión).
- Compartir por WhatsApp o correo (Web Share API o enlaces mailto / wa.me con el texto del listado).

## Seguridad y RGPD

- Datos de salud y DNI: categoría especial RGPD. Cifrado en tránsito (HTTPS) y en reposo (el proveedor de base de datos debe cifrarlo, ej. Supabase/Postgres).
- Autenticación obligatoria, sesión con expiración razonable, un solo usuario.
- Sin analítica de terceros ni trackers.
- Backup automático de la base de datos.

## Fuera de alcance (por ahora)

- Reserva online por parte del paciente.
- Integración o sincronización con Doctoralia.
- Gestión documental de informes (llegan por correo aparte).
- Multiusuario, estadísticas, facturación.

## Fases propuestas

**Fase 1 (MVP):** autenticación con roles preparados (solo Olga activa), backoffice de configuración (días por defecto, duraciones, jornada, compañías, tipos de cita), tres agendas con vista día/semana/mes, gestión de apertura/cierre de días, alta/edición/cancelación de citas con autocompletado y detección de solapes, campos de quirófano, estados, listados imprimibles.

**Fase 2:** avisos de seguimiento ("llamar antes de"), botón WhatsApp con mensaje pretexto, compartir listados, entrada por voz con confirmación.

**Fase 3:** SMS automáticos, exportación de datos, mejoras que pida la usuaria tras uso real.
