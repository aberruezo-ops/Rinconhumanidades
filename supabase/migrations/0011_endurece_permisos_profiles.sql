-- Auditoría de seguridad: dos huecos en profiles, sin relación con el resto del esquema.
--
-- 1) profiles_update_own solo restringía QUÉ FILA se puede tocar (la propia, id = auth.uid()),
--    no QUÉ COLUMNAS. Cualquier usuario autenticado podía llamar directamente a la API REST de
--    Supabase (con la anon key pública + su propia sesión, sin pasar por la aplicación) y
--    subirse a sí mismo de 'readonly' a 'admin'. Hoy no es explotable porque solo existe una
--    cuenta y ya es admin, pero en cuanto se dé de alta el futuro traumatólogo como 'readonly'
--    sería una escalada de privilegios real. Se restringe el permiso de UPDATE a nivel de
--    columna: solo se puede cambiar el nombre, nunca el rol propio.
revoke update on profiles from authenticated;
grant update (full_name) on profiles to authenticated;

-- 2) handle_new_user() creaba cualquier usuario nuevo como 'admin' por defecto, así que dar de
--    alta al futuro traumatólogo como 'readonly' exigía acordarse de bajarle el rol a mano
--    justo después — un olvido ahí le daría acceso total sin querer. Se invierte el valor por
--    defecto a 'readonly': un olvido pasa a significar "todavía no puede editar", no "tiene
--    acceso de más". Subir a alguien a 'admin' (incluida la primera cuenta) requiere ahora un
--    UPDATE manual en la tabla profiles desde el SQL Editor — ver README.md.
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', 'readonly');
  return new;
end;
$$ language plpgsql security definer set search_path = public;
