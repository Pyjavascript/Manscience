import { NEUROTYPICAL_SET, NEURODIVERGENT_SET } from "../../data/questionnaires.js";
import { QUESTIONNAIRE } from "./constants.js";

export const getCurrentTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const generateSessionId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "session_" + Math.random().toString(36).substring(2, 11);
};

// ---------- Message factories ----------

export const createUserMessage = (content) => ({
  role: "user",
  content,
  time: getCurrentTime(),
});

// Marks the CTA on the message at `index` as used so its buttons disappear
export const withActiveCta = (messages, index, label) =>
  messages.map((m, idx) => (idx === index ? { ...m, activeCta: label } : m));

// ---------- Screening & scoring ----------

// Picks the domain dataset based on the 4 screening answers
export const classifyScreening = (answers) => {
  let ndScore = 0;
  let ntScore = 0;

  if (answers[0] === "Early Childhood") ndScore++;
  if (answers[0] === "Started Recently") ntScore++;
  if (answers[1] === "Yes") ndScore++;
  if (answers[1] === "No") ndScore++;
  if (answers[2] === "Yes") ndScore++;
  if (answers[2] === "No") ndScore++;
  if (answers[3] === "Yes") ndScore++;
  if (answers[3] === "No") ntScore++;

  return ndScore >= ntScore ? NEURODIVERGENT_SET : NEUROTYPICAL_SET;
};

const getSeverity = (percentage) => {
  if (percentage >= 70) return "High";
  if (percentage >= 40) return "Moderate";
  return "Low";
};

// Converts the per-domain ratings into the body sent to the roadmap APIs
export const buildRoadmapPayload = (answers, dataset, userId) => {
  const score = Object.keys(answers).map((domainName) => {
    const ratings = answers[domainName];
    const rawScore = ratings.reduce((sum, val) => sum + val, 0);
    const percentage = Math.round((rawScore / (ratings.length * 5)) * 100);
    const domainObj = dataset.find((item) => item.domain === domainName);

    return {
      domain: domainName,
      domain_type: domainObj?.type || null,
      Score: percentage,
      Severity: getSeverity(percentage),
    };
  });

  return {
    user_id: userId,
    Classification: dataset === NEURODIVERGENT_SET ? "ND" : "NT",
    score,
  };
};

// ---------- Roadmap page routing ----------

export const AI_PAGE_PATH = "/ai";
export const ROADMAP_PAGE_PATH = "/ai/roadmap";
const AUTH_PAGE_PATH = "/auth";
export const PROFILE_PAGE_PATH = "/profile";
const DEFAULT_RETURN_PATH = AI_PAGE_PATH;
const AI_RETURN_STORAGE_KEY = "manasi_ai_return_to";

const isUnderPath = (pathname, base) =>
  pathname === base || pathname.startsWith(`${base}/`);

// Same-origin path for `value`, or null if it points anywhere else
// or into one of the `excludedBases` sections of the site
const toSameOriginPath = (value, ...excludedBases) => {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    if (excludedBases.some((base) => isUnderPath(url.pathname, base))) {
      return null;
    }
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
};

// Where the AI page's close button goes: the page the user opened the AI
// from. Remembered for the tab so a roadmap or login round-trip doesn't
// lose it.
export const resolveAiReturnPath = (from) => {
  const fresh =
    toSameOriginPath(from, AI_PAGE_PATH) ||
    toSameOriginPath(document.referrer, AI_PAGE_PATH, AUTH_PAGE_PATH);
  try {
    if (fresh) sessionStorage.setItem(AI_RETURN_STORAGE_KEY, fresh);
    return fresh || sessionStorage.getItem(AI_RETURN_STORAGE_KEY) || "/";
  } catch {
    return fresh || "/";
  }
};

// Link to the roadmap page that remembers where the user came from
export const getRoadmapUrl = (
  returnTo = window.location.pathname + window.location.search,
) => `${ROADMAP_PAGE_PATH}?from=${encodeURIComponent(returnTo)}`;

// Login page link that brings the user back to this exact URL afterwards
export const getAuthUrl = (
  returnTo = window.location.pathname +
    window.location.search +
    window.location.hash,
) => `${AUTH_PAGE_PATH}?redirect=${encodeURIComponent(returnTo)}`;

// Where to send the user after submitting: ?from=, then the referring
// page on this site, then the AI chat
export const resolveRoadmapReturnPath = (from) =>
  toSameOriginPath(from, ROADMAP_PAGE_PATH) ||
  toSameOriginPath(document.referrer, ROADMAP_PAGE_PATH) ||
  DEFAULT_RETURN_PATH;

// ---------- Chat history ----------

const ROADMAP_SESSION_TITLE = "Roadmap Assessment";

export const isRoadmapSession = (record) =>
  record.title === ROADMAP_SESSION_TITLE;

