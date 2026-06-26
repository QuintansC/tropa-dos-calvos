import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseConfig, hasSupabaseConfig } from "./config.js";

export async function updateSession(request) {
  if (!hasSupabaseConfig()) {
    return NextResponse.next({ request });
  }

  const { supabaseUrl, supabaseKey } = getSupabaseConfig();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  await supabase.auth.getClaims();

  return response;
}
