export async function getBookClubState(supabase, userId) {
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
    participants
  ] = await Promise.all([
    supabase
      .from("recommendations")
      .select("id, title, author, recommender, mood, reason, file_url, is_read, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("suggestions")
      .select("id, title, author, suggested_by, pages, file_url, pitch, votes, created_at")
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
    supabase.from("reading_participants").select("*").order("joined_at", { ascending: true }).limit(200)
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
    participants
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
  const leaderboard = [...profileSummaries]
    .sort((a, b) => b.points - a.points)
    .slice(0, 8);

  return {
    recommendations: recommendations.data.map(mapRecommendation),
    suggestions: suggestions.data.map(mapSuggestion),
    members: members.data.map(mapMember),
    history: history.data.map(mapHistory),
    activeCycle: mapCycle(activeCycle),
    cycles: cycles.data.map(mapCycle),
    profile: mapProfile(profile.data),
    profiles: profileSummaries,
    discordHandles: mapDiscordHandles(discordHandles.data),
    leaderboard,
    checkins: checkins.data.map(mapCheckin),
    activeParticipants: activeParticipantIds.map((id) => profileById.get(id) || mapProfile({ id })),
    currentUserParticipates: activeParticipantIds.includes(userId)
  };
}

function mapRecommendation(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    recommender: row.recommender,
    mood: row.mood,
    reason: row.reason,
    fileUrl: row.file_url || "",
    isRead: Boolean(row.is_read),
    createdAt: row.created_at
  };
}

function mapSuggestion(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    suggestedBy: row.suggested_by,
    pages: row.pages,
    fileUrl: row.file_url || "",
    pitch: row.pitch,
    votes: row.votes,
    createdAt: row.created_at
  };
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
