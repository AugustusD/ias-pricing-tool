import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  // Surface this loudly during development so misconfigured envs are obvious.
  // In production these are inlined at build time by Vite.
  // eslint-disable-next-line no-console
  console.error(
    "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Copy .env.example → .env.local and fill in values."
  );
}

export const supabase = createClient(url ?? "", key ?? "");
