import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

let client: SupabaseClient<Database> | null = null;
let warnedAboutMissingCredentials = false;

const hasCredentials = (): boolean => {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  );
};

const createSupabaseClient = (): SupabaseClient<Database> => {
  if (!hasCredentials()) {
    throw new Error("Supabase credentials are not configured.");
  }

  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

  const authOptions = {
    persistSession: true,
    autoRefreshToken: true,
    ...(typeof window !== "undefined" ? { storage: window.localStorage } : {}),
  } as const;

  return createClient<Database>(url, key, { auth: authOptions });
};

export const isSupabaseEnabled = (): boolean => {
  const enabled = hasCredentials();

  if (!enabled && import.meta.env.DEV && !warnedAboutMissingCredentials) {
    console.warn(
      "Supabase credentials are not configured. Falling back to the IndexedDB datastore.",
    );
    warnedAboutMissingCredentials = true;
  }

  return enabled;
};

export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (!client) {
    client = createSupabaseClient();
  }

  return client;
};
