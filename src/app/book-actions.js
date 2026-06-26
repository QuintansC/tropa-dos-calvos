"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "../lib/supabase/server.js";

export async function createRecommendationAction(formData) {
  const auth = await getAuthenticatedClient();
  if (!auth.ok) return auth;

  const payload = {
    title: clean(formData.get("title")),
    author: clean(formData.get("author")),
    recommender: clean(formData.get("recommender")),
    mood: clean(formData.get("mood")),
    reason: clean(formData.get("reason")),
    created_by: auth.userId
  };

  if (!payload.title || !payload.author || !payload.recommender || !payload.reason) {
    return { ok: false, message: "Preencha os campos da recomendação." };
  }

  const { error } = await auth.supabase.from("recommendations").insert(payload);
  if (error) return toActionError(error);

  revalidateBookClubPages();
  return { ok: true, message: "Recomendação salva na biblioteca da tropa." };
}

export async function createSuggestionAction(formData) {
  const auth = await getAuthenticatedClient();
  if (!auth.ok) return auth;

  const pages = Number(formData.get("pages"));
  const payload = {
    title: clean(formData.get("title")),
    author: clean(formData.get("author")),
    suggested_by: clean(formData.get("suggestedBy")),
    pages: Number.isFinite(pages) && pages > 0 ? pages : null,
    pitch: clean(formData.get("pitch")),
    votes: 1,
    created_by: auth.userId
  };

  if (!payload.title || !payload.author || !payload.suggested_by || !payload.pitch) {
    return { ok: false, message: "Preencha os campos da sugestão." };
  }

  const { error } = await auth.supabase.from("suggestions").insert(payload);
  if (error) return toActionError(error);

  revalidateBookClubPages();
  return { ok: true, message: "Sugestão adicionada para a próxima leitura." };
}

export async function createMemberAction(formData) {
  const auth = await getAuthenticatedClient();
  if (!auth.ok) return auth;

  const name = clean(formData.get("member"));
  if (!name) return { ok: false, message: "Informe o nome do participante." };

  const { error } = await auth.supabase.from("members").insert({
    name,
    created_by: auth.userId
  });

  if (error?.code === "23505") {
    return { ok: false, message: "Esse participante já está na lista." };
  }

  if (error) return toActionError(error);

  revalidateBookClubPages();
  return { ok: true, message: "Participante adicionado ao sorteio." };
}

export async function deleteRecommendationAction(id) {
  const auth = await getAuthenticatedClient();
  if (!auth.ok) return auth;

  const { error } = await auth.supabase.from("recommendations").delete().eq("id", id);
  if (error) return toActionError(error);

  revalidateBookClubPages();
  return { ok: true, message: "Recomendação removida." };
}

export async function toggleRecommendationReadAction(id, isRead) {
  const auth = await getAuthenticatedClient();
  if (!auth.ok) return auth;

  const { error } = await auth.supabase
    .from("recommendations")
    .update({ is_read: Boolean(isRead) })
    .eq("id", id);

  if (error) return toActionError(error);

  revalidateBookClubPages();
  return {
    ok: true,
    message: isRead ? "Livro marcado como lido." : "Livro voltou para a lista de não lidos."
  };
}

export async function deleteSuggestionAction(id) {
  const auth = await getAuthenticatedClient();
  if (!auth.ok) return auth;

  const { error } = await auth.supabase.from("suggestions").delete().eq("id", id);
  if (error) return toActionError(error);

  revalidateBookClubPages();
  return { ok: true, message: "Sugestão removida." };
}

export async function promoteSuggestionToRecommendationAction(id) {
  const auth = await getAuthenticatedClient();
  if (!auth.ok) return auth;

  const { data: suggestion, error: suggestionError } = await auth.supabase
    .from("suggestions")
    .select("title, author, suggested_by, pitch")
    .eq("id", id)
    .maybeSingle();

  if (suggestionError) return toActionError(suggestionError);
  if (!suggestion) return { ok: false, message: "Sugestão não encontrada." };

  const { error } = await auth.supabase.from("recommendations").insert({
    title: suggestion.title,
    author: suggestion.author,
    recommender: suggestion.suggested_by,
    mood: "Surpresa",
    reason: suggestion.pitch,
    created_by: auth.userId
  });

  if (error?.code === "23505") {
    return { ok: false, message: "Esse livro já está no acervo." };
  }

  if (error) return toActionError(error);

  revalidateBookClubPages();
  return { ok: true, message: "Sugestão enviada para o acervo." };
}

export async function deleteMemberAction(id) {
  const auth = await getAuthenticatedClient();
  if (!auth.ok) return auth;

  const { error } = await auth.supabase.from("members").delete().eq("id", id);
  if (error) return toActionError(error);

  revalidateBookClubPages();
  return { ok: true, message: "Participante removido." };
}

