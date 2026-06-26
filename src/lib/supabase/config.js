export function hasSupabaseConfig() {
  const { supabaseUrl, supabaseKey } = readSupabaseConfig();
  return Boolean(supabaseUrl && supabaseKey);
}

export function getSupabaseConfig() {
  const { supabaseUrl, supabaseKey } = readSupabaseConfig();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return { supabaseUrl, supabaseKey };
}

function readSupabaseConfig() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    supabaseKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY
  };
}
