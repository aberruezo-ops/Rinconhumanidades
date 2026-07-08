-- Simplifica los estados de "en curso": "programada" pasa a llamarse "confirmada sin avisar"
-- (reservada, pendiente de recordatorio) y "avisado" pasa a "confirmada/avisada" (reservada y
-- ya recordada, o que directamente no necesitaba recordatorio). El estado "confirmada" a secas
-- desaparece: se fusiona con "confirmada/avisada", su equivalente más cercano.
--
-- Postgres no permite eliminar valores de un enum sin recrear el tipo por completo (todas las
-- políticas y columnas que lo usan), así que las etiquetas antiguas ('programada', 'avisado',
-- 'confirmada') quedan sin uso dentro del tipo `appointment_status` pero ya no las escribe ni
-- las espera la aplicación.

alter type appointment_status add value if not exists 'confirmada_sin_avisar';
alter type appointment_status add value if not exists 'confirmada_avisada';

update appointments set status = 'confirmada_sin_avisar' where status = 'programada';
update appointments set status = 'confirmada_avisada' where status in ('avisado', 'confirmada');

alter table appointments alter column status set default 'confirmada_sin_avisar';
