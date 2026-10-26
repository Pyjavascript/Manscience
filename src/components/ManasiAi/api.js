import { supabase } from "../../supabase.js";
import {
  CHAT_ENDPOINT,
  SAVE_TURN_ENDPOINT,
  historyEndpoint,
  ROADMAP_SUBMIT_ENDPOINT,
  MAPPED_THERAPIES_ENDPOINT,
} from "./constants.js";
import { ROADMAP_RESULTS_TABLE } from "./helpers.js";

export const postChatMessage = async ({ message, sessionId, userId }) => {
  const response = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId, user_id: userId }),
  });
  return response.json();
};

export const saveChatTurn = ({ sessionId, userId, question, answer }) =>
  fetch(SAVE_TURN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      user_id: userId,
      question,
      answer,
    }),
  });

// Returns the user's history records, or null if the lookup failed
export const fetchChatHistory = async (uid) => {
  try {
    const response = await fetch(historyEndpoint(uid));
    if (!response.ok) return null;
    const data = await response.json();
    return data.history_records || [];
  } catch (e) {
    console.error("Sidebar update lookup failure:", e);
    return null;
  }
};

// Submits the roadmap, fetches mapped therapies and stores them in Supabase.
// Throws if any step fails.
export const submitRoadmap = async (payload, userId) => {
  const submitRes = await fetch(ROADMAP_SUBMIT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!submitRes.ok) throw new Error("Base database roadmap submission failed.");
  await submitRes.json();

  const therapyRes = await fetch(MAPPED_THERAPIES_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!therapyRes.ok) {
    throw new Error(
      `Therapy API rejected request with status: ${therapyRes.status}`,
    );
  }
  const therapyData = await therapyRes.json();

  // The backend stores scores in user_roadmap_results; merge the therapies
  // into that same row's result so everything lives in one table
  const { data: existing, error: readError } = await supabase
    .from(ROADMAP_RESULTS_TABLE)
    .select("result, raw")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) throw readError;

  const { error } = await supabase.from(ROADMAP_RESULTS_TABLE).upsert({
    user_id: userId,
    classification: therapyData.classification || payload.Classification,
    result: {
      ...(existing?.result || {}),
      aggregated_therapies: therapyData.aggregated_therapies || [],
    },
    raw: existing?.raw || payload,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
};
