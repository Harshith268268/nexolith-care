import React, { useState, useRef, useEffect } from 'react';
import { useFamily, API_BASE } from '../lib/FamilyContext';
import { Send, HeartPulse, Sparkles, User, ArrowRight, ShieldCheck } from 'lucide-react';
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
      text: "Hello! I am your Nexolith Health Assistant. Ask me about your family's medical reports, health trends, or general health questions.",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [history, setHistory] = useState<{ role: 'user' | 'model'; content: string }[]>([]);

  useEffect(() => {
    setHistory([]);
  }, [activeMember?.id, auth.token]);

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
      const currentHistory = [...history];

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

      setHistory(prev => [
        ...prev,
        { role: 'user', content: textToSend },
        { role: 'model', content: botMessage.text }
      ]);

    } catch (err: any) {
      toast.error(`Assistant issue: ${err.message}`);
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

  const renderFormattedText = (rawText: string) => {
    const parts = rawText.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const cleanText = part.slice(2, -2);
        let colorClass = 'text-[#18313A] font-bold';
        if (cleanText.toLowerCase().includes('critical')) {
          colorClass = 'text-[#C25252] font-bold bg-[#FDF2F2] px-1.5 py-0.5 rounded-md';
        } else if (cleanText.toLowerCase().includes('borderline')) {
          colorClass = 'text-[#D4A050] font-bold bg-[#FDF8ED] px-1.5 py-0.5 rounded-md';
        }
        return <strong key={index} className={colorClass}>{cleanText}</strong>;
      }
      return part;
    });
  };

  const suggestions = [
    { label: "What can I ask?", query: "What questions can you answer about my lab reports and family health trends?" },
    { label: "Which parameters are abnormal?", query: "Review all family reports and list out any parameters currently classified as borderline or critical." },
    { label: "Show my latest health risks", query: "What are the active warnings and potential health risks detected in our family profile?" },
    { label: "How to reduce glucose naturally?", query: "Explain standard clinical and lifestyle ways to manage glucose levels." }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)] animate-fade-in-up pb-6">
      {/* Left Column: Context Card */}
      <div className="lg:col-span-1 bg-white rounded-3xl border border-[#E3EEEE] shadow-2xs p-5 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-6">
          <div className="flex items-center space-x-2.5 pb-4 border-b border-[#E3EEEE]">
            <div className="p-2 rounded-xl bg-[#DDF2F1] text-[#3AAFA9]">
              <Sparkles className="w-4 h-4 text-[#55BFC2]" />
            </div>
            <h2 className="text-sm font-bold text-[#18313A]">✦ Health Assistant</h2>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-[#64777C] uppercase tracking-wider mb-3">Family Profiles</h3>
            <div className="space-y-2.5">
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-[#F5F8F8] border border-[#E3EEEE]">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#DDF2F1] text-[#2A8F93] flex items-center justify-center font-bold text-xs shrink-0">
                      {member.name[0]}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#18313A]">{member.name}</h4>
                      <p className="text-[10px] text-[#64777C]">{member.relation} • {member.age} yrs</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    member.overallRisk === 'Critical' ? 'bg-[#FDF2F2] text-[#C25252] border-[#FCE4E4]' :
                    member.overallRisk === 'Borderline' ? 'bg-[#FDF8ED] text-[#D4A050] border-[#FBF0D8]' :
                    'bg-[#EBF8F4] text-[#48A383] border-[#D6F2E9]'
                  }`}>
                    {member.overallRisk || 'Normal'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-5 border-t border-[#E3EEEE]">
          <div className="bg-[#EAF6F5] rounded-2xl p-3.5 border border-[#B8DEDE]/60">
            <div className="flex items-center space-x-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-[#3AAFA9]" />
              <h4 className="text-xs font-bold text-[#18313A]">Private & Secure</h4>
            </div>
            <p className="text-[11px] text-[#64777C] leading-normal">
              Your conversations strictly reference your private medical records.
            </p>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="lg:col-span-3 bg-white rounded-3xl border border-[#E3EEEE] shadow-2xs flex flex-col overflow-hidden h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E3EEEE] bg-[#F5F8F8]/50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#DDF2F1] text-[#3AAFA9] flex items-center justify-center">
              <HeartPulse className="w-5 h-5 text-[#55BFC2]" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#18313A]">Nexolith Health Assistant</h1>
              <p className="text-xs text-[#64777C]">Ask about your lab reports, trends, or health questions</p>
            </div>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#F5F8F8]/30">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex items-start max-w-[85%] ${
                msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.sender === 'user' ? 'bg-[#DDF2F1] text-[#2A8F93] ml-2.5' : 'bg-[#DDF2F1] text-[#3AAFA9] mr-2.5'
              }`}>
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-[#55BFC2]" />}
              </div>

              <div className={`p-4 rounded-3xl shadow-2xs border ${
                msg.sender === 'user' 
                  ? 'bg-[#55BFC2] border-[#55BFC2] text-white rounded-tr-none' 
                  : 'bg-white border-[#E3EEEE] text-[#18313A] rounded-tl-none'
              }`}>
                <p className="text-xs leading-relaxed whitespace-pre-wrap">
                  {msg.sender === 'user' ? msg.text : renderFormattedText(msg.text)}
                </p>
                <span className={`block text-[9px] mt-1.5 opacity-70 text-right ${
                  msg.sender === 'user' ? 'text-white' : 'text-[#64777C]'
                }`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start max-w-[85%] mr-auto">
              <div className="w-8 h-8 rounded-full bg-[#DDF2F1] text-[#3AAFA9] flex items-center justify-center shrink-0 mr-2.5">
                <Sparkles className="w-4 h-4 text-[#55BFC2]" />
              </div>
              <div className="bg-white border border-[#E3EEEE] p-4 rounded-3xl rounded-tl-none shadow-2xs flex items-center space-x-1.5">
                <div className="w-2 h-2 rounded-full bg-[#55BFC2] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-[#55BFC2] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-[#55BFC2] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-[#E3EEEE] bg-white space-y-3 shrink-0">
          {messages.length === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(s.query)}
                  className="flex items-center justify-between p-3 rounded-2xl border border-[#E3EEEE] hover:border-[#55BFC2] bg-[#F5F8F8] hover:bg-[#DDF2F1]/40 text-left transition-all group"
                >
                  <span className="text-xs text-[#18313A] font-semibold truncate pr-2">
                    {s.label}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#64777C] group-hover:text-[#3AAFA9] shrink-0" />
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <input
              type="text"
              data-testid="assistant-chat-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading}
              placeholder="Ask about your lab report values, health trends, or general medical queries..."
              className="flex-1 px-4 py-3 bg-[#F5F8F8] border border-[#E3EEEE] rounded-2xl focus:bg-white focus:border-[#55BFC2] outline-none text-xs text-[#18313A] placeholder-[#64777C]/60 transition-all"
            />
            <button
              type="submit"
              data-testid="assistant-chat-submit"
              disabled={loading || !inputText.trim()}
              className="px-5 py-3 bg-[#55BFC2] hover:bg-[#3AAFA9] text-white rounded-2xl font-bold transition-colors shadow-2xs disabled:opacity-40 flex items-center justify-center shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