export async function voteSuggestionAction(id) {
  const auth = await getAuthenticatedClient();
  if (!auth.ok) return auth;

  const { error } = await auth.supabase.rpc("increment_suggestion_vote", {
    target_id: id
  });

  if (error) return toActionError(error);

  revalidateBookClubPages();
  return { ok: true, message: "Apoio registrado." };
}

export async function drawBookAction(bookIds = []) {
  const auth = await getAuthenticatedClient();
  if (!auth.ok) return auth;

  const selectedIds = getSelectedBookIds(bookIds);
  if (!selectedIds.length) {
    return { ok: false, message: "Selecione pelo menos um livro do acervo para participar do sorteio." };
  }

  const { data, error } = await auth.supabase
    .from("recommendations")
    .select("id, title, author")
    .in("id", selectedIds)
    .eq("is_read", false);

  if (error) return toActionError(error);
  if (!data.length) return { ok: false, message: "Nenhum dos livros selecionados foi encontrado no acervo." };

  const book = data[randomInt(data.length)];
  const { error: finishError } = await auth.supabase
    .from("reading_cycles")
    .update({ status: "finished" })
    .in("status", ["planning", "active"]);

  if (finishError) return toActionError(finishError);

  const { error: cycleError } = await auth.supabase.from("reading_cycles").insert({
    recommendation_id: book.id,
    book_title: book.title,
    book_author: book.author,
    status: "planning",
    created_by: auth.userId
  });

  if (cycleError) return toActionError(cycleError);

  return await createHistory(auth, `Livro sorteado: ${book.title}, de ${book.author}. Regras da leitura pendentes.`);
}

export async function updateReadingCycleRulesAction(formData) {
  const auth = await getAuthenticatedClient();
  if (!auth.ok) return auth;

  const weeklyGoalPages = Number(formData.get("weeklyGoalPages"));
  const cycleId = clean(formData.get("cycleId"));
  const payload = {
    starts_on: clean(formData.get("startsOn")),
    meeting_frequency: clean(formData.get("meetingFrequency")),
    meeting_day: clean(formData.get("meetingDay")),
    weekly_goal_pages: Number.isFinite(weeklyGoalPages) && weeklyGoalPages > 0 ? Math.round(weeklyGoalPages) : null,
    reminder_day: clean(formData.get("reminderDay")),
    reminder_time: clean(formData.get("reminderTime")) || "20:00",
    motivation_reward:
      clean(formData.get("motivationReward")) || "Check-in semanal vale pontos para o ranking",
    status: "active",
    configured_at: new Date().toISOString()
  };

  if (!cycleId) return { ok: false, message: "Nenhuma leitura em andamento para configurar." };
  if (
    !payload.starts_on ||
    !payload.meeting_frequency ||
    !payload.meeting_day ||
    !payload.weekly_goal_pages ||
    !payload.reminder_day
  ) {
    return { ok: false, message: "Preencha data de início, frequência, encontro, meta e lembrete." };
  }

  const { error } = await auth.supabase
    .from("reading_cycles")
    .update(payload)
    .eq("id", cycleId)
    .neq("status", "finished");

  if (error) return toActionError(error);

  revalidateBookClubPages();
  return { ok: true, message: "Regras da leitura salvas." };
}

export async function joinReadingCycleAction(cycleId) {
  const auth = await getAuthenticatedClient();
  if (!auth.ok) return auth;

  const cleanCycleId = clean(cycleId);
  if (!cleanCycleId) return { ok: false, message: "Nenhuma leitura em andamento para entrar." };

  const { error: profileError } = await auth.supabase.from("profiles").upsert(
    {
      id: auth.userId,
      updated_at: new Date().toISOString()
    },
    { onConflict: "id" }
  );

  if (profileError) return toActionError(profileError);

  const { error } = await auth.supabase.from("reading_participants").insert({
    cycle_id: cleanCycleId,
    user_id: auth.userId
  });

  if (error?.code === "23505") {
    return { ok: true, message: "Você já está nessa leitura." };
  }

  if (error) return toActionError(error);

  revalidateBookClubPages();
  return { ok: true, message: "Você entrou voluntariamente nessa leitura." };
}

export async function leaveReadingCycleAction(cycleId) {
  const auth = await getAuthenticatedClient();
  if (!auth.ok) return auth;

  const cleanCycleId = clean(cycleId);
  if (!cleanCycleId) return { ok: false, message: "Nenhuma leitura em andamento para sair." };

  const { error } = await auth.supabase
    .from("reading_participants")
    .delete()
    .eq("cycle_id", cleanCycleId)
    .eq("user_id", auth.userId);

  if (error) return toActionError(error);

  revalidateBookClubPages();
  return { ok: true, message: "Você saiu dessa leitura." };
}

