export async function getBookClubState(supabase, userId) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    recommendations,
    suggestions,
    members,
    history,
    cycles,
    profile,
    publicProfiles,
    discordHandles,
    checkins,
    participants,
    progressRows,
    progressEvents,
    reviews,
    suggestionComments
  ] = await Promise.all([
    supabase
      .from("recommendations")
      .select("id, title, author, recommender, mood, genre, pages, reason, file_url, cover_url, is_read, created_by, suggested_by_user, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("suggestions")
      .select("id, title, author, suggested_by, genre, pages, file_url, cover_url, pitch, votes, created_at")
      .order("votes", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("members").select("*").order("name", { ascending: true }),
    supabase.from("draw_history").select("*").order("created_at", { ascending: false }).limit(8),
    supabase.from("reading_cycles").select("*").order("created_at", { ascending: false }).limit(6),
    supabase
      .from("profiles")
      .select("id, display_name, discord_handle, favorite_genre, reading_style, bio, points, streak, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase.rpc("get_public_profile_summaries"),
    supabase.rpc("get_profile_discord_handles"),
    supabase
      .from("reading_checkins")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("reading_participants").select("*").order("joined_at", { ascending: true }).limit(200),
    supabase
      .from("book_progress")
      .select("id, recommendation_id, user_id, current_page, is_read, started_at, finished_at, created_at, updated_at")
      .limit(1000),
    supabase
      .from("book_progress_events")
      .select("recommendation_id, user_id, pages_delta, created_at")
      .gte("created_at", todayStart.toISOString())
      .limit(1000),
    supabase
      .from("book_reviews")
      .select("id, recommendation_id, user_id, content, created_at")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("suggestion_comments")
      .select("id, suggestion_id, user_id, content, created_at")
      .order("created_at", { ascending: true })
      .limit(1000)
  ]);

  [
    recommendations,
    suggestions,
    members,
    history,
    cycles,
    profile,
    publicProfiles,
    discordHandles,
    checkins,
    participants,
    progressRows,
    progressEvents,
    reviews,
    suggestionComments
  ].forEach((result) => {
    if (result.error) {
      throw new Error(result.error.message);
    }
  });

  const activeCycle = cycles.data.find((cycle) => cycle.status !== "finished") || null;
  const activeParticipantRows = activeCycle
    ? participants.data.filter((participant) => participant.cycle_id === activeCycle.id)
    : [];
  const activeParticipantIds = activeParticipantRows.map((participant) => participant.user_id);
  const profileSummaries = publicProfiles.data.map(mapProfile);
  const profileById = new Map(profileSummaries.map((item) => [item.id, item]));
  const participantsByCycle = groupByKey(
    participants.data.map((row) => mapParticipant(row, profileById.get(row.user_id))),
    (item) => item.cycleId
  );
  const reviewsByRecommendation = groupByKey(
    reviews.data.map((row) => mapReview(row, profileById.get(row.user_id))),
    (item) => item.recommendationId
  );
  const commentsBySuggestion = groupByKey(
    suggestionComments.data.map((row) => mapSuggestionComment(row, profileById.get(row.user_id))),
    (item) => item.suggestionId
  );
  const recommendationById = new Map(recommendations.data.map((item) => [item.id, item]));
  const progressByKey = new Map(
    progressRows.data.map((item) => [getProgressKey(item.recommendation_id, item.user_id), item])
  );
  const dailyPagesByKey = getDailyPagesByKey(progressEvents.data);
  const leaderboard = [...profileSummaries]
    .sort((a, b) => b.points - a.points)
    .slice(0, 8);
  const activeRecommendation = activeCycle ? recommendationById.get(activeCycle.recommendation_id) : null;
  const activeProgressByUser = new Map(
    progressRows.data
      .filter((item) => item.recommendation_id === activeCycle?.recommendation_id)
      .map((item) => [item.user_id, item])
  );
  const activeReadingProgress = activeCycle
    ? activeParticipantIds.map((participantId) =>
        mapBookProgress(
          activeProgressByUser.get(participantId) || {
            recommendation_id: activeCycle.recommendation_id,
            user_id: participantId,
            current_page: 0,
            is_read: false,
            updated_at: ""
          },
          profileById.get(participantId),
          activeRecommendation?.pages,
          dailyPagesByKey.get(getProgressKey(activeCycle.recommendation_id, participantId)) ?? 0
        )
      )
    : [];

  return {
    recommendations: recommendations.data.map((row) =>
      mapRecommendation(row, {
        userId,
        progress: progressByKey.get(getProgressKey(row.id, userId)),
        dailyPages: dailyPagesByKey.get(getProgressKey(row.id, userId)) ?? 0,
        reviews: reviewsByRecommendation.get(row.id) ?? []
      })
    ),
    suggestions: suggestions.data.map((row) =>
      mapSuggestion(row, commentsBySuggestion.get(row.id) ?? [])
    ),
    members: members.data.map(mapMember),
    history: history.data.map(mapHistory),
    activeCycle: mapCycle(activeCycle),
    cycles: cycles.data.map((cycle) => {
      const bookPages = recommendationById.get(cycle.recommendation_id)?.pages;
      const cycleParticipants = (participantsByCycle.get(cycle.id) ?? []).map((participant) => {
        const progress = progressByKey.get(getProgressKey(cycle.recommendation_id, participant.userId));
        return {
          ...participant,
          startedAt: progress?.started_at ?? "",
          finishedAt: progress?.finished_at ?? "",
          isRead: Boolean(progress?.is_read),
          percent: getProgressPercent(progress?.current_page ?? 0, bookPages)
        };
      });
      return {
        ...mapCycle(cycle),
        participants: cycleParticipants,
        participantCount: cycleParticipants.length,
        currentUserParticipates: cycleParticipants.some((item) => item.userId === userId)
      };
    }),
    profile: mapProfile(profile.data),
    profiles: profileSummaries,
    discordHandles: mapDiscordHandles(discordHandles.data),
    leaderboard,
    checkins: checkins.data.map(mapCheckin),
    activeParticipants: activeParticipantIds.map((id) => profileById.get(id) || mapProfile({ id })),
    activeReadingProgress,
    currentUserParticipates: activeParticipantIds.includes(userId)
  };
}

function mapRecommendation(row, { userId, progress, dailyPages, reviews = [] }) {
  const ownerId = row.suggested_by_user || row.created_by || "";
  const currentPage = progress?.current_page ?? 0;

  return {
    id: row.id,
    title: row.title,
    author: row.author,
    recommender: row.recommender,
    mood: row.mood,
    genre: row.genre || "",
    pages: row.pages,
    reason: row.reason,
    fileUrl: row.file_url || "",
    coverUrl: row.cover_url || "",
    isRead: Boolean(progress?.is_read),
    canEdit: ownerId === userId,
    ownerId,
    progress: {
      currentPage,
      dailyPages,
      percent: getProgressPercent(currentPage, row.pages),
      updatedAt: progress?.updated_at ?? ""
    },
    reviews,
    myReview: reviews.find((review) => review.userId === userId) ?? null,
    createdAt: row.created_at
  };
}

function mapSuggestion(row, comments = []) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    suggestedBy: row.suggested_by,
    genre: row.genre || "",
    pages: row.pages,
    fileUrl: row.file_url || "",
    coverUrl: row.cover_url || "",
    pitch: row.pitch,
    votes: row.votes,
    comments,
    createdAt: row.created_at
  };
}

