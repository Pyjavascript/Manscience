import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Logo from "../assets/Ai/Logo.svg";

import { supabase } from "../supabase";
import {
  QUESTIONNAIRE,
  INITIAL_SCORING_STATE,
  ROADMAP_ERROR_MESSAGE,
} from "../components/ManasiAi/constants";
import {
  generateSessionId,
  classifyScreening,
  buildRoadmapPayload,
  getAuthUrl,
  resolveRoadmapReturnPath,
} from "../components/ManasiAi/helpers";
import {
  saveChatTurn,
  submitRoadmap,
  fetchProfileDetails,
  saveProfileDetails,
} from "../components/ManasiAi/api";
import ProfileDetailsForm from "../components/ManasiAi/ProfileDetailsForm";
import ScreeningQuestion from "../components/ManasiAi/ScreeningQuestion";
import ScreeningComplete from "../components/ManasiAi/ScreeningComplete";
import DomainScoring from "../components/ManasiAi/DomainScoring";
import RoadmapCompleted from "../components/ManasiAi/RoadmapCompleted";
import PageBackground from "../components/ManasiAi/PageBackground";

// How long the picked answer stays highlighted before moving on
const ANSWER_DELAY_MS = 250;
const PHASE_TRANSITION = { duration: 0.3, ease: "easeOut" };

