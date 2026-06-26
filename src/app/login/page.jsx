import { redirect } from "next/navigation";
import LoginPanel from "./LoginPanel.jsx";
import { hasSupabaseConfig } from "../../lib/supabase/config.js";
import { createClient } from "../../lib/supabase/server.js";

export default async function LoginPage({ searchParams }) {
  if (!hasSupabaseConfig()) {
    return (
      <main className="auth-page">
        <section className="auth-card setup-card">
          <p className="section-kicker">Configuração</p>
          <h1>Supabase ainda não foi configurado.</h1>
          <p>
            Preencha `.env.local` com as chaves públicas do projeto Supabase antes de
            usar o login.
          </p>
        </section>
      </main>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/");
  }

  const params = await searchParams;
  return <LoginPanel message={params?.message || ""} />;
}
