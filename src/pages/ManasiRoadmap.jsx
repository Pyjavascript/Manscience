import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
  resolveRoadmapReturnPath,
} from "../components/ManasiAi/helpers";
import { saveChatTurn, submitRoadmap } from "../components/ManasiAi/api";
import ScreeningQuestion from "../components/ManasiAi/ScreeningQuestion";
import ScreeningComplete from "../components/ManasiAi/ScreeningComplete";
import DomainScoring from "../components/ManasiAi/DomainScoring";
import RoadmapCompleted from "../components/ManasiAi/RoadmapCompleted";
import PageBackground from "../components/ManasiAi/PageBackground";

// How long the picked answer stays highlighted before moving on
const ANSWER_DELAY_MS = 250;
const PHASE_TRANSITION = { duration: 0.3, ease: "easeOut" };

const ManasiRoadmap = () => {
  const [searchParams] = useSearchParams();
  const [returnPath] = useState(() =>
    resolveRoadmapReturnPath(searchParams.get("from")),
  );
  const [sessionId] = useState(generateSessionId);
  const [currentUserId, setCurrentUserId] = useState(null);

  // screening -> intro -> scoring -> completed
  const [phase, setPhase] = useState("screening");

  // Screening questions
  const [screeningStep, setScreeningStep] = useState(0);
  const [screeningAnswers, setScreeningAnswers] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);

  // Domain scoring
  const [scoringState, setScoringState] = useState(INITIAL_SCORING_STATE);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const advanceTimer = useRef(null);

  // ---------- Effects ----------

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (user) setCurrentUserId(user.id);
      })
      .catch((err) => console.error("Auth context load failure:", err));

    return () => clearTimeout(advanceTimer.current);
  }, []);

  // ---------- History ----------

  const saveTurnToHistory = (question, answer) =>
    saveChatTurn({ sessionId, userId: currentUserId, question, answer }).catch(
      (err) => console.error("Failed to sync roadmap turn to database:", err),
    );

  // ---------- Screening ----------

  const handleScreeningSelect = (option) => {
    // Ignore extra clicks while the previous answer is still transitioning
    if (selectedOption !== null) return;

    setSelectedOption(option);
    saveTurnToHistory(QUESTIONNAIRE[screeningStep].question, option);

    const answers = [...screeningAnswers, option];
    const nextStep = screeningStep + 1;

    advanceTimer.current = setTimeout(() => {
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
    }, ANSWER_DELAY_MS);
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
      // Send the user back to wherever they started the roadmap from
      window.location.assign(returnPath);
    } catch (err) {
      console.error("Pipeline trace error:", err);
      setSubmitError(ROADMAP_ERROR_MESSAGE);
      setIsSubmitting(false);
    }
  };

  // ---------- Render ----------

  const renderPhase = () => {
    if (phase === "screening") {
      return (
        <ScreeningQuestion
          step={screeningStep}
          selectedOption={selectedOption}
          onSelect={handleScreeningSelect}
        />
      );
    }

    if (phase === "intro") {
      return <ScreeningComplete onBegin={() => setPhase("scoring")} />;
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
          <img src={Logo} className="w-28.75 md:w-51" alt="Manascience" />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={phase}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={PHASE_TRANSITION}
            className="flex-1 min-h-0 flex flex-col"
          >
            {renderPhase()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ManasiRoadmap;
