import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

let supabase: any;

try {
  const supabaseUrl = requireEnv("VITE_SUPABASE_URL");
  const supabaseAnonKey = requireEnv("VITE_SUPABASE_ANON_KEY");

  supabase = createClient<any>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
    global: {
      headers: {
        "X-Client-Info": "onchord-web",
      },
    },
  });
} catch (error) {
  console.error("[Supabase Init Error]", error);
  throw error;
}

export { supabase };

