import React, { useState, useRef } from 'react';

export default function SubscriptionInput() {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [isError, setIsError] = useState(false);
  const [buttonText, setButtonText] = useState('Get Notified!');
  
  const inputRef = useRef(null);
  const scriptURL = "https://script.google.com/macros/s/AKfycbzp8JrWBzUvNjSsypoAc-JA0uDjBI0K63WdAszdMsZLt47vlXwn3H-YRILMsA6tHYWJ/exec";

  const validateEmail = (emailVal) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
  };

  const handleSubscribe = async () => {
    const trimmedEmail = email.trim();

    if (trimmedEmail === '') {
      inputRef.current?.focus();
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setIsError(true);
      return;
    }

    setIsError(false);
    setIsLoading(true);

    try {
      const response = await fetch(scriptURL, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "text/plain",
        },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const result = await response.json();
      setIsLoading(false);

      if (result.result === "success") {
        setIsActive(false);
        setEmail('');
        setButtonText("Thank you!");
    
      } else {
        setButtonText("Error");
        setIsActive(false);
        console.error(result.error);
      }
    } catch (error) {
      setIsLoading(false);
      setButtonText("Network Error");
      setIsActive(false);
      console.error("Error sending data:", error);
    }
  };

  const handleButtonClick = (e) => {
    e.preventDefault();
    if (!isActive) {
      setIsActive(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      handleSubscribe();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubscribe();
    }
  };

  return (
    <main className="w-full h-full flex justify-center items-center p-5 font-['Manrope',_sans-serif]">
      {/* Container wrapper */}
      <div 
        className={`bg-white border-[3px] border-transparent flex items-center justify-between max-w-[550px] rounded-[40px] overflow-hidden p-1.5 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${
          isActive ? 'w-full md:w-[420px]' : 'w-[160px]'
        }`}
      >
        {/* Input Field */}
        <input
          ref={inputRef}
          type="email"
          placeholder="Enter Your email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (isError) setIsError(false);
          }}
          onKeyDown={handleKeyDown}
          className={`text-base font-semibold border-none text-[#b05a36] outline-none transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] placeholder:text-slate-500 ${
            isError ? 'text-red-600' : ''
          } ${
            isActive 
              ? 'w-full opacity-100 py-2.5 px-[15px] ml-0' 
              : 'w-0 opacity-0 p-0 pointer-events-none'
          }`}
        />

        {/* Action Button */}
        <button
          onClick={handleButtonClick}
          className={`font-semibold border-none cursor-pointer relative flex items-center justify-center shrink-0 whitespace-nowrap text-base h-12 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${
            isActive 
              ? 'w-12 bg-[#b05a36] text-white rounded-full' 
              : 'w-[150px] bg-white text-[#b05a36] rounded-[40px]'
          }`}
        >
          {/* Main Label Text */}
          <span 
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ease-in-out ${
              isActive ? 'opacity-0 invisible' : 'opacity-100 visible'
            }`}
          >
            {buttonText}
          </span>

          {/* Ionicons Style Right Arrow SVG */}
          <span 
            className={`absolute flex items-center justify-center transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] ${
              isActive && !isLoading 
                ? 'opacity-100 scale-100 delay-200' 
                : 'opacity-0 scale-60 pointer-events-none'
            }`}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6 stroke-current" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </span>

          {/* Your Custom Loading Spinner Image */}
          <span 
            className={`absolute flex items-center justify-center transition-all duration-300 ease-in-out ${
              isLoading ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-50 pointer-events-none'
            }`}
          >
            <img 
              src="https://cdn.prod.website-files.com/6a1826bc669d4e5768e968dd/6a3e940f4d4e8d83d4731272_fade-stagger-circles.svg" 
              alt="loading"
              className="w-6 h-6"
            />
          </span>
        </button>
      </div>
    </main>
  );
}