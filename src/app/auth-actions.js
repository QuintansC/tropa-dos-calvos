"use server";

import { headers } from "next/headers";
import { createClient } from "../lib/supabase/server.js";
import { hasSupabaseConfig } from "../lib/supabase/config.js";

export async function signInAction(formData) {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Configure o Supabase antes de entrar." };
  }

  const { email, password, error } = getCredentials(formData);
  if (error) return { ok: false, message: error };

  const supabase = await createClient();
  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError) {
    return { ok: false, message: authError.message };
  }

  return { ok: true, message: "Login realizado.", redirectTo: "/" };
}

export async function signUpAction(formData) {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Configure o Supabase antes de criar acesso." };
  }

  const { email, password, error } = getCredentials(formData);
  if (error) return { ok: false, message: error };

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const { error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm`
    }
  });

  if (authError) {
    return { ok: false, message: authError.message };
  }

  return {
    ok: true,
    message: "Acesso criado. Confirme o email se o Supabase solicitar.",
    redirectTo: "/"
  };
}

export async function signOutAction() {
  if (!hasSupabaseConfig()) {
    return { ok: true, message: "Sessão encerrada.", redirectTo: "/login" };
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  return { ok: true, message: "Sessão encerrada.", redirectTo: "/login" };
}

async function getSiteUrl() {
  const configured = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (configured) return configured.replace(/\/$/, "");

  const headerList = await headers();
  const origin = headerList.get("origin");
  if (origin) return origin.replace(/\/$/, "");

  const forwardedHost = headerList.get("x-forwarded-host") || headerList.get("host");
  if (forwardedHost) {
    const forwardedProto = headerList.get("x-forwarded-proto") || "https";
    return `${forwardedProto}://${forwardedHost}`;
  }

  return "http://localhost:3000";
}

function getCredentials(formData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !email.includes("@")) {
    return { error: "Informe um email válido." };
  }

  if (password.length < 8) {
    return { error: "A senha precisa ter pelo menos 8 caracteres." };
  }

  return { email, password };
}
