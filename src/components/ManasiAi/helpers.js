import { NEUROTYPICAL_SET, NEURODIVERGENT_SET } from "../../data/questionnaires.js";

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
const DEFAULT_RETURN_PATH = AI_PAGE_PATH;
const AI_RETURN_STORAGE_KEY = "manasi_ai_return_to";

const isUnderPath = (pathname, base) =>
  pathname === base || pathname.startsWith(`${base}/`);

// Same-origin path for `value`, or null if it points anywhere else
// or into the `excludedBase` section of the site
const toSameOriginPath = (value, excludedBase = ROADMAP_PAGE_PATH) => {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    if (isUnderPath(url.pathname, excludedBase)) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
};

// Where the AI page's close button goes: the page the user opened the AI
// from. Remembered for the tab so a roadmap round-trip doesn't lose it.
export const resolveAiReturnPath = (from) => {
  const fresh =
    toSameOriginPath(from, AI_PAGE_PATH) ||
    toSameOriginPath(document.referrer, AI_PAGE_PATH);
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

// Where to send the user after submitting: ?from=, then the referring
// page on this site, then the AI chat
export const resolveRoadmapReturnPath = (from) =>
  toSameOriginPath(from) ||
  toSameOriginPath(document.referrer) ||
  DEFAULT_RETURN_PATH;

// ---------- Chat history ----------

const ROADMAP_SESSION_TITLE = "Roadmap Assessment";

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

// Rebuilds chat messages from a stored conversation. Roadmap sessions store
// Manasi's question as `question` and the user's pick as `answer`.
export const historyToMessages = (record) => {
  const time = formatTime(record.updated_at);
  const isRoadmap = record.title === ROADMAP_SESSION_TITLE;

  return (record.history || []).flatMap(({ question, answer, cta }) =>
    isRoadmap
      ? [
          { role: "assistant", content: question, time },
          { role: "user", content: answer, time },
        ]
      : [
          { role: "user", content: question, time },
          { role: "assistant", content: answer, cta: cta ?? null, time },
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
