// src/hooks/useSocket.js
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../store/authStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let globalSocket = null; // singleton — one socket per session

const useSocket = () => {
  const { isAuthenticated } = useAuthStore();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [connected,   setConnected]   = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      // Disconnect on logout
      if (globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
        setConnected(false);
      }
      return;
    }

    // Already connected — don't create a second socket
    if (globalSocket?.connected) return;

    globalSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket'],
      reconnection:        true,
      reconnectionAttempts: 5,
      reconnectionDelay:   1000,
    });

    globalSocket.on('connect', () => {
      console.log('✅ Socket connected:', globalSocket.id);
      setConnected(true);
    });

    globalSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setConnected(false);
    });

    globalSocket.on('online_users', (users) => {
      setOnlineUsers(users.map(String));
    });

    globalSocket.on('user_online', ({ userId }) => {
      setOnlineUsers((prev) =>
        prev.includes(userId.toString()) ? prev : [...prev, userId.toString()]
      );
    });

    globalSocket.on('user_offline', ({ userId }) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId.toString()));
    });

    return () => {
      // Don't disconnect on component unmount — keep alive for notifications
      // Only disconnect on logout (handled above)
    };
  }, [isAuthenticated]);

  const isUserOnline = (userId) =>
    !!userId && onlineUsers.includes(userId.toString());

  return {
    socket:       globalSocket,
    onlineUsers,
    isUserOnline,
    connected,
  };
};

export default useSocket;