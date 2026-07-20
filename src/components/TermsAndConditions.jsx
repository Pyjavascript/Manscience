import React, { useState, useRef } from 'react';
import logo from '../assets/icons/manascience.svg'

// Terms & Conditions Modal Component
function TermsModal({ selectedTab, onClose }) {
  const containerRef = useRef(null);
  const [scrollPercentage, setScrollPercentage] = useState(0);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const totalScrollableHeight = container.scrollHeight - container.clientHeight;
    if (totalScrollableHeight > 0) {
      const scrolled = (container.scrollTop / totalScrollableHeight) * 100;
      setScrollPercentage(scrolled);
    }
  };

  return (
    <div className="w-full max-w-[1070px] mx-auto p-5 sm:p-8 lg:p-[40px] bg-[#FAF4E8] rounded-[24px] sm:rounded-[36px] manrope relative transition-all duration-300">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h2 className="text-[22px] sm:text-[28px] lg:text-[34px] font-medium text-[#B05A36] leading-tight">
            Terms and Conditions
          </h2>
          <p className="text-[14px] md:text-[16px] text-[#B05A36] font-semibold tracking-wider uppercase mt-1">
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
        className="h-[320px] sm:h-[380px] w-full overflow-y-auto py-2 pr-2 sm:pr-4 text-[13px] sm:text-[14px] lg:text-[16px] font-medium md:font-normal leading-[1.6] text-[#424242] tracking-wide space-y-4"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style dangerouslySetInnerHTML={{
          __html: `
          div::-webkit-scrollbar {
            display: none;
          }
        `}} />

        <p>
          At ManaScience, we collect only the information necessary to provide, maintain, and continuously improve our platform and services. When you create an account, subscribe to a membership, register for courses, book a consultation, or contact our support team, we may collect personal information such as your name, email address, phone number, country of residence, and account credentials.
        </p>
        <p>
          If you choose to use features such as assessments, progress tracking, therapy recommendations, or practitioner consultations, we may collect the information you voluntarily provide, including assessment responses, developmental concerns, therapy goals, progress updates, and other relevant information.
        </p>
        <p>
          When interacting with the Manasi AI Assistant, we may collect your prompts, questions, conversation history, and feedback to improve the quality, accuracy, and safety of AI-generated responses.
        </p>
        <p>
          We automatically collect certain technical and usage information whenever you access the platform. This may include your IP address, browser type, operating system, device information, pages visited, session duration, referral sources, clickstream data, and diagnostic logs.
        </p>
        <p>
          For users purchasing memberships or paid services, payment transactions are securely processed through trusted third-party payment providers. ManaScience does not store your complete credit or debit card information on its servers.
        </p>
      </div>

      {/* Footer Controls */}
      <div className="mt-6 flex justify-between items-center pt-2">
        <div className="relative w-28 sm:w-36 h-2 bg-black/10 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-[#BA5023] rounded-full transition-all duration-75 ease-out"
            style={{
              width: '20px',
              transform: `translateX(${(scrollPercentage / 100) * (144 - 20)}px)`,
            }}
          />
        </div>

        <button
          onClick={onClose}
          className="text-xs sm:text-sm font-semibold text-[#BA5023] hover:underline uppercase tracking-wider cursor-pointer"
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
    'Overview',
    'Data We Collect',
    'Data Usage',
    'Sharing & Security'
  ];

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-8 manrope">
      {activeTab ? (
        /* Modal Content when any button is selected */
        <TermsModal selectedTab={activeTab} onClose={() => setActiveTab(null)} />
      ) : (
        <div className="flex flex-col items-center text-center">
          {/* Main Title */}
          <h1 className="text-[32px] sm:text-[48px] lg:text-[64px] font-medium md:font-normal text-[#B05A36] leading-tight tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-[12px] sm:text-[14px] lg:text-[16px] text-[#B05A36] font-medium mt-1">
            Last Updated: July 2026
          </p>

          {/* Icon/Logo */}
          <div className="my-8 sm:my-12">
            <img src={logo} alt="logo" />
          </div>

          {/* 4 Category Pill Buttons */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-3 sm:gap-4 w-full max-w-[750px]">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 sm:px-6 py-4.75 rounded-full text-[14px] md:text-[15px] font-semibold transition-all cursor-pointer bg-[#FAF4E8] text-[#B05A36] hover:bg-[#BA5023] hover:text-white active:scale-95"
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