// The screening answers pick the domain set, which fixes how many
// questions the roadmap has. Total is null until screening is done.
export const getRoadmapProgress = (record) => {
  const turns = record.history || [];
  const answered = turns.length;
  if (answered < QUESTIONNAIRE.length) {
    return { answered, total: null, isComplete: false };
  }

  const dataset = classifyScreening(
    turns.slice(0, QUESTIONNAIRE.length).map((turn) => turn.answer),
  );
  const total =
    QUESTIONNAIRE.length +
    dataset.reduce((sum, domain) => sum + domain.questions.length, 0);
  return { answered, total, isComplete: answered >= total };
};

// Every roadmap attempt, newest first. Falls back to the stored result's
// date when the chat history has no finished attempt for it.
export const buildRoadmapTimeline = (records, roadmapRow) => {
  const entries = records.filter(isRoadmapSession).map((record) => ({
    id: record.session_id,
    date: record.updated_at,
    turns: record.history || [],
    ...getRoadmapProgress(record),
  }));

  if (roadmapRow?.updated_at && !entries.some((e) => e.isComplete)) {
    entries.push({
      id: "saved-roadmap",
      date: roadmapRow.updated_at,
      turns: [],
      answered: null,
      total: null,
      isComplete: true,
    });
  }

  return entries.sort((a, b) => new Date(b.date) - new Date(a.date));
};

const formatTime = (iso) =>
  iso
    ? new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : getCurrentTime();

// Sidebar label: the first message for chats, the stored title otherwise
export const getConversationTitle = (record) => {
  const firstQuestion = record.history?.[0]?.question?.trim();
  if (record.title === ROADMAP_SESSION_TITLE || !firstQuestion) {
    return record.title || "Untitled chat";
  }
  return firstQuestion;
};

const dayLabel = (date, now) => {
  const startOfDay = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);

  if (daysAgo <= 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  if (daysAgo < 7) return date.toLocaleDateString([], { weekday: "long" });
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() && { year: "numeric" }),
  });
};

// Newest first, bucketed as [{ label: "Today", items: [...] }, ...]
export const groupConversationsByDay = (records, now = new Date()) => {
  const groups = [];
  [...records]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .forEach((record) => {
      const label = dayLabel(new Date(record.updated_at), now);
      const last = groups[groups.length - 1];
      if (last?.label === label) last.items.push(record);
      else groups.push({ label, items: [record] });
    });
  return groups;
};

const ROADMAP_SUBMITTED_MESSAGE = "Thank you for submitting this roadmap.";
const ROADMAP_UNFINISHED_MESSAGE =
  "This roadmap wasn't finished. You can start a new one any time from the chat.";

// Rebuilds chat messages from a stored conversation. Roadmap answers aren't
// replayed in the chat; the session shows a single closing note instead.
export const historyToMessages = (record) => {
  const time = formatTime(record.updated_at);

  if (isRoadmapSession(record)) {
    const { isComplete } = getRoadmapProgress(record);
    return [
      {
        role: "assistant",
        content: isComplete
          ? ROADMAP_SUBMITTED_MESSAGE
          : ROADMAP_UNFINISHED_MESSAGE,
        time,
      },
    ];
  }

  return (record.history || []).flatMap(
    ({ question, answer, cta, response_id }) => [
      { role: "user", content: question, time },
      {
        role: "assistant",
        content: answer,
        cta: cta ?? null,
        // Only present if the history endpoint returns it
        responseId: response_id ?? null,
        time,
      },
    ],
  );
};

// ---------- Stored roadmaps ----------

export const ROADMAP_RESULTS_TABLE = "user_roadmap_results";

// Flattens a user_roadmap_results row (result / raw jsonb) into the
// mapped_domains / aggregated_therapies shape the dashboards and PDFs use
export const normalizeRoadmapResult = (row) => {
  if (!row) return null;
  const result = row.result || {};
  const raw = row.raw || result.raw || {};
  const domains = result.scores || raw.score || [];

  return {
    ...row,
    classification:
      row.classification || result.classification || raw.Classification,
    mapped_domains: domains.map((d) => ({
      domain: (d.domain || "").trim(),
      domain_type: d.domain_type ?? d.type,
      score: d.score ?? d.Score,
      severity: d.severity ?? d.Severity,
    })),
    aggregated_therapies: result.aggregated_therapies || [],
    practitioner_summary: result.practitioner_summary || "",
  };
};

// Index of the first question in the visible 4-question window,
// keeping the current question roughly in view
export const getQuestionWindowStart = (totalQuestions, currentIdx) => {
  if (totalQuestions <= 4 || currentIdx <= 1) return 0;
  if (currentIdx >= totalQuestions - 2) return totalQuestions - 4;
  return currentIdx - 1;
};