const ManasiRoadmap = () => {
  const [sessionId] = useState(generateSessionId);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // details -> screening -> intro -> scoring -> completed
  const [phase, setPhase] = useState("details");

  // Basic details from the first form, saved to the users table and
  // prefilled from it on the next roadmap
  const [profileDetails, setProfileDetails] = useState(null);
  const detailsRequested = useRef(false);

  // Screening questions
  const [screeningStep, setScreeningStep] = useState(0);
  const [screeningAnswers, setScreeningAnswers] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);

  // Domain scoring
  const [scoringState, setScoringState] = useState(INITIAL_SCORING_STATE);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // Page the user started the roadmap from (?from=, else the referrer),
  // worked out on load so a login detour doesn't change it
  const [returnPath] = useState(() =>
    resolveRoadmapReturnPath(
      new URLSearchParams(window.location.search).get("from"),
    ),
  );

  const advanceTimer = useRef(null);

  // ---------- Effects ----------

  // Signed-out users are sent to log in and brought back to this URL,
  // so the roadmap is always saved against their account
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      if (!uid) {
        window.location.replace(`${window.location.origin}${getAuthUrl()}`);
        return;
      }
      setCurrentUserId(uid);

      // Load saved details once, before showing anything. If they're all
      // filled in, skip the form; otherwise use them to prefill it.
      // Not awaited: awaiting Supabase calls inside this callback can deadlock
      if (!detailsRequested.current) {
        detailsRequested.current = true;
        fetchProfileDetails(session.user)
          .then((saved) => {
            if (!saved) return;
            setProfileDetails((prev) => prev ?? saved);
            const isComplete =
              saved.name &&
              saved.gender &&
              saved.age &&
              saved.country &&
              saved.state &&
              saved.phone;
            if (isComplete) {
              setPhase((prev) => (prev === "details" ? "screening" : prev));
            }
          })
          .finally(() => setAuthLoading(false));
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(advanceTimer.current);
    };
  }, []);

  // ---------- History ----------

  const saveTurnToHistory = (question, answer) =>
    saveChatTurn({ sessionId, userId: currentUserId, question, answer }).catch(
      (err) => console.error("Failed to sync roadmap turn to database:", err),
    );

  // ---------- Screening ----------

  // Picking an answer only selects it (and can be changed); Next commits it
  const handleScreeningNext = () => {
    if (selectedOption === null) return;

    saveTurnToHistory(QUESTIONNAIRE[screeningStep].question, selectedOption);

    const answers = [...screeningAnswers, selectedOption];
    const nextStep = screeningStep + 1;

    setScreeningAnswers(answers);
    setSelectedOption(null);

    if (nextStep < QUESTIONNAIRE.length) {
      setScreeningStep(nextStep);
    } else {
      setScoringState({
        ...INITIAL_SCORING_STATE,
        isActive: true,
        dataset: classifyScreening(answers),
      });
      setPhase("intro");
    }
  };

  // First question goes back to the details form, any later one goes to
  // the previous question with the answer given there still selected
  const handleScreeningBack = () => {
    if (screeningStep === 0) {
      setSelectedOption(null);
      setPhase("details");
      return;
    }

    const prevStep = screeningStep - 1;
    setSelectedOption(screeningAnswers[prevStep] ?? null);
    setScreeningAnswers((prev) => prev.slice(0, prevStep));
    setScreeningStep(prevStep);
  };

  // From "Screening done" back to the last screening question
  const handleIntroBack = () => {
    const lastStep = QUESTIONNAIRE.length - 1;
    setSelectedOption(screeningAnswers[lastStep] ?? null);
    setScreeningAnswers((prev) => prev.slice(0, lastStep));
    setScreeningStep(lastStep);
    setScoringState(INITIAL_SCORING_STATE);
    setPhase("screening");
  };

  // ---------- Domain scoring ----------

  const handleRatingSelect = (rating) => {
    // Ignore extra clicks while the previous answer is still transitioning
    if (scoringState.selectedRating !== null) return;

    setScoringState((prev) => ({ ...prev, selectedRating: rating }));

    const { dataset, currentDomainIdx, currentQuestionIdx, answers } =
      scoringState;
    const currentDomain = dataset[currentDomainIdx];
    const domainName = currentDomain.domain;
    const updatedAnswers = {
      ...answers,
      [domainName]: [...(answers[domainName] || []), rating],
    };

    saveTurnToHistory(
      `[${domainName}] ${currentDomain.questions[currentQuestionIdx]}`,
      `Severity Rating: ${rating}/5`,
    );

    const hasMoreQuestions =
      currentQuestionIdx + 1 < currentDomain.questions.length;
    const hasMoreDomains = currentDomainIdx + 1 < dataset.length;

    advanceTimer.current = setTimeout(() => {
      if (hasMoreQuestions) {
        setScoringState((prev) => ({
          ...prev,
          currentQuestionIdx: prev.currentQuestionIdx + 1,
          answers: updatedAnswers,
          selectedRating: null,
        }));
      } else if (hasMoreDomains) {
        setScoringState((prev) => ({
          ...prev,
          currentDomainIdx: prev.currentDomainIdx + 1,
          currentQuestionIdx: 0,
          answers: updatedAnswers,
          selectedRating: null,
        }));
      } else {
        setScoringState((prev) => ({
          ...prev,
          isActive: false,
          isCompleted: true,
          answers: updatedAnswers,
          pendingPayload: buildRoadmapPayload(
            updatedAnswers,
            dataset,
            currentUserId || sessionId,
          ),
        }));
        setPhase("completed");
      }
    }, ANSWER_DELAY_MS);
  };

  // ---------- Submit ----------

  const submitFinalRoadmapPayload = async () => {
    if (!scoringState.pendingPayload || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError("");
    try {
      await submitRoadmap(
        scoringState.pendingPayload,
        currentUserId || sessionId,
      );
      // Replace, so Back doesn't land on the finished roadmap.
      // Stays in "Submitting" until the page changes.
      window.location.replace(`${window.location.origin}${returnPath}`);
    } catch (err) {
      console.error("Pipeline trace error:", err);
      setSubmitError(ROADMAP_ERROR_MESSAGE);
      setIsSubmitting(false);
    }
  };

  // ---------- Render ----------

  const renderPhase = () => {
    if (phase === "details") {
      return (
        <ProfileDetailsForm
          initialDetails={profileDetails}
          onSubmit={(details) => {
            setProfileDetails(details);
            setPhase("screening");
            // Saved in the background so the roadmap doesn't wait on it
            saveProfileDetails(currentUserId, details).catch((err) =>
              console.error("Failed to save profile details:", err),
            );
          }}
        />
      );
    }

    if (phase === "screening") {
      return (
        <ScreeningQuestion
          step={screeningStep}
          selectedOption={selectedOption}
          onSelect={setSelectedOption}
          onNext={handleScreeningNext}
          onBack={handleScreeningBack}
        />
      );
    }

    if (phase === "intro") {
      return (
        <ScreeningComplete
          onBegin={() => setPhase("scoring")}
          onBack={handleIntroBack}
        />
      );
    }

    if (phase === "scoring") {
      return (
        <DomainScoring
          scoringState={scoringState}
          onRatingSelect={handleRatingSelect}
        />
      );
    }

    return (
      <RoadmapCompleted
        isLoading={isSubmitting}
        onSubmit={submitFinalRoadmapPayload}
        error={submitError}
      />
    );
  };

  return (
    <div className="flex flex-col h-dvh w-full text-white select-none manrope overflow-hidden relative isolate pt-6 md:pt-10 pb-6 md:pb-10">
      <PageBackground />
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="md:absolute pl-5 md:pl-11 pb-2 z-10">
          <a
            href="https://www.manascience.in/new-home"
            target="_top"
            aria-label="Go to Manascience home"
            className="inline-block"
          >
            <img src={Logo} className="w-28.75 md:w-51" alt="Manascience" />
          </a>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={authLoading ? "auth" : phase}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={PHASE_TRANSITION}
            className="flex-1 min-h-0 flex flex-col"
          >
            {!authLoading && renderPhase()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ManasiRoadmap;
