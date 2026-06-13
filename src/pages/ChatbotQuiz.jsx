import React, { useState } from 'react';

// Define your questions, options, and points here.
// You can easily append as many questions as you need.
const quizData = [
  {
    id: 1,
    question: "What is your preferred frontend framework?",
    options: [
      { text: "React", points: 10 },
      { text: "Vue", points: 5 },
      { text: "Angular", points: 5 },
      { text: "Vanilla JS", points: 2 }
    ]
  },
  {
    id: 2,
    question: "Which database do you prefer for scalable apps?",
    options: [
      { text: "MongoDB", points: 10 },
      { text: "PostgreSQL", points: 10 },
      { text: "MySQL", points: 7 },
      { text: "Firebase", points: 5 }
    ]
  },
  {
    id: 3,
    question: "How do you prefer to style your applications?",
    options: [
      { text: "Tailwind CSS", points: 10 },
      { text: "CSS Modules", points: 8 },
      { text: "Styled Components", points: 8 },
      { text: "Inline Styles", points: 2 }
    ]
  }
];

export default function ChatbotQuiz() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [runningScore, setRunningScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Initial state setup with the first bot question
  const [chatHistory, setChatHistory] = useState([
    { sender: 'bot', text: quizData[0].question }
  ]);

  const handleOptionClick = (selectedOption) => {
    const currentQuestion = quizData[currentQuestionIndex];

    // 1. Map the answer selection details
    const updatedAnswers = {
      ...answers,
      [currentQuestion.id]: {
        question: currentQuestion.question,
        selectedAnswer: selectedOption.text,
        pointsAwarded: selectedOption.points
      }
    };
    setAnswers(updatedAnswers);

    // 2. Add points up dynamically
    const newScore = runningScore + selectedOption.points;
    setRunningScore(newScore);

    // 3. Document selection timeline in the chat log
    const nextHistory = [
      ...chatHistory,
      { sender: 'user', text: selectedOption.text }
    ];

    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex < quizData.length) {
      setCurrentQuestionIndex(nextIndex);
      setChatHistory([
        ...nextHistory,
        { sender: 'bot', text: quizData[nextIndex].question }
      ]);
    } else {
      setIsCompleted(true);
      setChatHistory([
        ...nextHistory,
        { sender: 'bot', text: "🎉 Dynamic quiz finished! Click below to process your results." }
      ]);
    }
  };

  const handleSubmit = () => {
    console.log("--- CHATBOT RESULTS SUBMISSION ---");
    console.log("Final Running Score:", runningScore);
    console.log("Full Log Breakdown:", answers);
    alert("Check your browser console to view the compiled quiz payload!");
  };

  return (
    <div className="max-w-md mx-auto my-8 bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col h-150 overflow-hidden font-sans">
      
      {/* Dynamic Header Display */}
      <div className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md">
        <div>
          <h3 className="font-semibold text-lg tracking-wide">StackAssistant Bot</h3>
          <p className="text-xs text-blue-200">Active Session</p>
        </div>
        <div className="bg-white/20 px-3 py-1.5 rounded-full text-sm font-bold border border-white/10 backdrop-blur-sm">
          Score: {runningScore}
        </div>
      </div>

      {/* Chat Windows Timeline Log */}
      <div className="flex-1 p-4 overflow-y-auto bg-slate-50 flex flex-col gap-3">
        {chatHistory.map((message, index) => (
          <div
            key={index}
            className={`flex w-full ${message.sender === 'bot' ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                message.sender === 'bot'
                  ? 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                  : 'bg-blue-600 text-white rounded-tr-none'
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Options Input Footer */}
      <div className="border-t border-slate-100 p-4 bg-white">
        {!isCompleted ? (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">
              Choose an option:
            </span>
            {quizData[currentQuestionIndex].options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleOptionClick(option)}
                className="w-full text-left px-4 py-3 border border-blue-100 bg-blue-50/30 hover:bg-blue-50 text-blue-700 font-medium text-sm rounded-xl transition duration-200 ease-in-out flex justify-between items-center group active:scale-[0.99]"
              >
                <span>{option.text}</span>
                <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md text-xs font-bold border border-emerald-100 group-hover:bg-emerald-100 transition">
                  +{option.points} pts
                </span>
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={handleSubmit}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-600/20 transition duration-200 active:scale-[0.99]"
          >
            Submit Data & View Logs
          </button>
        )}
      </div>
    </div>
  );
}