// src/hooks/useSocket.js
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../store/authStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const useSocket = () => {
  const { isAuthenticated } = useAuthStore();
  const socketRef           = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    // Only connect if user is authenticated
    if (!isAuthenticated) return;

    // Create socket connection
    // withCredentials: true sends the JWT cookie automatically
    socketRef.current = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket'], // skip long-polling fallback
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('online_users', (users) => {
      setOnlineUsers(users);
    });

    socket.on('user_online', ({ userId }) => {
      setOnlineUsers((prev) =>
        prev.includes(userId) ? prev : [...prev, userId]
      );
    });

    socket.on('user_offline', ({ userId }) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Cleanup on unmount or logout
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated]);

  const isUserOnline = (userId) => onlineUsers.includes(userId?.toString());

  return { socket: socketRef.current, onlineUsers, isUserOnline };
};

export default useSocket;