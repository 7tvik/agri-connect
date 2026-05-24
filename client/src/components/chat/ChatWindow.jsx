// src/components/chat/ChatWindow.jsx
import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMessages } from '../../services/chatService';
import useAuthStore from '../../store/authStore';
import MessageBubble from './MessageBubble';
import Spinner from '../common/Spinner';
import { Send, ArrowLeft } from 'lucide-react';

const ChatWindow = ({ otherUserId, otherUser, socket, isOnline, onBack }) => {
  const { user }        = useAuthStore();
  const queryClient     = useQueryClient();
  const [input, setInput]         = useState('');
  const [messages, setMessages]   = useState([]);
  const [isTyping, setIsTyping]   = useState(false);
  const typingTimeoutRef          = useRef(null);
  const messagesEndRef             = useRef(null);

  // ── Fetch existing messages ───────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['messages', otherUserId],
    queryFn:  () => getMessages(otherUserId),
    onSuccess: (data) => {
      setMessages(data?.data?.messages || []);
    },
  });

  useEffect(() => {
    if (data?.data?.messages) {
      setMessages(data.data.messages);
    }
  }, [data]);

  // ── Auto scroll to bottom on new messages ────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Socket listeners ──────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // New message received
    const handleReceive = (message) => {
      const isFromThisConv =
        message.sender?._id === otherUserId ||
        message.sender === otherUserId;

      if (isFromThisConv) {
        setMessages((prev) => [...prev, message]);
        // Mark as read since window is open
        socket.emit('mark_read', { senderId: otherUserId });
        // Refresh unread count in sidebar
        queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
      }
    };

    // Message sent confirmation (add to local state)
    const handleSent = (message) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.find((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });
    };

    // Typing indicator
    const handleTyping = ({ userId }) => {
      if (userId === otherUserId) setIsTyping(true);
    };
    const handleStopTyping = ({ userId }) => {
      if (userId === otherUserId) setIsTyping(false);
    };

    socket.on('receive_message', handleReceive);
    socket.on('message_sent',    handleSent);
    socket.on('user_typing',     handleTyping);
    socket.on('user_stop_typing',handleStopTyping);

    // Mark messages as read when window opens
    socket.emit('mark_read', { senderId: otherUserId });

    return () => {
      socket.off('receive_message', handleReceive);
      socket.off('message_sent',    handleSent);
      socket.off('user_typing',     handleTyping);
      socket.off('user_stop_typing',handleStopTyping);
    };
  }, [socket, otherUserId, queryClient]);

  // ── Send message ──────────────────────────────────────────────────
  const handleSend = () => {
    if (!input.trim() || !socket) return;

    socket.emit('send_message', {
      receiverId: otherUserId,
      content:    input.trim(),
    });

    // Stop typing indicator
    socket.emit('typing_stop', { receiverId: otherUserId });
    setInput('');
  };

  // ── Typing indicator emit ─────────────────────────────────────────
  const handleInputChange = (e) => {
    setInput(e.target.value);

    if (!socket) return;

    socket.emit('typing_start', { receiverId: otherUserId });

    // Clear previous timeout and set new one
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { receiverId: otherUserId });
    }, 1500); // stop typing after 1.5s of no keypress
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        {onBack && (
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-gray-600 md:hidden"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        {/* Avatar */}
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-sm font-semibold text-primary-700 overflow-hidden">
            {otherUser?.avatar
              ? <img src={otherUser.avatar} alt="" className="w-full h-full object-cover" />
              : otherUser?.name?.[0]?.toUpperCase()
            }
          </div>
          {/* Online dot */}
          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
            isOnline ? 'bg-green-500' : 'bg-gray-300'
          }`} />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{otherUser?.name}</p>
          <p className="text-xs text-gray-400">
            {isOnline ? (
              <span className="text-green-600 font-medium">Online</span>
            ) : (
              <span>Offline</span>
            )}
            {' · '}
            <span className="capitalize">{otherUser?.role}</span>
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
        {isLoading ? (
          <div className="flex justify-center mt-8"><Spinner /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="text-4xl mb-3">💬</span>
            <p className="text-sm font-medium text-gray-600">Start a conversation</p>
            <p className="text-xs text-gray-400 mt-1">
              Send a message to {otherUser?.name}
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message._id}
                message={message}
                isOwn={
                  message.sender?._id === user?._id ||
                  message.sender === user?._id
                }
              />
            ))}
            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700">
                  {otherUser?.name?.[0]?.toUpperCase()}
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2.5 flex gap-1">
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

      {/* Input area */}
      <div className="px-4 py-3 bg-white border-t border-gray-200">
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${otherUser?.name}...`}
            className="flex-1 input resize-none py-2.5 max-h-32 overflow-y-auto text-sm"
            style={{ minHeight: '42px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send size={15} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default ChatWindow;