function mapReview(row, profile) {
  return {
    id: row.id,
    recommendationId: row.recommendation_id,
    userId: row.user_id,
    author: profile?.displayName || profile?.discordHandle || "Calvo anônimo",
    content: row.content,
    createdAt: row.created_at
  };
}

function mapSuggestionComment(row, profile) {
  return {
    id: row.id,
    suggestionId: row.suggestion_id,
    userId: row.user_id,
    author: profile?.displayName || profile?.discordHandle || "Calvo anônimo",
    content: row.content,
    createdAt: row.created_at
  };
}

function mapParticipant(row, profile) {
  return {
    id: row.id,
    cycleId: row.cycle_id,
    userId: row.user_id,
    displayName: profile?.displayName ?? "",
    discordHandle: profile?.discordHandle ?? "",
    joinedAt: row.joined_at
  };
}

function groupByKey(items, getKey) {
  const groups = new Map();

  items.forEach((item) => {
    const key = getKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });

  return groups;
}

function mapMember(row) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at
  };
}

function mapHistory(row) {
  return {
    id: row.id,
    label: row.label,
    createdAt: row.created_at
  };
}

function mapCycle(row) {
  if (!row) return null;

  return {
    id: row.id,
    recommendationId: row.recommendation_id,
    bookTitle: row.book_title,
    bookAuthor: row.book_author,
    startsOn: row.starts_on,
    meetingFrequency: row.meeting_frequency,
    meetingDay: row.meeting_day,
    weeklyGoalPages: row.weekly_goal_pages,
    reminderDay: row.reminder_day,
    reminderTime: row.reminder_time,
    motivationReward: row.motivation_reward,
    status: row.status,
    configuredAt: row.configured_at,
    createdAt: row.created_at
  };
}

function mapProfile(row) {
  return {
    id: row?.id ?? "",
    displayName: row?.display_name ?? "",
    discordHandle: row?.discord_handle ?? "",
    favoriteGenre: row?.favorite_genre ?? "",
    readingStyle: row?.reading_style ?? "",
    bio: row?.bio ?? "",
    points: row?.points ?? 0,
    streak: row?.streak ?? 0,
    createdAt: row?.created_at ?? "",
    updatedAt: row?.updated_at ?? ""
  };
}

function mapDiscordHandles(rows = []) {
  return [...new Set(rows.map((row) => String(row.discord_handle || "").trim()).filter(Boolean))];
}

function mapBookProgress(row, profile, totalPages, dailyPages) {
  const currentPage = row?.current_page ?? 0;

  return {
    id: row?.id ?? "",
    recommendationId: row?.recommendation_id ?? "",
    userId: row?.user_id ?? "",
    displayName: profile?.displayName ?? "",
    discordHandle: profile?.discordHandle ?? "",
    currentPage,
    dailyPages,
    isRead: Boolean(row?.is_read),
    percent: getProgressPercent(currentPage, totalPages),
    updatedAt: row?.updated_at ?? ""
  };
}

function getDailyPagesByKey(rows = []) {
  const totals = new Map();

  rows.forEach((row) => {
    const delta = Math.max(0, Number(row.pages_delta) || 0);
    if (!delta) return;

    const key = getProgressKey(row.recommendation_id, row.user_id);
    totals.set(key, (totals.get(key) ?? 0) + delta);
  });

  return totals;
}

function getProgressKey(recommendationId, userId) {
  return `${recommendationId || ""}:${userId || ""}`;
}

function getProgressPercent(currentPage, totalPages) {
  if (!totalPages) return 0;
  return Math.max(0, Math.min(100, Math.round((currentPage / totalPages) * 100)));
}

function mapCheckin(row) {
  return {
    id: row.id,
    cycleId: row.cycle_id,
    userId: row.user_id,
    pagesRead: row.pages_read,
    note: row.note,
    pointsAwarded: row.points_awarded,
    createdAt: row.created_at
  };
}
