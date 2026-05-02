import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

let warnedAboutMissingCredentials = false;

const hasCredentials = (): boolean => {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
      (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
        import.meta.env.VITE_SUPABASE_ANON_KEY)
  );
};

export const isSupabaseEnabled = (): boolean => {
  const enabled = hasCredentials();

  if (!enabled && import.meta.env.DEV && !warnedAboutMissingCredentials) {
    console.error(
      "Supabase credentials are not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env file.",
    );
    warnedAboutMissingCredentials = true;
  }

  return enabled;
};

export const getSupabaseClient = (): SupabaseClient<Database> => {
  return supabase;
};
