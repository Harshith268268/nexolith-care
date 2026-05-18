import React, { useState, useRef, useEffect } from 'react';
import { useFamily, API_BASE } from '../lib/FamilyContext';
import { Send, BrainCircuit, Activity, Heart, Sparkles, User, HelpCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export function Assistant() {
  const { activeMember, members, auth } = useFamily();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: "Hello! I am your intelligent AI Health Assistant. Ask me anything about your family's stored medical reports, dynamic parameter trends, alerts, or general healthcare queries, and I'll analyze your records to guide you!",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Conversation history for backend context
  const [history, setHistory] = useState<{ role: 'user' | 'model'; content: string }[]>([]);

  // Scroll to bottom whenever messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || !auth.token) return;

    const userMsgId = `user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      // 1. Prepare history payload (matching Django model expectations)
      const currentHistory = [...history];

      // 2. Fetch conversational response from backend
      const res = await fetch(`${API_BASE}/api/analytics/assistant/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          message: textToSend,
          history: currentHistory
        })
      });

      if (!res.ok) {
        throw new Error("Failed to get response from AI assistant");
      }

      const data = await res.json();
      
      const botMsgId = `bot-${Date.now()}`;
      const botMessage: ChatMessage = {
        id: botMsgId,
        sender: 'bot',
        text: data.response || "I was unable to synthesize your records. Please try again.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);

      // 3. Append to history state
      setHistory(prev => [
        ...prev,
        { role: 'user', content: textToSend },
        { role: 'model', content: botMessage.text }
      ]);

    } catch (err: any) {
      toast.error(`Assistant failure: ${err.message}`);
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'bot',
          text: "I experienced a connection issue loading your family reports. Please check your network and try again.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputText);
  };

  // Helper to highlight bold markdown and critical tags safely in text
  const renderFormattedText = (rawText: string) => {
    // Regex matches double asterisks **text**
    const parts = rawText.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const cleanText = part.slice(2, -2);
        let colorClass = 'text-slate-900 font-bold';
        if (cleanText.toLowerCase().includes('critical')) {
          colorClass = 'text-critical-600 font-bold bg-critical-50 px-1 py-0.5 rounded';
        } else if (cleanText.toLowerCase().includes('borderline')) {
          colorClass = 'text-warning-600 font-bold bg-warning-50 px-1 py-0.5 rounded';
        }
        return <strong key={index} className={colorClass}>{cleanText}</strong>;
      }
      return part;
    });
  };

  // Smart Suggestion Pills
  const suggestions = [
    { label: "What is Sarah's glucose trend?", query: "Analyze Sarah's glucose levels and explain how it's changing over her past reports." },
    { label: "Which parameters are abnormal?", query: "Review all family reports and list out any parameters currently classified as borderline or critical." },
    { label: "Show my latest health risks", query: "What are the active warnings and potential health risks detected in our family profile?" },
    { label: "How to reduce glucose naturally?", query: "Explain standard clinical and natural ways to manage elevated glucose levels." }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)]">
      {/* Left Column: Family Summary Dashboard Info */}
      <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-6">
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-100">
            <Sparkles className="w-5 h-5 text-primary-600" />
            <h2 className="text-base font-bold text-slate-900">Health Context</h2>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Family Members</h3>
            <div className="space-y-3">
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm shrink-0">
                      {member.name[0]}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800">{member.name}</h4>
                      <p className="text-[10px] text-slate-500">{member.relation} • {member.age} yrs</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    member.overallRisk === 'Critical' ? 'bg-critical-50 text-critical-700' :
                    member.overallRisk === 'Borderline' ? 'bg-warning-50 text-warning-700' :
                    'bg-success-50 text-success-700'
                  }`}>
                    {member.overallRisk || 'Normal'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100">
          <div className="bg-gradient-to-br from-primary-50 to-white rounded-xl p-3.5 border border-primary-100">
            <div className="flex items-center space-x-2 mb-1.5">
              <BrainCircuit className="w-4 h-4 text-primary-600" />
              <h4 className="text-xs font-bold text-slate-900">Secure Shield</h4>
            </div>
            <p className="text-[10px] text-slate-600 leading-normal">
              Your conversations are confidential. AI analyses strictly pull from your verified household medical documents.
            </p>
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-full">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">AI Health Assistant</h1>
              <p className="text-xs text-slate-500">Live analytics-driven health guidance</p>
            </div>
          </div>
        </div>

        {/* Messages List Area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/20">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex items-start max-w-[85%] ${
                msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {/* Avatar indicator */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.sender === 'user' ? 'bg-primary-100 text-primary-600 ml-2.5' : 'bg-indigo-100 text-indigo-600 mr-2.5'
              }`}>
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <BrainCircuit className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className={`p-4 rounded-2xl shadow-sm border ${
                msg.sender === 'user' 
                  ? 'bg-primary-600 border-primary-500 text-white rounded-tr-none' 
                  : 'bg-white border-slate-200 text-slate-800 rounded-tl-none'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.sender === 'user' ? msg.text : renderFormattedText(msg.text)}
                </p>
                <span className={`block text-[9px] mt-1.5 opacity-60 text-right ${
                  msg.sender === 'user' ? 'text-white' : 'text-slate-500'
                }`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {/* Typing Loading State */}
          {loading && (
            <div className="flex items-start max-w-[85%] mr-auto animate-pulse">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mr-2.5">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Pills and Input Controls Area */}
        <div className="p-4 border-t border-slate-200 bg-white space-y-3 shrink-0">
          {/* suggestion row */}
          {messages.length === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(s.query)}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-primary-100 bg-slate-50 hover:bg-primary-50/20 text-left transition-all group"
                >
                  <span className="text-xs text-slate-700 group-hover:text-primary-700 font-medium truncate pr-2">
                    {s.label}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary-600 shrink-0 transform group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          )}

          {/* Form message sender inputs */}
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading}
              placeholder="Ask about test parameters, glucose trends, or specific medical events..."
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none text-sm transition-all placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors shadow-sm disabled:opacity-40 flex items-center justify-center shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
