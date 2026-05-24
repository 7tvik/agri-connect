// src/components/chat/ConversationList.jsx
import { useQuery } from '@tanstack/react-query';
import { getConversations } from '../../services/chatService';
import { formatRelativeTime, getInitials } from '../../utils/helpers';
import Spinner from '../common/Spinner';

const ConversationList = ({ selectedUserId, onSelect, isOnline }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn:  getConversations,
    refetchInterval: 10000, // poll every 10s for new conversations
  });

  const conversations = data?.data?.conversations || [];

  if (isLoading) {
    return (
      <div className="flex justify-center mt-8">
        <Spinner />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <span className="text-4xl mb-3">💬</span>
        <p className="text-sm font-medium text-gray-600">No conversations yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Message a farmer from any listing page
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {conversations.map((conv) => {
        const isSelected = selectedUserId === conv.other?._id;
        const online     = isOnline(conv.other?._id);

        return (
          <button
            key={conv.conversationId}
            onClick={() => onSelect(conv.other)}
            className={`flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0 ${
              isSelected ? 'bg-primary-50 border-l-2 border-l-primary-600' : ''
            }`}
          >
            {/* Avatar + online dot */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-sm font-semibold text-primary-700 overflow-hidden">
                {conv.other?.avatar
                  ? <img src={conv.other.avatar} alt="" className="w-full h-full object-cover" />
                  : getInitials(conv.other?.name)
                }
              </div>
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                online ? 'bg-green-500' : 'bg-gray-300'
              }`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className={`text-sm font-medium truncate ${
                  isSelected ? 'text-primary-700' : 'text-gray-900'
                }`}>
                  {conv.other?.name}
                </p>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                  {formatRelativeTime(conv.lastTime)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className={`text-xs truncate ${
                  conv.unreadCount > 0 ? 'text-gray-800 font-medium' : 'text-gray-400'
                }`}>
                  {conv.lastMessage}
                </p>
                {conv.unreadCount > 0 && (
                  <span className="ml-2 flex-shrink-0 w-5 h-5 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center font-medium">
                    {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5 capitalize">{conv.other?.role}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ConversationList;