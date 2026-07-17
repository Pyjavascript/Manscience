import React, { useState } from 'react';

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  // Setup the custom hex colors from your layout design
  const colors = {
    faqBg: '#faf4e8',
    primaryBrand: '#b05a36',
    mobileText: '#68270b',
  };

  const faqData = [
    {
      question: "How does Manasi provide recommendations?",
      answer: "ManaScience features evidence-informed therapies such as Neurofeedback, MNRI, Occupational Therapy, Speech Therapy, Sensory Integration, and Cognitive Training, with simple explanations and research-backed insights."
    },
    {
      question: "Is my conversation with Manasi private?",
      answer: "ManaScience features evidence-informed therapies such as Neurofeedback, MNRI, Occupational Therapy, Speech Therapy, Sensory Integration, and Cognitive Training, with simple explanations and research-backed insights."
    },
    {
      question: "Can Manasi recommend therapies?",
      answer: "ManaScience features evidence-informed therapies such as Neurofeedback, MNRI, Occupational Therapy, Speech Therapy, Sensory Integration, and Cognitive Training, with simple explanations and research-backed insights."
    },
    {
      question: "Does Manasi remember previous conversations?",
      answer: "ManaScience features evidence-informed therapies such as Neurofeedback, MNRI, Occupational Therapy, Speech Therapy, Sensory Integration, and Cognitive Training, with simple explanations and research-backed insights."
    },
    {
      question: "Can I ask Manasi about specific conditions?",
      answer: "ManaScience features evidence-informed therapies such as Neurofeedback, MNRI, Occupational Therapy, Speech Therapy, Sensory Integration, and Cognitive Training, with simple explanations and research-backed insights."
    }
  ];

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="w-full p-6 font-['Manrope',sans-serif]">
      <div className="w-full max-w-[650px] mx-auto text-center">
        
        {/* Title */}
        <h2 
          className="text-[32px] sm:text-[64px] font-normal leading-[121%] sm:leading-[110%] tracking-[-0.01em] sm:tracking-[-0.02em] mb-7 sm:mb-10"
          style={{ color: colors.primaryBrand }}
        >
          Frequently Asked<br />Questions
        </h2>

        {/* FAQ Wrapper */}
        <div className="flex flex-col gap-4 mb-8">
          {faqData.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div 
                className="rounded-[24px] sm:rounded-[34px] overflow-hidden text-left transition-all duration-300"
                style={{ backgroundColor: colors.faqBg }}
                key={index}
              >
                {/* Accordion Header Trigger */}
                <div 
                  className="p-[18px_20px] sm:p-[24px_25px] flex justify-between items-center cursor-pointer select-none gap-4"
                  onClick={() => toggleFAQ(index)}
                >
                  <span 
                    className="text-[15px] sm:text-[18px] font-medium leading-[120%] sm:leading-[23.4px] tracking-normal"
                    style={{ color: typeof window !== 'undefined' && window.innerWidth <= 480 ? colors.mobileText : colors.primaryBrand }}
                  >
                    {item.question}
                  </span>
                  
                  {/* Toggle Circle Icon Button */}
                  <div 
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex justify-center items-center flex-shrink-0 text-white transition-transform duration-300"
                    style={{ backgroundColor: colors.primaryBrand }}
                  >
                    {isOpen ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    )}
                  </div>
                </div>

                {/* Animated Accordion Panel Content */}
                <div 
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div 
                    className="p-[0_20px_18px_20px] sm:p-[0_28px_24px_28px] text-[13.5px] sm:text-[15px] font-normal Alain-height-[1.5]"
                    style={{ color: typeof window !== 'undefined' && window.innerWidth <= 480 ? colors.mobileText : colors.primaryBrand }}
                  >
                    {item.answer}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <button 
          className="text-white border-none p-[25px_55px] rounded-[35px] text-[14px] font-medium cursor-pointer transition-opacity duration-200 hover:opacity-90"
          style={{ backgroundColor: colors.primaryBrand }}
        >
          View All
        </button>
      </div>
    </div>
  );
}