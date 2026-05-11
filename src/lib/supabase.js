import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  console.error("Falta VITE_SUPABASE_URL no ficheiro .env")
}

if (!supabaseAnonKey) {
  console.error("Falta VITE_SUPABASE_ANON_KEY no ficheiro .env")
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder"
)