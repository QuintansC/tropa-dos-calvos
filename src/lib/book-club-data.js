export async function getBookClubState(supabase, userId) {
  const [
    recommendations,
    suggestions,
    members,
    history,
    cycles,
    profile,
    leaderboard,
    profiles,
    checkins,
    participants
  ] = await Promise.all([
    supabase.from("recommendations").select("*").order("created_at", { ascending: false }),
    supabase
      .from("suggestions")
      .select("*")
      .order("votes", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("members").select("*").order("name", { ascending: true }),
    supabase.from("draw_history").select("*").order("created_at", { ascending: false }).limit(8),
    supabase.from("reading_cycles").select("*").order("created_at", { ascending: false }).limit(6),
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("profiles").select("*").order("points", { ascending: false }).limit(8),
    supabase.from("profiles").select("*").order("display_name", { ascending: true }).limit(100),
    supabase
      .from("reading_checkins")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("reading_participants").select("*").order("joined_at", { ascending: true }).limit(200)
  ]);

  [recommendations, suggestions, members, history, cycles, profile, leaderboard, profiles, checkins, participants].forEach((result) => {
    if (result.error) {
      throw new Error(result.error.message);
    }
  });

  const activeCycle = cycles.data.find((cycle) => cycle.status !== "finished") || null;
  const activeParticipantRows = activeCycle
    ? participants.data.filter((participant) => participant.cycle_id === activeCycle.id)
    : [];
  const activeParticipantIds = activeParticipantRows.map((participant) => participant.user_id);
  const profileById = new Map(profiles.data.map((item) => [item.id, mapProfile(item)]));

  return {
    recommendations: recommendations.data.map(mapRecommendation),
    suggestions: suggestions.data.map(mapSuggestion),
    members: members.data.map(mapMember),
    history: history.data.map(mapHistory),
    activeCycle: mapCycle(activeCycle),
    cycles: cycles.data.map(mapCycle),
    profile: mapProfile(profile.data),
    profiles: profiles.data.map(mapProfile),
    leaderboard: leaderboard.data.map(mapProfile),
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
