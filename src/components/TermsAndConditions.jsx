import React, { useState, useRef } from "react";
import logo from "../assets/icons/manascience.svg";

// Terms & Conditions Modal Component
function TermsModal({ selectedTab, onClose }) {
  const containerRef = useRef(null);
  const [scrollPercentage, setScrollPercentage] = useState(0);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const totalScrollableHeight =
      container.scrollHeight - container.clientHeight;
    if (totalScrollableHeight > 0) {
      const scrolled = (container.scrollTop / totalScrollableHeight) * 100;
      setScrollPercentage(scrolled);
    }
  };

  return (
    <div className="w-full mx-auto p-5 sm:p-8 lg:p-[40px] bg-[#FAF4E8] rounded-[34px] sm:rounded-[36px] manrope relative transition-all duration-300">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h2 className="text-[22px] sm:text-[28px] lg:text-[34px] font-medium text-[#B05A36] leading-tight">
            Terms and Conditions
          </h2>
          <p className="text-[14px] md:text-[16px] text-[#B05A36] font-semibold tracking-[1.5] mt-[14px]">
            {selectedTab}
          </p>
        </div>
        <button
          onClick={onClose}
          type="button"
          aria-label="Close"
          className="text-[#B05A36] hover:opacity-75 text-3xl font-bold leading-none p-1 transition-opacity cursor-pointer"
        >
          &times;
        </button>
      </div>

      {/* Content Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[40vh] sm:h-[40vh] w-full overflow-y-auto py-2 pr-2 sm:pr-4 text-[13px] sm:text-[14px] lg:text-[16px] font-medium md:font-normal leading-[1.6] text-[#424242] tracking-wide space-y-4"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
          div::-webkit-scrollbar {
            display: none;
          }
        `,
          }}
        />

        <p>
          At ManaScience, we collect only the information necessary to provide,
          maintain, and continuously improve our platform and services. When you
          create an account, subscribe to a membership, register for courses,
          book a consultation, or contact our support team, we may collect
          personal information such as your name, email address, phone number,
          country of residence, and account credentials.
        </p>
        <p>
          If you choose to use features such as assessments, progress tracking,
          therapy recommendations, or practitioner consultations, we may collect
          the information you voluntarily provide, including assessment
          responses, developmental concerns, therapy goals, progress updates,
          and other relevant information.
        </p>
        <p>
          When interacting with the Manasi AI Assistant, we may collect your
          prompts, questions, conversation history, and feedback to improve the
          quality, accuracy, and safety of AI-generated responses.
        </p>
        <p>
          We automatically collect certain technical and usage information
          whenever you access the platform. This may include your IP address,
          browser type, operating system, device information, pages visited,
          session duration, referral sources, clickstream data, and diagnostic
          logs.
        </p>
        <p>
          For users purchasing memberships or paid services, payment
          transactions are securely processed through trusted third-party
          payment providers. ManaScience does not store your complete credit or
          debit card information on its servers.
        </p>
      </div>

      {/* Footer Controls */}
      {/* Footer Controls */}
      <div className="mt-6 flex justify-between items-center pt-2 shrink-0">
        <div className="relative w-28 sm:w-36 h-2 bg-white rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-[#B77145] rounded-full transition-all duration-150 ease-out"
            style={{
              width: "20px",
              left: `calc(${scrollPercentage}% - ${(scrollPercentage / 100) * 20}px)`,
            }}
          />
        </div>

        <button
          onClick={onClose}
          className="text-xs sm:text-sm font-semibold text-[#B77145] hover:underline uppercase tracking-wider cursor-pointer"
        >
          Agree
        </button>
      </div>
    </div>
  );
}

// Main Privacy Policy Component
export default function PrivacyPolicy() {
  const [activeTab, setActiveTab] = useState(null);

  const tabs = [
    "Overview",
    "Data We Collect",
    "Data Usage",
    "Sharing & Security",
  ];

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-8 manrope">
      {activeTab ? (
        /* Modal Content when any button is selected */
        <TermsModal
          selectedTab={activeTab}
          onClose={() => setActiveTab(null)}
        />
      ) : (
        <div className="flex flex-col items-center text-center">
          {/* Main Title */}
          <h1 className="text-[32px] sm:text-[48px] lg:text-[64px] font-medium md:font-normal text-[#B05A36] leading-tight tracking-tight mb-[20px]">
            Privacy Policy
          </h1>
          <p className="text-[12px] sm:text-[14px] lg:text-[16px] text-[#B05A36] font-medium mt-1">
            Last Updated: July 2026
          </p>

          {/* Icon/Logo */}
          <div className="my-[80px] h-[160px] w-[160px] sm:my-[80px]">
            <img src={logo} alt="logo" />
          </div>

          <div className="grid grid-cols-2 lg:flex lg:flex-row justify-center items-center gap-3 sm:gap-4 lg:gap-[10px] w-fit mx-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-5 h-[70px] sm:h-[80px] min-w-[160px] sm:min-w-[180px] whitespace-nowrap rounded-full text-[13px] sm:text-[15px] font-semibold transition-all cursor-pointer bg-[#FAF4E8] text-[#B05A36] hover:bg-[#B77145] hover:text-white active:scale-95 flex items-center justify-center text-center"
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
