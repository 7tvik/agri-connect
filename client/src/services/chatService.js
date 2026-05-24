// src/services/chatService.js
import api from './api';

export const getConversations = async () => {
  const res = await api.get('/chat/conversations');
  return res.data;
};

export const getMessages = async (userId) => {
  const res = await api.get(`/chat/${userId}`);
  return res.data;
};

export const sendMessageREST = async ({ receiverId, content }) => {
  const res = await api.post('/chat/send', { receiverId, content });
  return res.data;
};

export const getUnreadCount = async () => {
  const res = await api.get('/chat/unread-count');
  return res.data;
};