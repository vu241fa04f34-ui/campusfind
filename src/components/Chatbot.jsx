import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  RotateCcw,
  Minus,
  Bot
} from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { chatService } from '../services/chatService';

const INITIAL_WELCOME_MESSAGE = {
  id: 'welcome-msg',
  sender: 'assistant',
  text: `Hello! 👋 I'm your **CampusFind AI Assistant**.

I can help you:
- Search for lost belongings across all campus buildings
- View recently found items awaiting their owners
- Guide you through reporting a missing item
- Answer questions about our campus recovery process

How can I help you today?`,
  matchedItems: [],
  quickReplies: [
    'Search for my lost item',
    'Show recently found items',
    'How do I report an item?',
    'Campus safety tips'
  ],
  time: 'Just now'
};

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([INITIAL_WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, isMinimized]);

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setUnreadCount(0);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleClearChat = () => {
    setMessages([
      {
        ...INITIAL_WELCOME_MESSAGE,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await chatService.sendMessage(text, messages);

      const assistantMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: response.text,
        matchedItems: response.matchedItems || [],
        quickReplies: response.quickReplies || [],
        isBackend: response.isBackend,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (!isOpen) {
        setUnreadCount((c) => c + 1);
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: "I encountered an error looking up that query. Please try asking again or check our [Browse page](/) directly.",
        quickReplies: ['Show recently found items', 'How do I report an item?'],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <aside aria-label="CampusFind AI Assistant" className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50">
      {/* Trigger Floating Action Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="group relative flex items-center gap-2.5 px-4 py-3 sm:px-5 sm:py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-full shadow-lg shadow-emerald-700/30 hover:shadow-xl hover:shadow-emerald-700/40 hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-emerald-400/40"
          aria-label="Open AI Lost and Found Assistant"
        >
          <div className="relative">
            <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            <Sparkles className="w-3 h-3 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <span className="text-xs sm:text-sm font-bold tracking-tight pr-0.5">
            AI Assistant
          </span>

          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div
          className={`bg-white rounded-3xl border border-slate-200/90 shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
            isMinimized
              ? 'w-72 sm:w-80 h-14'
              : 'w-[92vw] sm:w-[410px] h-[560px] max-h-[82vh]'
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 text-white p-3.5 sm:p-4 flex items-center justify-between flex-shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center text-white border border-white/20 flex-shrink-0">
                <Bot className="w-5 h-5 text-emerald-200" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm sm:text-base tracking-tight truncate leading-tight">
                    CampusFind AI
                  </h3>
                  <span className="text-[10px] bg-emerald-500/40 text-emerald-100 border border-emerald-400/30 px-1.5 py-0.2 rounded-full font-medium">
                    Assistant
                  </span>
                </div>
                <p className="text-[11px] text-emerald-100/80 truncate">
                  Your helper for finding lost belongings
                </p>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-1 text-emerald-100">
              <button
                onClick={handleClearChat}
                title="Restart / Clear Conversation"
                className="p-1.5 hover:bg-white/10 rounded-lg transition"
                aria-label="Restart chat"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={handleMinimize}
                title={isMinimized ? 'Expand' : 'Minimize'}
                className="p-1.5 hover:bg-white/10 rounded-lg transition"
                aria-label="Minimize chat"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={handleClose}
                title="Close Assistant"
                className="p-1.5 hover:bg-white/10 rounded-lg transition"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body: Visible only when NOT minimized */}
          {!isMinimized && (
            <>
              {/* Message scroll area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70">
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    onQuickReply={(reply) => handleSendMessage(reply)}
                    onNavigate={() => {
                      // Optional auto-minimize on navigation
                      setIsMinimized(true);
                    }}
                  />
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs py-2 px-1">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    </div>
                    <span className="italic text-slate-500">Searching campus listings...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 sm:p-3.5 bg-white border-t border-slate-200/80">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about a lost item, location, or guide..."
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                    maxLength={300}
                    disabled={isLoading}
                  />

                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading}
                    className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 text-white shadow-sm transition flex-shrink-0"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>

                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 px-1">
                  <span>Powered by CampusFind Search</span>
                  <span>Enter to send</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
