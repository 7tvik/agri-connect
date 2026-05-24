// src/components/chat/MessageBubble.jsx
import { formatRelativeTime } from '../../utils/helpers';
import { Check, CheckCheck } from 'lucide-react';

const MessageBubble = ({ message, isOwn }) => {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
      {/* Avatar — only for received messages */}
      {!isOwn && (
        <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700 mr-2 flex-shrink-0 self-end overflow-hidden">
          {message.sender?.avatar
            ? <img src={message.sender.avatar} alt="" className="w-full h-full object-cover" />
            : message.sender?.name?.[0]?.toUpperCase()
          }
        </div>
      )}

      <div className={`max-w-xs md:max-w-md lg:max-w-lg`}>
        {/* Bubble */}
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isOwn
            ? 'bg-primary-600 text-white rounded-br-sm'
            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
        }`}>
          {message.content}
        </div>

        {/* Timestamp + read status */}
        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs text-gray-400">
            {formatRelativeTime(message.createdAt)}
          </span>
          {isOwn && (
            <span className="text-gray-400">
              {message.isRead
                ? <CheckCheck size={12} className="text-primary-500" />
                : <Check size={12} />
              }
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;