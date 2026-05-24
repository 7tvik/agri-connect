// src/components/common/NotificationBell.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ShoppingBag, MessageCircle, X } from 'lucide-react';
import useNotificationStore from '../../store/notificationStore';
import useSocket from '../../hooks/useSocket';
import { formatRelativeTime } from '../../utils/helpers';


const NotificationBell = ({ socket: socketProp }) => {
  const navigate                = useNavigate();
  const [isOpen, setIsOpen]     = useState(false);
  const dropdownRef             = useRef(null);
  const { notifications, unreadCount, addNotification, markAllRead } =
    useNotificationStore();
  const { socket: hookSocket } = useSocket();
  const socket = socketProp || hookSocket;

  // ── Listen for socket notifications ──────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleNotification = (data) => {
      addNotification(data);
    };

    socket.on('new_notification', handleNotification);
    return () => socket.off('new_notification', handleNotification);
  }, [socket, addNotification]);

  // ── Close dropdown on outside click ──────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) markAllRead();
  };

  const handleNotificationClick = (notification) => {
    setIsOpen(false);
    if (notification.type === 'new_order' && notification.orderId) {
      navigate('/farmer/dashboard?tab=orders');
    } else if (notification.type === 'new_message' && notification.fromId) {
      navigate(`/chat?userId=${notification.fromId}`);
    }
  };

  const iconForType = (type) => {
    if (type === 'new_order')   return <ShoppingBag  size={14} className="text-primary-600" />;
    if (type === 'new_message') return <MessageCircle size={14} className="text-blue-500"   />;
    return <Bell size={14} className="text-gray-400" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} className="text-gray-500" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Notifications</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Bell size={24} className="text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0 ${
                    !n.isRead ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {iconForType(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatRelativeTime(n.time)}
                    </p>
                  </div>
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-primary-600 flex-shrink-0 mt-1.5" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;