import { useNavigate } from "react-router-dom";
import { getRoadmapUrl } from "./ManasiAi/helpers";

// Shared type scale so every card in the pop-up reads the same way
const CARD_CLASS = "bg-white rounded-[24px] md:rounded-[30px] p-5 md:p-7";
const CARD_TITLE_SIZE = "text-[16px] md:text-[18px] font-medium leading-[130%]";
const CARD_TEXT_SIZE = "text-[13px] md:text-[14px] leading-[140%]";
const CARD_TITLE_CLASS = `${CARD_TITLE_SIZE} text-[#5F2305]`;
const CARD_TEXT_CLASS = `${CARD_TEXT_SIZE} text-[#B77145]`;
// Same as the CTAs in the "Share Your Story" pop-up
const BUTTON_CLASS =
  "w-full bg-[#B77145] hover:opacity-90 text-white text-[14px] md:text-[16px] font-semibold rounded-[40px] h-12 md:h-[70px] flex items-center justify-center leading-[124%] transition cursor-pointer";

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const SectionTitle = ({ children }) => (
  <h3 className="text-[13px] md:text-[14px] font-medium text-[#B77145]/70 mb-3 px-1">
    {children}
  </h3>
);

// Brown check circle, as on the profile page's "Completed" pill
const CheckCircle = () => (
  <span className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#B77145] flex items-center justify-center shrink-0">
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  </span>
);

const progressText = ({ answered, total }) =>
  total
    ? `${answered} of ${total} questions answered`
    : `${answered} screening ${answered === 1 ? "question" : "questions"} answered`;

// Roadmap that hasn't been finished yet, with a way back into it
const InProgressRoadmap = ({ entry, onStart }) => {
  const percent = entry.total
    ? Math.round((entry.answered / entry.total) * 100)
    : 0;

  return (
    <div className={CARD_CLASS}>
      <div className="flex items-baseline justify-between gap-3">
        <p className={CARD_TITLE_CLASS}>Roadmap in progress</p>
        <span className={`${CARD_TEXT_SIZE} text-[#B77145]/70 shrink-0`}>
          {formatDate(entry.date)}
        </span>
      </div>

      <div className="mt-5 h-1.5 rounded-full bg-[#FAF4E8] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#B77145]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className={`${CARD_TEXT_CLASS} mt-2.5`}>{progressText(entry)}</p>

      <div className="mt-7 md:mt-9">
        <button onClick={onStart} className={BUTTON_CLASS}>
          Start roadmap again
        </button>
      </div>
    </div>
  );
};

// Most recent finished roadmap
const CompletedRoadmap = ({ entry }) => (
  <div className={`${CARD_CLASS} flex items-center gap-4`}>
    <CheckCircle />
    <div className="flex flex-col gap-0.5 min-w-0">
      <p className={CARD_TITLE_CLASS}>Roadmap completed</p>
      <p className={`${CARD_TEXT_SIZE} text-[#B77145]/70`}>
        {formatDate(entry.date)}
      </p>
    </div>
  </div>
);

// One row in the "Earlier" list, with softer text than the cards above
const EarlierRoadmap = ({ entry }) => (
  <li className="flex items-center justify-between gap-3 px-5 md:px-7 py-4">
    <div className="flex flex-col gap-0.5 min-w-0">
      <p className={`${CARD_TEXT_SIZE} font-medium text-[#5F2305]/70`}>
        {entry.isComplete ? "Completed roadmap" : "Unfinished roadmap"}
      </p>
      {!entry.isComplete && (
        <p className={`${CARD_TEXT_SIZE} text-[#B77145]/70`}>
          {progressText(entry)}
        </p>
      )}
    </div>
    <span className={`${CARD_TEXT_SIZE} text-[#B77145]/70 shrink-0`}>
      {formatDate(entry.date)}
    </span>
  </li>
);

