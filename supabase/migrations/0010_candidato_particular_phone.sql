-- El teléfono es imprescindible siempre, también para un candidato de quirófano particular
-- (sin registrar), igual que ya se exige en appointments.particular_phone (migración 0009).
-- No se marca "not null" por la misma razón: los candidatos particulares que ya existan hoy
-- no tienen este dato y no se quiere romper nada; se rellenará a mano cuando se pueda. La app
-- ya lo exige como obligatorio para candidatos nuevos o editados.

alter table quirofano_candidatos add column if not exists particular_phone text;
