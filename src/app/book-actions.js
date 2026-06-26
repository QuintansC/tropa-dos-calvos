"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "../lib/supabase/server.js";

const REVIEW_POINTS = 20;

export async function createRecommendationAction(formData) {
  const auth = await getAuthenticatedClient();
  if (!auth.ok) return auth;

  const fileUrl = normalizeExternalUrl(formData.get("fileUrl"));
  if (fileUrl === false) return { ok: false, message: "Informe um link externo valido para o arquivo." };
  const coverUrl = normalizeExternalUrl(formData.get("coverUrl"));
  if (coverUrl === false) return { ok: false, message: "Informe um link valido para a capa." };
  const pages = Number(formData.get("pages"));

  const payload = {
    title: clean(formData.get("title")),
    author: clean(formData.get("author")),
    recommender: clean(formData.get("recommender")),
    mood: clean(formData.get("mood")),
    genre: clean(formData.get("genre")),
    pages: Number.isFinite(pages) && pages > 0 ? Math.round(pages) : null,
    reason: clean(formData.get("reason")),
    file_url: fileUrl,
    cover_url: coverUrl,
    suggested_by_user: auth.userId,
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
  const fileUrl = normalizeExternalUrl(formData.get("fileUrl"));
  if (fileUrl === false) return { ok: false, message: "Informe um link externo valido para o arquivo." };
  const coverUrl = normalizeExternalUrl(formData.get("coverUrl"));
  if (coverUrl === false) return { ok: false, message: "Informe um link valido para a capa." };

  const payload = {
    title: clean(formData.get("title")),
    author: clean(formData.get("author")),
    suggested_by: clean(formData.get("suggestedBy")),
    genre: clean(formData.get("genre")),
    pages: Number.isFinite(pages) && pages > 0 ? pages : null,
    file_url: fileUrl,
    cover_url: coverUrl,
    pitch: clean(formData.get("pitch")),
    votes: 1,
    created_by: auth.userId
  };

  if (!payload.title || !payload.author || !payload.suggested_by || !payload.genre || !payload.pitch) {
    return { ok: false, message: "Preencha os campos da sugestão." };
  }

  const selectedHandle = await validateDiscordHandle(auth.supabase, payload.suggested_by);
  if (!selectedHandle.ok) return selectedHandle;
  if (!selectedHandle.exists) {
    return { ok: false, message: "Selecione um vulgo do Discord cadastrado na plataforma." };
  }

  const { error } = await auth.supabase.from("suggestions").insert(payload);
  if (error) return toActionError(error);

  revalidateBookClubPages();
  return { ok: true, message: "Sugestão adicionada para a próxima leitura." };
}

export async function updateRecommendationAction(formData) {
  const auth = await getAuthenticatedClient();
  if (!auth.ok) return auth;

  const id = clean(formData.get("id"));
  const pages = Number(formData.get("pages"));
  const fileUrl = normalizeExternalUrl(formData.get("fileUrl"));
  const coverUrl = normalizeExternalUrl(formData.get("coverUrl"));

  if (!id) return { ok: false, message: "Livro nao encontrado para edicao." };
  if (fileUrl === false) return { ok: false, message: "Informe um link externo valido para o arquivo." };
  if (coverUrl === false) return { ok: false, message: "Informe um link valido para a capa." };

  const payload = {
    title: clean(formData.get("title")),
    author: clean(formData.get("author")),
    genre: clean(formData.get("genre")),
    pages: Number.isFinite(pages) && pages > 0 ? Math.round(pages) : null,
    reason: clean(formData.get("reason")),
    file_url: fileUrl,
    cover_url: coverUrl
  };

  if (!payload.title || !payload.author || !payload.genre || !payload.reason) {
    return { ok: false, message: "Preencha titulo, autor, genero e motivo." };
  }

  const { data: book, error: bookError } = await auth.supabase
    .from("recommendations")
    .select("created_by, suggested_by_user")
    .eq("id", id)
    .maybeSingle();

  if (bookError) return toActionError(bookError);
  if (!book) return { ok: false, message: "Livro nao encontrado." };
  if ((book.suggested_by_user || book.created_by) !== auth.userId) {
    return { ok: false, message: "Voce so pode editar livros sugeridos por voce." };
  }

  const { error } = await auth.supabase.from("recommendations").update(payload).eq("id", id);
  if (error) return toActionError(error);

  revalidateBookClubPages();
  return { ok: true, message: "Livro atualizado no acervo." };
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

  const recommendationId = clean(id);
  if (!recommendationId) return { ok: false, message: "Livro nao encontrado." };

  const { data: book, error: bookError } = await auth.supabase
    .from("recommendations")
    .select("pages")
    .eq("id", recommendationId)
    .maybeSingle();

  if (bookError) return toActionError(bookError);
  if (!book) return { ok: false, message: "Livro nao encontrado." };

  const { data: currentProgress, error: progressError } = await auth.supabase
    .from("book_progress")
    .select("current_page")
    .eq("recommendation_id", recommendationId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (progressError) return toActionError(progressError);

  const currentPage =
    !Boolean(isRead) && book.pages && (currentProgress?.current_page ?? 0) >= book.pages
      ? Math.max(0, book.pages - 1)
      : Boolean(isRead) && book.pages
        ? book.pages
        : currentProgress?.current_page ?? 0;
  const result = await saveBookProgress(auth, {
    recommendationId,
    currentPage,
    isRead: Boolean(isRead)
  });

  if (!result.ok) return result;

  revalidateBookClubPages();
  return {
    ok: true,
    message: isRead ? "Livro marcado como lido para voce." : "Livro voltou para sua lista de nao lidos."
  };
}

export async function updateBookProgressAction(formData) {
  const auth = await getAuthenticatedClient();
  if (!auth.ok) return auth;

  const recommendationId = clean(formData.get("recommendationId"));
  const currentPage = Number(formData.get("currentPage"));

  if (!recommendationId) return { ok: false, message: "Livro nao encontrado." };
  if (!Number.isFinite(currentPage) || currentPage < 0) {
    return { ok: false, message: "Informe uma pagina valida." };
  }

  const { data: book, error: bookError } = await auth.supabase
    .from("recommendations")
    .select("pages")
    .eq("id", recommendationId)
    .maybeSingle();

  if (bookError) return toActionError(bookError);
  if (!book) return { ok: false, message: "Livro nao encontrado." };

  const roundedPage = Math.round(currentPage);
  if (book.pages && roundedPage > book.pages) {
    return { ok: false, message: `A pagina nao pode passar de ${book.pages}.` };
  }

  const result = await saveBookProgress(auth, {
    recommendationId,
    currentPage: roundedPage,
    isRead: Boolean(book.pages && roundedPage >= book.pages)
  });

  if (!result.ok) return result;

  revalidateBookClubPages();
  return { ok: true, message: "Progresso atualizado." };
}

export async function createBookReviewAction(formData) {
  const auth = await getAuthenticatedClient();
  if (!auth.ok) return auth;

  const recommendationId = clean(formData.get("recommendationId"));
  const content = clean(formData.get("content"));

  if (!recommendationId) return { ok: false, message: "Livro nao encontrado." };
  if (content.length < 10) {
    return { ok: false, message: "Escreva uma resenha com pelo menos 10 caracteres." };
  }

  const { data: book, error: bookError } = await auth.supabase
    .from("recommendations")
    .select("id")
    .eq("id", recommendationId)
    .maybeSingle();

  if (bookError) return toActionError(bookError);
  if (!book) return { ok: false, message: "Livro nao encontrado." };

  const { error } = await auth.supabase.from("book_reviews").insert({
    recommendation_id: recommendationId,
    user_id: auth.userId,
    content,
    points_awarded: REVIEW_POINTS
  });

  if (error?.code === "23505") {
    return { ok: false, message: "Voce ja escreveu uma resenha desse livro." };
  }
  if (error) return toActionError(error);

  const pointsResult = await awardProfilePoints(auth, REVIEW_POINTS);
  if (!pointsResult.ok) return pointsResult;

  revalidateBookClubPages();
  return { ok: true, message: `Resenha publicada: +${REVIEW_POINTS} pontos.` };
}

export async function deleteBookReviewAction(id) {
  const auth = await getAuthenticatedClient();
  if (!auth.ok) return auth;

  const reviewId = clean(id);
  if (!reviewId) return { ok: false, message: "Resenha nao encontrada." };

  const { error } = await auth.supabase
    .from("book_reviews")
    .delete()
    .eq("id", reviewId)
    .eq("user_id", auth.userId);

  if (error) return toActionError(error);

  revalidateBookClubPages();
  return { ok: true, message: "Resenha removida." };
}

export async function createSuggestionCommentAction(formData) {
  const auth = await getAuthenticatedClient();
  if (!auth.ok) return auth;

  const suggestionId = clean(formData.get("suggestionId"));
  const content = clean(formData.get("content"));

  if (!suggestionId) return { ok: false, message: "Sugestao nao encontrada." };
  if (!content) return { ok: false, message: "Escreva uma mensagem para a discussao." };

  const { data: suggestion, error: suggestionError } = await auth.supabase
    .from("suggestions")
    .select("id")
    .eq("id", suggestionId)
    .maybeSingle();

  if (suggestionError) return toActionError(suggestionError);
  if (!suggestion) return { ok: false, message: "Sugestao nao encontrada." };

  const { error } = await auth.supabase.from("suggestion_comments").insert({
    suggestion_id: suggestionId,
    user_id: auth.userId,
    content
  });

  if (error) return toActionError(error);

  revalidateBookClubPages();
  return { ok: true, message: "Mensagem enviada para a discussao." };
}

export async function deleteSuggestionCommentAction(id) {
  const auth = await getAuthenticatedClient();
  if (!auth.ok) return auth;

  const commentId = clean(id);
  if (!commentId) return { ok: false, message: "Mensagem nao encontrada." };

  const { error } = await auth.supabase
    .from("suggestion_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", auth.userId);

  if (error) return toActionError(error);

  revalidateBookClubPages();
  return { ok: true, message: "Mensagem removida." };
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
    .select("title, author, suggested_by, genre, pages, pitch, file_url, cover_url, created_by")
    .eq("id", id)
    .maybeSingle();

  if (suggestionError) return toActionError(suggestionError);
  if (!suggestion) return { ok: false, message: "Sugestão não encontrada." };

  const { error } = await auth.supabase.from("recommendations").insert({
    title: suggestion.title,
    author: suggestion.author,
    recommender: suggestion.suggested_by,
    mood: "Surpresa",
    genre: suggestion.genre,
    pages: suggestion.pages,
    reason: suggestion.pitch,
    file_url: suggestion.file_url || null,
    cover_url: suggestion.cover_url || null,
    suggested_by_user: suggestion.created_by,
    created_by: auth.userId
  });

  if (error?.code === "23505") {
    return { ok: false, message: "Esse livro já está no acervo." };
  }

  if (error) return toActionError(error);

  const { error: deleteError } = await auth.supabase.from("suggestions").delete().eq("id", id);
  if (deleteError) return toActionError(deleteError);

  revalidateBookClubPages();
  return { ok: true, message: "Sugestão enviada para o acervo e removida das sugestões." };
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
    .in("id", selectedIds);

  if (error) return toActionError(error);
  if (!data.length) return { ok: false, message: "Nenhum dos livros selecionados foi encontrado no acervo." };

  const book = data[randomInt(data.length)];
  const { error: finishError } = await auth.supabase
    .from("reading_cycles")
    .update({ status: "finished" })
    .in("status", ["planning", "active"]);

  if (finishError) return toActionError(finishError);

  const { data: cycle, error: cycleError } = await auth.supabase
    .from("reading_cycles")
    .insert({
      recommendation_id: book.id,
      book_title: book.title,
      book_author: book.author,
      status: "planning",
      created_by: auth.userId
    })
    .select("id")
    .single();

  if (cycleError) return toActionError(cycleError);

  const { error: participantsError } = await auth.supabase.rpc("add_all_profiles_to_reading_cycle", {
    target_cycle_id: cycle.id
  });

  if (participantsError) return toActionError(participantsError);

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

async function saveBookProgress(auth, { recommendationId, currentPage, isRead }) {
  const { data: existingProgress, error: existingError } = await auth.supabase
    .from("book_progress")
    .select("id, current_page, started_at, finished_at")
    .eq("recommendation_id", recommendationId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (existingError) return toActionError(existingError);

  const now = new Date().toISOString();
  const previousPage = existingProgress?.current_page ?? 0;
  const startedAt = existingProgress?.started_at || (currentPage > 0 ? now : null);
  const finishedAt = isRead ? existingProgress?.finished_at || now : null;
  const { data: progress, error: progressError } = await auth.supabase
    .from("book_progress")
    .upsert(
      {
        recommendation_id: recommendationId,
        user_id: auth.userId,
        current_page: currentPage,
        is_read: Boolean(isRead),
        started_at: startedAt,
        finished_at: finishedAt,
        updated_at: now
      },
      { onConflict: "recommendation_id,user_id" }
    )
    .select("id")
    .single();

  if (progressError) return toActionError(progressError);

  if (currentPage !== previousPage) {
    const { error: eventError } = await auth.supabase.from("book_progress_events").insert({
      progress_id: progress.id,
      recommendation_id: recommendationId,
      user_id: auth.userId,
      previous_page: previousPage,
      current_page: currentPage,
      pages_delta: currentPage - previousPage
    });

    if (eventError) return toActionError(eventError);
  }

  return { ok: true };
}

async function awardProfilePoints(auth, points) {
  const { data: profile, error: profileError } = await auth.supabase
    .from("profiles")
    .select("*")
    .eq("id", auth.userId)
    .maybeSingle();

  if (profileError) return toActionError(profileError);

  const { error } = await auth.supabase.from("profiles").upsert(
    {
      id: auth.userId,
      display_name: profile?.display_name ?? "",
      discord_handle: profile?.discord_handle ?? "",
      favorite_genre: profile?.favorite_genre ?? "",
      reading_style: profile?.reading_style ?? "",
      bio: profile?.bio ?? "",
      points: (profile?.points ?? 0) + points,
      streak: profile?.streak ?? 0,
      updated_at: new Date().toISOString()
    },
    { onConflict: "id" }
  );

  if (error) return toActionError(error);

  return { ok: true };
}

async function validateDiscordHandle(supabase, discordHandle) {
  const { data, error } = await supabase.rpc("has_profile_discord_handle", {
    target_handle: discordHandle
  });

  if (error) return toActionError(error);

  return { ok: true, exists: Boolean(data) };
}

function clean(value) {
  return String(value || "").trim();
}

function normalizeExternalUrl(value) {
  const rawUrl = clean(value);
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : false;
  } catch {
    return false;
  }
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
