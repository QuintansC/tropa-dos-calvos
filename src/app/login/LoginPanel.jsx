"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signInAction, signUpAction } from "../auth-actions.js";

export default function LoginPanel({ message }) {
  const router = useRouter();
  const [mode, setMode] = useState("signin");
  const [feedback, setFeedback] = useState(message);
  const [isPending, startTransition] = useTransition();

  const action = mode === "signin" ? signInAction : signUpAction;

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await action(formData);
      setFeedback(result.message);

      if (result.ok && result.redirectTo) {
        router.replace(result.redirectTo);
        router.refresh();
      }
    });
  };

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-copy">
          <p className="section-kicker">Área restrita</p>
          <h1>Tropa do Calvo</h1>
          <p>
            Entre para acessar as recomendações, votar nas sugestões e registrar os
            sorteios do clube.
          </p>
        </div>

        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-tabs" aria-label="Modo de acesso">
            <button
              className={mode === "signin" ? "is-active" : ""}
              type="button"
              onClick={() => setMode("signin")}
            >
              Entrar
            </button>
            <button
              className={mode === "signup" ? "is-active" : ""}
              type="button"
              onClick={() => setMode("signup")}
            >
              Criar acesso
            </button>
          </div>

          <label>
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            <span>Senha</span>
            <input
              name="password"
              type="password"
              minLength={8}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
            />
          </label>

          {feedback ? <p className="form-feedback">{feedback}</p> : null}

          <button className="button button-primary" type="submit" disabled={isPending}>
            {isPending ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar acesso"}
          </button>
        </form>
      </section>
    </main>
  );
}
