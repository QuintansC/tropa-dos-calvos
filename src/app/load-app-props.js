import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "../lib/supabase/config.js";
import { createClient } from "../lib/supabase/server.js";
import { getBookClubState } from "../lib/book-club-data.js";

export async function loadAppProps() {
  if (!hasSupabaseConfig()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  return {
    initialState: await getBookClubStateOrSetupState(supabase, data.claims.sub),
    userEmail: data.claims.email || "Tropa do Calvo"
  };
}

async function getBookClubStateOrSetupState(supabase, userId) {
  try {
    return await getBookClubState(supabase, userId);
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return {
        recommendations: [],
        suggestions: [],
        members: [],
        history: [],
        activeCycle: null,
        cycles: [],
        profile: null,
        profiles: [],
        discordHandles: [],
        leaderboard: [],
        checkins: [],
        activeParticipants: [],
        currentUserParticipates: false,
        setupError:
          "As tabelas do clube ainda não existem no Supabase. Rode o SQL de supabase/schema.sql no SQL Editor do projeto."
      };
    }

    throw error;
  }
}

function isMissingSchemaError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Could not find the table") ||
    message.includes("Could not find the function") ||
    message.includes("schema cache")
  );
}
