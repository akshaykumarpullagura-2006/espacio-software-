import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://smldrxmmsyxbbrlaazaq.supabase.co";
const supabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_0MCoe6sht9kUVWzTS9uwfw_cBGK8GDd";

export const supabase = createClient(supabaseUrl, supabaseKey);

