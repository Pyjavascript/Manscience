import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';

const Chatbot = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`https://obzogpozgoolhededqkb.supabase.co/functions/v1/chat-handler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-162.5 w-full max-w-lg mx-auto bg-slate-50 border border-slate-200 rounded-3xl shadow-2xl overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white p-4 border-b flex items-center gap-3">
        <div className="bg-indigo-600 p-2 rounded-xl text-white">
          <Sparkles size={20} />
        </div>
        <div>
          <h2 className="font-bold text-slate-800">AI Assistant</h2>
          <p className="text-xs text-green-500 font-medium">● Online</p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'assistant' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-600'}`}>
                {msg.role === 'assistant' ? <Bot size={18} /> : <User size={18} />}
              </div>
              <div className={`px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed ${
                msg.role === 'assistant' 
                  ? 'bg-white border border-slate-100 text-slate-700 rounded-bl-none' 
                  : 'bg-indigo-600 text-white rounded-br-none'
              }`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start gap-3 ml-11">
            <Loader2 className="animate-spin text-indigo-500" size={20} />
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Box */}
      <div className="p-4 bg-white border-t">
        <div className="relative flex items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask me anything..."
            className="w-full pl-5 pr-14 py-3 bg-slate-100 rounded-full border border-transparent focus:bg-white focus:border-indigo-300 focus:outline-none transition-all"
          />
          <button 
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-slate-300 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;