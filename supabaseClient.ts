
// ARCHIVO NEUTRALIZADO
// La aplicación ahora funciona en modo "Stand-alone" (Memoria Local).
// No se requiere conexión a Supabase.

export const supabase = null;

export const isSupabaseConfigured = () => {
  return false;
};

export const saveSupabaseConfig = (url: string, key: string) => {
  console.log("Configuración desactivada en modo local.");
};

export const clearSupabaseConfig = () => {
    console.log("Limpieza desactivada en modo local.");
};
