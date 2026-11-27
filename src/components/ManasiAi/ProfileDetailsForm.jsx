import { useMemo, useState } from "react";
import ai from "../../assets/Ai/ai.svg";
import SelectDropdown from "./SelectDropdown";
import { DEFAULT_COUNTRY, ROADMAP_CONTROL_HEIGHT } from "./constants";
import {
  COUNTRY_NAMES,
  GENDER_OPTIONS,
  getStateNames,
  isValidPhone,
} from "./demographics";

const INITIAL_DETAILS = {
  name: "",
  gender: "",
  age: "",
  country: DEFAULT_COUNTRY,
  state: "",
  phone: "",
};

// Fields and the button share the roadmap-wide control height
const CONTROL_HEIGHT = ROADMAP_CONTROL_HEIGHT;

const FIELD_CLASS = `w-full ${CONTROL_HEIGHT} px-5 rounded-[24px] bg-white text-[14px] leading-5 font-semibold text-[#68270B] placeholder:text-[#B77145] outline-none manrope`;

const ArrowRight = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
    className="shrink-0"
  >
    <path
      d="M3 8h10M9 4l4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// First step of the roadmap: basic details about the user.
// The parent saves the details to the user's profile.
const ProfileDetailsForm = ({ initialDetails, onSubmit }) => {
  // Prefilled when the user comes back from the first question
  const [details, setDetails] = useState(initialDetails ?? INITIAL_DETAILS);

  const update = (field) => (e) =>
    setDetails((prev) => ({ ...prev, [field]: e.target.value }));

  // Countries without a state list get a free-text field instead
  const stateOptions = useMemo(
    () => getStateNames(details.country),
    [details.country],
  );

  // A new country invalidates the chosen state
  const changeCountry = (country) =>
    setDetails((prev) =>
      prev.country === country ? prev : { ...prev, country, state: "" },
    );

  const phoneInvalid = details.phone.trim() !== "" && !isValidPhone(details.phone.trim());

  const isComplete =
    details.name.trim() &&
    details.gender &&
    details.age &&
    details.country &&
    details.state.trim() &&
    isValidPhone(details.phone.trim());

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isComplete) return;
    onSubmit({
      ...details,
      name: details.name.trim(),
      state: details.state.trim(),
      phone: details.phone.trim(),
    });
  };

  return (
    // Scrolls only on very short screens, with the bar hidden
    <main className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex flex-col w-full px-5">
      {/* Spacing tightens on short screens so the form fits without scrolling */}
      <div className="my-auto flex flex-col items-center gap-8 md:gap-10 [@media(max-height:760px)]:gap-6 w-full max-w-100 mx-auto py-6 [@media(max-height:760px)]:py-2 text-center">
        <div className="flex flex-col items-center gap-8 md:gap-10 [@media(max-height:760px)]:gap-5 w-full">
          <img src="https://res.cloudinary.com/dspwbbjyt/image/upload/v1795769893/ai-gif_ctnktq.gif" alt="Manasi" className="h-10 md:h-12.5" />
          {/* Mobile and tablet break after "can"; desktop breaks after "we".
              The mobile size scales with the screen so line one never wraps */}
          <h1 className="text-[clamp(18px,5.8vw,24px)] md:text-[24px] lg:text-[27px] font-medium text-white tracking-[-3%] leading-[1.25] lg:leading-[1.2]">
            Tell us who you are, so we
            <br className="hidden lg:inline" /> can
            <br className="lg:hidden" /> shape your roadmap.
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full flex flex-col gap-2.5 p-4 md:p-6.25 bg-[#FAF4E8] rounded-[28px] md:rounded-[40px] text-left"
        >
          <input
            type="text"
            value={details.name}
            onChange={update("name")}
            placeholder="Your name"
            aria-label="Your name"
            autoComplete="name"
            className={FIELD_CLASS}
          />

          <div className="flex gap-1.5">
            <div className="flex-1 min-w-0">
              <SelectDropdown
                value={details.gender}
                onChange={(gender) =>
                  setDetails((prev) => ({ ...prev, gender }))
                }
                options={GENDER_OPTIONS}
                placeholder="Gender"
                triggerClassName={FIELD_CLASS}
              />
            </div>

            {/* Wrapped like the dropdowns: a padded input as the flex item
                gets its padding added on top of its share, so it came out wider */}
            <div className="flex-1 min-w-0">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={120}
                value={details.age}
                onChange={update("age")}
                placeholder="Age"
                aria-label="Age"
                className={`${FIELD_CLASS} no-spinner`}
              />
            </div>
          </div>

          <div className="flex gap-1.5">
            <div className="flex-1 min-w-0">
              <SelectDropdown
                value={details.country}
                onChange={changeCountry}
                options={COUNTRY_NAMES}
                placeholder="Country"
                triggerClassName={FIELD_CLASS}
                matchTriggerWidth
                searchable
                shortList
              />
            </div>

            <div className="flex-1 min-w-0">
              {stateOptions.length > 0 ? (
                <SelectDropdown
                  value={details.state}
                  onChange={(state) =>
                    setDetails((prev) => ({ ...prev, state }))
                  }
                  options={stateOptions}
                  placeholder="State"
                  triggerClassName={FIELD_CLASS}
                  matchTriggerWidth
                  searchable
                  shortList
                />
              ) : (
                <input
                  type="text"
                  value={details.state}
                  onChange={update("state")}
                  placeholder="State / Province"
                  aria-label="State or province"
                  autoComplete="address-level1"
                  className={FIELD_CLASS}
                />
              )}
            </div>
          </div>

          <div>
            <input
              type="tel"
              inputMode="tel"
              value={details.phone}
              onChange={update("phone")}
              placeholder="Phone number"
              aria-label="Phone number"
              aria-invalid={phoneInvalid}
              autoComplete="tel"
              className={`${FIELD_CLASS} ${phoneInvalid ? "ring-1 ring-red-400" : ""}`}
            />
            {phoneInvalid && (
              <p className="mt-1.5 px-5 text-[12px] font-medium text-red-500 manrope">
                Enter a valid phone number
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!isComplete}
            className={`w-full ${CONTROL_HEIGHT} flex items-center justify-center gap-2.5 rounded-full bg-[#B77145] text-white text-[14px] md:text-[16px] font-medium tracking-[-1%] transition-[background-color,opacity,transform] duration-200 enabled:cursor-pointer enabled:hover:bg-[#68270B] enabled:active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed manrope`}
          >
            Save &amp; Continue
            <ArrowRight />
          </button>
        </form>
      </div>
    </main>
  );
};

export default ProfileDetailsForm;