export async function updateProfileAction(formData) {
  const auth = await getAuthenticatedClient();
  if (!auth.ok) return auth;

  const payload = {
    id: auth.userId,
    display_name: clean(formData.get("displayName")),
    discord_handle: clean(formData.get("discordHandle")),
    favorite_genre: clean(formData.get("favoriteGenre")),
    reading_style: clean(formData.get("readingStyle")),
    bio: clean(formData.get("bio")),
    updated_at: new Date().toISOString()
  };

  if (!payload.display_name || !payload.discord_handle) {
    return { ok: false, message: "Informe seu nome e o vulgo no Discord." };
  }

  const { error } = await auth.supabase.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) return toActionError(error);

  revalidateBookClubPages();
  return { ok: true, message: "Perfil atualizado." };
}

export async function createReadingCheckinAction(formData) {
  const auth = await getAuthenticatedClient();
  if (!auth.ok) return auth;

  const pagesRead = Number(formData.get("pagesRead"));
  const cycleId = clean(formData.get("cycleId"));
  const pointsAwarded = Number.isFinite(pagesRead)
    ? Math.max(10, Math.min(80, Math.ceil(pagesRead / 5) * 5))
    : 0;

  if (!cycleId) return { ok: false, message: "Nenhuma rodada de leitura ativa." };
  if (!Number.isFinite(pagesRead) || pagesRead <= 0) {
    return { ok: false, message: "Informe quantas páginas você leu." };
  }

  const { data: cycle, error: cycleError } = await auth.supabase
    .from("reading_cycles")
    .select("status")
    .eq("id", cycleId)
    .maybeSingle();

  if (cycleError) return toActionError(cycleError);
  if (cycle?.status !== "active") {
    return { ok: false, message: "A leitura ainda precisa das regras do grupo antes dos check-ins." };
  }

  const { data: participant, error: participantError } = await auth.supabase
    .from("reading_participants")
    .select("id")
    .eq("cycle_id", cycleId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (participantError) return toActionError(participantError);
  if (!participant) {
    return { ok: false, message: "Entre voluntariamente nessa leitura antes de registrar progresso." };
  }

  const { error: checkinError } = await auth.supabase.from("reading_checkins").insert({
    cycle_id: cycleId,
    user_id: auth.userId,
    pages_read: Math.round(pagesRead),
    note: clean(formData.get("note")),
    points_awarded: pointsAwarded
  });

  if (checkinError) return toActionError(checkinError);

  const { data: profile, error: profileError } = await auth.supabase
    .from("profiles")
    .select("*")
    .eq("id", auth.userId)
    .maybeSingle();

  if (profileError) return toActionError(profileError);

  const { error: progressError } = await auth.supabase.from("profiles").upsert(
    {
      id: auth.userId,
      display_name: profile?.display_name ?? "",
      discord_handle: profile?.discord_handle ?? "",
      favorite_genre: profile?.favorite_genre ?? "",
      reading_style: profile?.reading_style ?? "",
      bio: profile?.bio ?? "",
      points: (profile?.points ?? 0) + pointsAwarded,
      streak: (profile?.streak ?? 0) + 1,
      updated_at: new Date().toISOString()
    },
    { onConflict: "id" }
  );

  if (progressError) return toActionError(progressError);

  revalidateBookClubPages();
  return { ok: true, message: `Progresso registrado: +${pointsAwarded} pontos.` };
}

export async function drawMemberAction() {
  const auth = await getAuthenticatedClient();
  if (!auth.ok) return auth;

  const { data, error } = await auth.supabase.from("members").select("name");
  if (error) return toActionError(error);
  if (!data.length) return { ok: false, message: "Adicione participantes antes de sortear responsável." };

  const member = data[randomInt(data.length)];
  return await createHistory(auth, `Responsável sorteado: ${member.name}`);
}

async function createHistory(auth, label) {
  const { error } = await auth.supabase.from("draw_history").insert({
    label,
    created_by: auth.userId
  });

  if (error) return toActionError(error);

  revalidateBookClubPages();
  return { ok: true, message: "Sorteio registrado." };
}

function revalidateBookClubPages() {
  revalidatePath("/");
  revalidatePath("/recomendacoes");
  revalidatePath("/sugestoes");
  revalidatePath("/sorteio");
  revalidatePath("/perfil");
}

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    return { ok: false, message: "Sessão expirada. Entre novamente." };
  }

  return { ok: true, supabase, userId: data.claims.sub, email: data.claims.email || "" };
}

function toActionError(error) {
  return { ok: false, message: error.message || "Não foi possível concluir a ação." };
}

function clean(value) {
  return String(value || "").trim();
}

function getSelectedBookIds(input) {
  if (isFormData(input)) {
    return input.getAll("bookIds").map(clean).filter(Boolean);
  }

  return Array.isArray(input) ? input.map(clean).filter(Boolean) : [];
}

function isFormData(value) {
  return typeof FormData !== "undefined" && value instanceof FormData;
}
