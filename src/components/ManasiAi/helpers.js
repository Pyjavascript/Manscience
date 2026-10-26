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

export const createQuizMessage = (step) => ({
  role: "assistant",
  content: QUESTIONNAIRE[step].question,
  isQuiz: true,
  options: QUESTIONNAIRE[step].options,
  step,
  selectedAnswer: null,
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

// Index of the first question in the visible 4-question window,
// keeping the current question roughly in view
export const getQuestionWindowStart = (totalQuestions, currentIdx) => {
  if (totalQuestions <= 4 || currentIdx <= 1) return 0;
  if (currentIdx >= totalQuestions - 2) return totalQuestions - 4;
  return currentIdx - 1;
};
