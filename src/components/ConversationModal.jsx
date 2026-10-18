import React, { useState, useEffect, useRef } from 'react';
import { X, Send, ShieldCheck, Clock, User, AlertCircle } from 'lucide-react';
import { conversationService } from '../services/conversationService';

export function ConversationModal({
  isOpen,
  onClose,
  conversationId,
  otherUserDisplayName,
  itemTitle,
  currentUser
}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isOpen || !conversationId) return;

    let isMounted = true;
    async function loadMessages() {
      setLoading(true);
      try {
        const msgs = await conversationService.getMessages(conversationId);
        if (isMounted) {
          setMessages(msgs);
        }
      } catch (err) {
        console.error('Failed to load conversation messages:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadMessages();

    // Poll periodically for new messages
    const interval = setInterval(async () => {
      try {
        const updated = await conversationService.getMessages(conversationId);
        if (isMounted && updated.length !== messages.length) {
          setMessages(updated);
        }
      } catch {
        // Ignore background polling errors
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, conversationId, messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !currentUser) return;

    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const sent = await conversationService.sendMessage({
        conversationId,
        senderUid: currentUser.uid,
        senderDisplayName: currentUser.displayName || 'Campus Student',
        text
      });

      if (sent) {
        setMessages((prev) => [...prev, sent]);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full h-[620px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-800 text-white flex items-center justify-between border-b border-emerald-700/60">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Chat with {otherUserDisplayName || 'Student'}
              </h3>
            </div>
            <p className="text-xs text-emerald-200 mt-0.5 truncate max-w-[280px] sm:max-w-md">
              Regarding: <span className="text-white font-medium">{itemTitle}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-emerald-200 hover:text-white hover:bg-emerald-700/70 transition"
            aria-label="Close conversation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Daylight Safety Notice */}
        <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-2.5 flex items-start gap-2.5 text-xs text-amber-900">
          <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="leading-snug">
            <strong>Campus Safety:</strong> Arrange handovers during daylight hours at public university hubs like the <strong>Library Helpdesk</strong> or <strong>A-Block Info Desk</strong>. Never share OTPs or passwords.
          </p>
        </div>

        {/* Message History */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium text-slate-600">No messages yet</p>
              <p className="text-[11px] text-slate-400 max-w-xs">
                Coordinate a safe place and time on Vignan campus to verify ownership and hand over this item.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = currentUser && msg.senderUid === currentUser.uid;
              const formattedTime = msg.createdAt
                ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div
                  key={msg.id || `${msg.senderUid}-${msg.createdAt}`}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                    {!isMine && <User className="w-3 h-3 text-slate-400" />}
                    <span>{isMine ? 'You' : msg.senderDisplayName || 'Student'}</span>
                    {formattedTime && (
                      <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                        • <Clock className="w-2.5 h-2.5" /> {formattedTime}
                      </span>
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                      isMine
                        ? 'bg-emerald-600 text-white rounded-tr-xs'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a safe handover message..."
            maxLength={1000}
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-40 flex items-center gap-1.5 shadow-sm"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default ConversationModal;