const PractitionerRow = ({ practitioner }) => (
  <div className="flex items-center gap-4">
    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden bg-[#B77145] shrink-0 flex items-center justify-center">
      {practitioner.profile_image ? (
        <img
          src={practitioner.profile_image}
          alt={practitioner.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-white text-[18px] md:text-[20px] font-medium">
          {practitioner.name?.charAt(0)?.toUpperCase() || "P"}
        </span>
      )}
    </div>
    <div className="flex flex-col gap-0.5 min-w-0">
      <p className={`${CARD_TITLE_CLASS} truncate`}>{practitioner.name}</p>
      <p className={`${CARD_TEXT_SIZE} text-[#B77145]/70 truncate`}>
        {practitioner.specialization || "General Care Specialist"}
      </p>
    </div>
  </div>
);

// One place for the user's roadmap history and practitioner notes
const ProfileHistoryModal = ({
  onClose,
  timeline,
  roadmap,
  practitioners,
}) => {
  const navigate = useNavigate();

  // The newest attempt counts as in progress only if nothing was completed
  // after it; every other attempt goes under "Earlier"
  const latestComplete = timeline.find((e) => e.isComplete);
  const inProgress = timeline[0]?.isComplete ? null : timeline[0];
  const earlier = timeline.filter(
    (e) => e !== latestComplete && e !== inProgress,
  );

  const startRoadmap = () => navigate(getRoadmapUrl("/profile"));
  const summary = roadmap?.practitioner_summary?.trim();

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-white/70 z-50 flex justify-center items-center p-4 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="My Journey"
        className="bg-[#FAF4EB] w-full max-w-[600px] max-h-[90vh] rounded-[32px] md:rounded-[40px] overflow-y-auto scrollbar-none shadow-xl manrope"
      >
        <div className="sticky top-0 z-10 bg-[#FAF4EB] flex items-center justify-between gap-4 px-5 md:px-8 pt-6 md:pt-8 pb-5">
          <h2 className="text-[22px] md:text-[28px] font-medium text-[#5F2305] leading-[120%] tracking-[-2%]">
            My Journey
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#68270B] text-[18px] font-bold hover:bg-[#68270B]/8 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-8 md:gap-10 px-5 md:px-8 pb-6 md:pb-8">
          <section>
            <SectionTitle>Roadmap</SectionTitle>
            {timeline.length === 0 ? (
              <div className={CARD_CLASS}>
                <p className={CARD_TITLE_CLASS}>
                  You haven't started a roadmap yet
                </p>
                <div className="mt-7 md:mt-9">
                  <button onClick={startRoadmap} className={BUTTON_CLASS}>
                    Start my roadmap
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {inProgress && (
                  <InProgressRoadmap entry={inProgress} onStart={startRoadmap} />
                )}
                {latestComplete && <CompletedRoadmap entry={latestComplete} />}
              </div>
            )}
          </section>

          <section>
            <SectionTitle>Practitioner feedback</SectionTitle>
            <div className={`${CARD_CLASS} flex flex-col gap-5`}>
              {practitioners.map((p) => (
                <PractitionerRow key={p.id} practitioner={p} />
              ))}
              <div
                className={
                  practitioners.length > 0
                    ? "pt-5 border-t border-[#B77145]/15"
                    : ""
                }
              >
                <p className={`${CARD_TEXT_SIZE} font-medium text-[#5F2305]`}>
                  Notes from your practitioner
                </p>
                <p className={`${CARD_TEXT_CLASS} mt-1.5 whitespace-pre-line`}>
                  {summary ||
                    (practitioners.length > 0
                      ? "Your practitioner hasn't added notes yet."
                      : "Once a practitioner is assigned to you, their notes will appear here.")}
                </p>
              </div>
            </div>
          </section>

          {earlier.length > 0 && (
            <section>
              <SectionTitle>Earlier</SectionTitle>
              <ul className="bg-white rounded-[24px] md:rounded-[30px] divide-y divide-[#B77145]/15">
                {earlier.map((entry) => (
                  <EarlierRoadmap key={entry.id} entry={entry} />
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileHistoryModal;
