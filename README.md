# Dante — gestión de citas de traumatología

Aplicación interna para gestionar la agenda de una consulta privada de
traumatología (Jaén): tres agendas (traumatólogo, enfermería, quirófano),
apertura/cierre de días, alta de citas con detección de solapes y listados
imprimibles. Ver **ESPECIFICACION.md** para el producto completo y
**CLAUDE.md** para las reglas de dominio que no hay que romper.

Fase 1 (MVP), sin reserva online de pacientes: una única usuaria
administrativa (Olga) con acceso completo.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, TypeScript, Tailwind v4)
- [Supabase](https://supabase.com) (Postgres + Auth + RLS)

## Puesta en marcha

### 1. Crear el proyecto de Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com) (elige una región de la UE, ej. Frankfurt, por RGPD).
2. En **SQL Editor**, pega y ejecuta el contenido de `supabase/migrations/0001_init.sql`.
   Crea las tablas, los roles, el trigger de perfil automático, las políticas RLS
   y los datos semilla (agendas, tipos de cita de enfermería, algunas aseguradoras
   habituales).
3. En **Authentication → Users**, pulsa "Add user" y crea el usuario de Olga
   (correo + contraseña). El trigger `on_auth_user_created` le crea
   automáticamente un perfil con rol `admin` — no hace falta tocar la tabla
   `profiles` a mano. No hay pantalla de registro en la aplicación a propósito.
4. En **Project Settings → API**, copia la `Project URL` y la `anon public key`.

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Rellena `.env.local` con los valores del paso anterior:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
```

Opcional — solo para "Nueva cita por dictado" (interpretar texto o voz con IA): crea una clave en
[console.anthropic.com](https://console.anthropic.com) (API Keys) y añade `ANTHROPIC_API_KEY=sk-ant-...`.
Sin ella, el resto de la app funciona igual; solo esa pantalla da un aviso.

### 3. Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Te redirige a `/login`;
entra con el usuario creado en el paso 1.

### 4. Desplegar

Cualquier hosting compatible con Next.js sirve (el proyecto usa Server Actions
y un `proxy.ts` en Node runtime, sin nada específico de un proveedor). Con
[Vercel](https://vercel.com): importa el repositorio, añade las mismas dos
variables de entorno en el proyecto de Vercel y despliega.

## Comandos

```bash
npm run dev     # servidor de desarrollo
npm run build   # build de producción (falla si hay errores de tipos)
npm run lint    # ESLint
```

## Migraciones futuras

Si el esquema cambia, añade un nuevo archivo `supabase/migrations/000N_xxx.sql`
(no edites `0001_init.sql` una vez aplicado en producción) y actualiza
`src/lib/supabase/database.types.ts` a mano para que coincida.

## Qué falta (fuera de esta Fase 1)

Ver "Fases propuestas" en ESPECIFICACION.md: avisos de seguimiento, botón de
WhatsApp, entrada por voz (Fase 2); SMS automáticos y exportación de datos
(Fase 3).
