# Contexto del proyecto — léeme primero

Este documento es el punto de entrada para retomar el proyecto desde cero, en cualquier
entorno (otra máquina, otra sesión de IA, otro desarrollador). Resume qué es esto, dónde
está cada cosa y en qué estado se quedó. Los detalles ya documentados en otros ficheros no
se repiten aquí — se enlazan.

## Qué es Dante

App interna de gestión de citas para una consulta privada de traumatología en Jaén.
Fase 1 (MVP), una sola usuaria administrativa (Olga) con acceso completo. Tres agendas fijas:
traumatólogo, enfermería, quirófano.

Documentación del producto, en orden de lectura recomendado:

1. **README.md** — stack, puesta en marcha, variables de entorno, despliegue, comandos.
2. **CLAUDE.md** — reglas de dominio que no hay que romper (leído automáticamente por Claude Code).
3. **ESPECIFICACION.md** — especificación completa del producto: usuarios, datos, fases.
4. Este fichero — estado actual, historial reciente, cosas pendientes de verificar.

## Cómo arrancar en un entorno nuevo

```bash
npm install
cp .env.example .env.local   # rellenar con las claves de Supabase (ver README.md)
npm run dev
```

Para trabajar sin Supabase real (demo con datos en memoria, útil para probar la interfaz
sin credenciales): `DEV_FAKE_BACKEND=true npm run dev` — login de prueba
`olga@dante.local` / `dante1234` (ver `src/lib/dev/fake-mode.ts`).

Verificación tras cualquier cambio: `npm run build` (falla si hay errores de tipos) o
`npx tsc --noEmit` para una comprobación más rápida.

## Mapa del código (grafo de dependencias)

`docs/dependency-graph.svg` — grafo de qué archivo importa a cuál dentro de `src/`, generado
con [madge](https://github.com/pahen/madge). Para regenerarlo tras cambios grandes de
estructura:

```bash
npm run graph
```

Requiere [Graphviz](https://graphviz.org) instalado en el sistema (`apt-get install graphviz`
/ `brew install graphviz`) — es la única dependencia externa al `npm install` habitual.

## Ramas de git

- `claude/trauma-patient-appointments-62xawm` — rama de desarrollo.
- `claude/danteGP` — rama de despliegue (Vercel apunta aquí: `dantegp.vercel.app`). Se
  actualiza con fast-forward desde la rama de desarrollo, nunca con historia distinta.

## Migraciones de Supabase — estado

Todas en `supabase/migrations/`, pensadas para pegarse y ejecutarse a mano en el SQL Editor
de Supabase (no hay CI que las aplique sola). Antes de dar nada por hecho, comprobar en el
propio Supabase (Table Editor / SQL Editor) qué se ha aplicado realmente:

```sql
-- Comprobación rápida de las dos últimas migraciones:
select column_name from information_schema.columns
where table_name = 'appointments' and column_name = 'particular_phone';
select column_name from information_schema.columns
where table_name = 'quirofano_candidatos' and column_name = 'particular_phone';
select conname from pg_constraint where conname = 'appointments_agenda_tsrange_excl';
-- Si esta última devuelve una fila, el EXCLUDE de solapes todavía existe y hay que
-- quitarlo (migración 0009) para que se puedan guardar citas solapadas a propósito.
```

`0009` y `0010` (teléfono obligatorio en particulares + solapes ya no bloquean) se añadieron
en esta sesión; en algún momento dieron error `PGRST204` en producción porque no se habían
ejecutado todavía. Verificar con la consulta de arriba antes de asumir que ya están aplicadas.

`0006` (estados `confirmada_sin_avisar`/`confirmada_avisada`) tiene una particularidad: hay
que ejecutarla en **dos pasos separados** en el editor de Supabase — ver el comentario dentro
del propio fichero.

## Limitaciones conocidas de iOS (ya resueltas, no reintroducir)

La usuaria trabaja principalmente desde un iPhone con la app añadida a la pantalla de
inicio (modo "standalone": a pantalla completa, sin la barra de Safari). Varias APIs del
navegador no funcionan ahí y ya se evitaron a propósito:

- **`window.print()`** no hace nada en standalone → `src/app/(app)/listados/print-button.tsx`
  detecta el modo y genera el PDF en el propio dispositivo (jsPDF + jspdf-autotable) con
  descarga directa en vez de depender del diálogo de imprimir.
- **`window.confirm()`** no es fiable en standalone (a veces no muestra nada y el toque
  queda sin efecto) → `src/app/(app)/_components/confirm-submit-button.tsx` implementa su
  propia confirmación en dos toques dentro de la página, sin diálogos nativos. Se usa en
  "Cancelar cita", "Eliminar cita y paciente" y "Descartar candidato".
- El nombre de fichero al descargar el PDF no debe llevar acentos: el atributo `download` de
  un enlace no siempre los respeta y el fichero acaba llamándose "download" a secas — ver
  `toAsciiFilename` en `print-button.tsx`.

Si se añade cualquier funcionalidad nueva que dependa de un diálogo nativo del navegador
(`alert`, `confirm`, `prompt`, `print`, selectors de fichero nativos, etc.), asumir que hay
que probarla en modo standalone o replicarla sin depender de la API nativa.

## Reglas de negocio que cambiaron respecto al diseño original

Estas ya están reflejadas en CLAUDE.md/ESPECIFICACION.md, pero se listan aquí porque
invierten decisiones tomadas anteriormente — para que no se deshagan por error:

- **Solapes de horario ya no bloquean el guardado** (antes había un `EXCLUDE` constraint en
  Postgres que sí bloqueaba). Ahora solo se avisa en el formulario; se puede guardar a
  propósito más de una cita a la misma hora (sobrecarga de agenda).
- **El teléfono es obligatorio siempre**, también para pacientes particulares (antes no se
  les pedía ningún dato de contacto). Columnas `particular_phone` en `appointments` y en
  `quirofano_candidatos`.
- **Eliminar cita** (borrado real, distinto de "Cancelar") se añadió como funcionalidad
  nueva — no estaba en el diseño original, que solo contemplaba cancelar (cambio de estado).

## Convenciones a mantener

- Todo el texto de interfaz, commits y nombres de página en **español**; identificadores de
  código en inglés.
- Sin librería de componentes; Tailwind a mano, mobile-first.
- Cambios de esquema: nuevo fichero `supabase/migrations/000N_xxx.sql` (nunca editar
  migraciones ya aplicadas) + actualizar a mano `src/lib/supabase/database.types.ts` +
  reflejar en `src/lib/dev/fake-db.ts` si afecta a los datos de la demo.
- Tras cualquier cambio: `npm run build` antes de dar algo por terminado.
