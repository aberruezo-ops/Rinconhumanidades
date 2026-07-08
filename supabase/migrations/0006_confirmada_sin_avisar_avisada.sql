-- Simplifica los estados de "en curso": "programada" pasa a llamarse "confirmada sin avisar"
-- (reservada, pendiente de recordatorio) y "avisado" pasa a "confirmada/avisada" (reservada y
-- ya recordada, o que directamente no necesitaba recordatorio). El estado "confirmada" a secas
-- desaparece: se fusiona con "confirmada/avisada", su equivalente más cercano.
--
-- Postgres no permite eliminar valores de un enum sin recrear el tipo por completo (todas las
-- políticas y columnas que lo usan), así que las etiquetas antiguas ('programada', 'avisado',
-- 'confirmada') quedan sin uso dentro del tipo `appointment_status` pero ya no las escribe ni
-- las espera la aplicación.
--
-- IMPORTANTE si se ejecuta a mano en el editor SQL de Supabase: hay que pegar y ejecutar esto en
-- DOS pasos separados (dos runs, no uno detrás de otro en el mismo pegado). Postgres no permite
-- usar un valor de enum recién añadido dentro de la misma transacción en la que se añadió, y el
-- editor de Supabase ejecuta cada run como una única transacción ("unsafe use of new value ...
-- New enum values must be committed before they can be used"). Vía `psql`/migraciones normales
-- (sin envolver el archivo en una transacción) este archivo se puede ejecutar de una vez, como
-- se validó localmente.

-- Paso 1 (Supabase: ejecutar solo esto y esperar a que termine).
alter type appointment_status add value if not exists 'confirmada_sin_avisar';
alter type appointment_status add value if not exists 'confirmada_avisada';

-- Paso 2 (Supabase: ejecutar esto en un segundo run, una vez terminado el paso 1).
update appointments set status = 'confirmada_sin_avisar' where status = 'programada';
update appointments set status = 'confirmada_avisada' where status in ('avisado', 'confirmada');

alter table appointments alter column status set default 'confirmada_sin_avisar';
