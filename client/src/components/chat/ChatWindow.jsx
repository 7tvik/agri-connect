// src/components/chat/ChatWindow.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMessages } from '../../services/chatService';
import useAuthStore from '../../store/authStore';
import MessageBubble from './MessageBubble';
import Spinner from '../common/Spinner';
import { Send, ArrowLeft } from 'lucide-react';

const ChatWindow = ({ otherUserId, otherUser, socket, isOnline, onBack }) => {
  const { user }    = useAuthStore();
  const queryClient = useQueryClient();

  const [input,    setInput]    = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  const typingTimeoutRef = useRef(null);
  const messagesEndRef   = useRef(null);
  const myId             = user?._id?.toString();

  // ── Fetch existing messages on open ──────────────────────────────
  const { isLoading } = useQuery({
    queryKey: ['messages', otherUserId],
    queryFn:  () => getMessages(otherUserId),
    onSuccess: (data) => {
      // Normalize all IDs to strings on load
      const msgs = (data?.data?.messages || []).map(normalizeMessage);
      setMessages(msgs);
    },
    refetchOnWindowFocus: false,
  });

  // ── Normalize a message object — all IDs become strings ──────────
  // WHY? MongoDB ObjectIds vs plain strings cause === to fail
  const normalizeMessage = (msg) => ({
    ...msg,
    _id:      msg._id?.toString(),
    sender:   { ...msg.sender,   _id: msg.sender?._id?.toString()   },
    receiver: { ...msg.receiver, _id: msg.receiver?._id?.toString() },
  });

  // ── Auto scroll on new messages ───────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Socket event handlers ─────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // ── receive_message: a new message arrived for ME ─────────────
    const handleReceive = (message) => {
      const msg = normalizeMessage(message);

      // Only add if it's from the person we're chatting with
      const isFromThisConversation =
        msg.sender?._id === otherUserId.toString();

      if (!isFromThisConversation) return;

      setMessages((prev) => {
        // Strict dedup by _id
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });

      // Mark as read since window is open
      socket.emit('mark_read', { senderId: otherUserId });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
    };

    // ── message_sent: MY message was saved and confirmed ──────────
    const handleSent = (message) => {
      const msg = normalizeMessage(message);
      setMessages((prev) => {
        // Dedup — might already be in state from optimistic update
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };

    // ── Typing indicators ─────────────────────────────────────────
    const handleTyping = ({ userId }) => {
      if (userId?.toString() === otherUserId?.toString()) {
        setIsTyping(true);
      }
    };

    const handleStopTyping = ({ userId }) => {
      if (userId?.toString() === otherUserId?.toString()) {
        setIsTyping(false);
      }
    };

    // ── Read receipts ─────────────────────────────────────────────
    const handleRead = ({ by }) => {
      if (by?.toString() === otherUserId?.toString()) {
        setMessages((prev) =>
          prev.map((m) =>
            m.sender?._id === myId ? { ...m, isRead: true } : m
          )
        );
      }
    };

    socket.on('receive_message', handleReceive);
    socket.on('message_sent',    handleSent);
    socket.on('user_typing',     handleTyping);
    socket.on('user_stop_typing',handleStopTyping);
    socket.on('messages_read',   handleRead);

    // Mark messages as read when this window opens
    socket.emit('mark_read', { senderId: otherUserId });

    return () => {
      socket.off('receive_message', handleReceive);
      socket.off('message_sent',    handleSent);
      socket.off('user_typing',     handleTyping);
      socket.off('user_stop_typing',handleStopTyping);
      socket.off('messages_read',   handleRead);
    };
  }, [socket, otherUserId, myId, queryClient]);

  // ── Send message ──────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    if (!input.trim() || !socket) return;

    const content = input.trim();

    // Optimistic update — show message immediately without waiting
    // for server confirmation. If server fails, message_error removes it.
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg = {
      _id:       tempId,
      sender:    { _id: myId, name: user?.name, avatar: user?.avatar },
      receiver:  { _id: otherUserId.toString() },
      content,
      isRead:    false,
      createdAt: new Date().toISOString(),
      isTemp:    true, // flag so we can replace with real message
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInput('');

    // Emit to server
    socket.emit('send_message', {
      receiverId: otherUserId,
      content,
    });

    // Stop typing indicator
    socket.emit('typing_stop', { receiverId: otherUserId });
    clearTimeout(typingTimeoutRef.current);

  }, [input, socket, myId, otherUserId, user]);

  // ── Replace optimistic message with real confirmed one ────────────
  // We do this in the message_sent handler above with dedup logic.
  // Additionally clean up any leftover temp messages after 5 seconds:
  useEffect(() => {
    const timer = setTimeout(() => {
      setMessages((prev) => prev.filter((m) => !m.isTemp));
    }, 5000);
    return () => clearTimeout(timer);
  }, [messages]);

  // ── Typing indicator emit ─────────────────────────────────────────
  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!socket) return;

    socket.emit('typing_start', { receiverId: otherUserId });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { receiverId: otherUserId });
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-gray-600 md:hidden"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-sm font-semibold text-primary-700 overflow-hidden">
            {otherUser?.avatar
              ? <img src={otherUser.avatar} alt="" className="w-full h-full object-cover" />
              : otherUser?.name?.[0]?.toUpperCase()
            }
          </div>
          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
            isOnline ? 'bg-green-500' : 'bg-gray-300'
          }`} />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{otherUser?.name}</p>
          <p className="text-xs text-gray-400">
            {isOnline
              ? <span className="text-green-600 font-medium">Online</span>
              : <span>Offline</span>
            }
            {' · '}
            <span className="capitalize">{otherUser?.role}</span>
          </p>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
        {isLoading ? (
          <div className="flex justify-center mt-8"><Spinner /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="text-4xl mb-3">💬</span>
            <p className="text-sm font-medium text-gray-600">No messages yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Send a message to {otherUser?.name}
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              // This is now 100% reliable — both are plain strings
              const isOwn = message.sender?._id?.toString() === myId;
              return (
                <MessageBubble
                  key={message._id}
                  message={message}
                  isOwn={isOwn}
                />
              );
            })}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700">
                  {otherUser?.name?.[0]?.toUpperCase()}
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2.5 flex gap-1 items-center">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* ── Input ── */}
      <div className="px-4 py-3 bg-white border-t border-gray-200 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${otherUser?.name || ''}...`}
            className="flex-1 input resize-none py-2.5 text-sm"
            style={{ minHeight: '42px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send size={15} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">Enter to send · Shift+Enter for new line</p>
      </div>

    </div>
  );
};

export default ChatWindow;