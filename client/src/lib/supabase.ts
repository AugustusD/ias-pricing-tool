import { createClient } from "@supabase/supabase-js";

// Public Supabase project — anon "publishable" key is safe to embed in the
// client bundle. Row Level Security (configured in migration 001) protects
// the underlying data; the products table just has a public read policy
// because list prices aren't sensitive. Env vars override when set, so the
// same code works locally with .env.local and on Vercel without any setup.
const DEFAULT_URL = "https://daznfwsafcvpiqyrbrzr.supabase.co";
const DEFAULT_KEY = "sb_publishable_7yZILWPBsXYpnhQGADFTJw_YC_SvPaw";

const url = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY;

export const supabase = createClient(url, key);
