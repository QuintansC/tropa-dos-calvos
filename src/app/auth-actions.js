"use server";

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
  const siteUrl = process.env.SITE_URL || "http://localhost:3000";
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
