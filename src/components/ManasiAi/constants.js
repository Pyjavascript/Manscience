// API endpoints
export const CHAT_ENDPOINT = "https://web-production-9cd48.up.railway.app/chat";
const MANASI_API_BASE = "https://web-production-9cd48.up.railway.app";
export const SAVE_TURN_ENDPOINT = `${MANASI_API_BASE}/chat/save_turn`;
export const historyEndpoint = (uid) =>
  `${MANASI_API_BASE}/chat/user/${uid}/history`;
export const ROADMAP_SUBMIT_ENDPOINT = `${MANASI_API_BASE}/roadmap/submit`;
export const MAPPED_THERAPIES_ENDPOINT = `${MANASI_API_BASE}/roadmap/mapped-therapies`;

export const BRAIN_IMAGE_URL =
  "https://res.cloudinary.com/dspwbbjyt/image/upload/v1785586774/brainImg_obpn0v.svg";

// Initial screening questions shown before the domain scoring
export const QUESTIONNAIRE = [
  {
    id: 0,
    question: "When did you first notice these difficulties?",
    options: ["Early Childhood", "Started Recently", "Not Sure"],
  },
  {
    id: 1,
    question:
      "Have these challenges been present across multiple settings (home, school, work, social situations)?",
    options: ["Yes", "No", "Not Sure"],
  },
  {
    id: 2,
    question:
      "Did the difficulties begin after an illness, injury, accident, surgery, infection, or major life event?",
    options: ["Yes", "No", "Not Sure"],
  },
  {
    id: 3,
    question:
      "Has a doctor, psychologist, or therapist ever mentioned autism, ADHD, dyslexia, developmental delay, or another neurodevelopmental condition?",
    options: ["Yes", "No", "Not Sure"],
  },
];

// Typed messages that start the roadmap quiz instead of hitting the chat API
export const ROADMAP_TRIGGER_PHRASES = [
  "Give me my personalized roadmap",
  "Help me navigate neuroplasticity",
];

// Quick-start chips on the welcome screen
export const SUGGESTIONS = [
  { label: "Explore ADHD", message: "What is ADHD" },
  { label: "Find Therapies", message: "Help me understand therapies" },
  { label: "Book Session", message: "Book a session" },
];

export const RATING_OPTIONS = [1, 2, 3, 4, 5];

export const INITIAL_QUIZ_STATE = {
  isActive: false,
  currentStep: 0,
  answers: [],
};

export const INITIAL_SCORING_STATE = {
  isActive: false,
  isCompleted: false,
  pendingPayload: null,
  dataset: [],
  currentDomainIdx: 0,
  currentQuestionIdx: 0,
  answers: {},
  selectedRating: null,
};

export const SCREENING_COMPLETE_MESSAGE = `Great job! We've completed your initial screening. Based on your responses, we'll now build your personalized Brain Roadmap.`;
export const ROADMAP_SUCCESS_MESSAGE =
  "Thank you for submitting your assessment! Your cognitive profile roadmap has been securely logged and processed. A practitioner will reach out within 3-5 days.";
export const ROADMAP_ERROR_MESSAGE =
  "We encountered an issue saving your profile data records. Please try again.";
