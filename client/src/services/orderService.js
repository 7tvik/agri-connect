// src/services/orderService.js
import api from './api';

export const createOrder = async (data) => {
  const res = await api.post('/orders', data);
  return res.data;
};

export const getMyOrders = async (params = {}) => {
  const res = await api.get('/orders', { params });
  return res.data;
};

export const getOrderById = async (id) => {
  const res = await api.get(`/orders/${id}`);
  return res.data;
};

export const updateOrderStatus = async ({ id, status, note }) => {
  const res = await api.patch(`/orders/${id}/status`, { status, note });
  return res.data;
};

export const cancelOrder = async (id) => {
  const res = await api.patch(`/orders/${id}/cancel`);
  return res.data;
};

export const getIncomingOrders = async (params = {}) => {
  const res = await api.get('/orders/farmer/incoming', { params });
  return res.data;
};