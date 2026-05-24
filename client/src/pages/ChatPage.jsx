// src/pages/ChatPage.jsx
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import useSocket from '../hooks/useSocket';
import useAuthStore from '../store/authStore';
import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';
import { getUnreadCount } from '../services/chatService';
import { MessageCircle } from 'lucide-react';

const ChatPage = () => {
  const { user }   = useAuthStore();
  const { socket, isUserOnline } = useSocket();

  // Support opening chat directly from listing/order page
  // e.g. /chat?userId=xxx&name=Farmer+Name
  const [searchParams]        = useSearchParams();
  const defaultUserId         = searchParams.get('userId');
  const defaultUserName       = searchParams.get('name');
  const defaultUserRole       = searchParams.get('role') || 'farmer';

  const [selectedUser, setSelectedUser] = useState(
    defaultUserId
      ? { _id: defaultUserId, name: defaultUserName, role: defaultUserRole }
      : null
  );

  const { data: unreadData } = useQuery({
    queryKey: ['unreadCount'],
    queryFn:  getUnreadCount,
    refetchInterval: 15000,
  });

  const unreadCount = unreadData?.data?.count || 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-base font-semibold text-gray-900">
            🌾 AgriConnect
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to={user?.role === 'farmer' ? '/farmer/dashboard' : '/buyer/dashboard'}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Chat layout */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-0 md:px-6 py-0 md:py-6">
        <div className="flex h-[calc(100vh-130px)] bg-white md:rounded-xl md:border md:border-gray-200 md:shadow-sm overflow-hidden">

          {/* Sidebar — conversation list */}
          <div className={`w-full md:w-80 border-r border-gray-200 flex flex-col flex-shrink-0 ${
            selectedUser ? 'hidden md:flex' : 'flex'
          }`}>
            {/* Sidebar header */}
            <div className="px-4 py-3.5 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <MessageCircle size={16} className="text-primary-600" />
                  Messages
                  {unreadCount > 0 && (
                    <span className="bg-primary-600 text-white text-xs rounded-full px-1.5 py-0.5 font-medium">
                      {unreadCount}
                    </span>
                  )}
                </h2>
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              <ConversationList
                selectedUserId={selectedUser?._id}
                onClick={() => onSelect({
                  _id:    conv.other?._id?.toString(), // always string
                  name:   conv.other?.name,
                  avatar: conv.other?.avatar,
                  role:   conv.other?.role,
                })}
                isOnline={isUserOnline}
              />
            </div>
          </div>

          {/* Chat window */}
          <div className={`flex-1 flex flex-col ${
            !selectedUser ? 'hidden md:flex' : 'flex'
          }`}>
            {selectedUser ? (
              <ChatWindow
                key={selectedUser._id}
                otherUserId={selectedUser._id}
                otherUser={selectedUser}
                socket={socket}
                isOnline={isUserOnline(selectedUser._id)}
                onBack={() => setSelectedUser(null)}
              />
            ) : (
              // Empty state when no conversation selected
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mb-4">
                  <MessageCircle size={28} className="text-primary-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">
                  Your messages
                </h3>
                <p className="text-sm text-gray-400 max-w-xs">
                  Select a conversation or start a new one from any listing page
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ChatPage;