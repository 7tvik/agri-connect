// src/services/listingService.js
import api from './api';

// WHY FormData? When sending files (images), we can't use JSON.
// FormData lets us mix text fields and binary file data in one request.
// The browser sets Content-Type to multipart/form-data automatically.
export const createListing = async (data) => {
  const formData = new FormData();

  // Append text fields
  formData.append('title',                  data.title);
  formData.append('description',            data.description);
  formData.append('category',               data.category);
  formData.append('pricePerUnit',           data.pricePerUnit);
  formData.append('unit',                   data.unit);
  formData.append('quantityAvailable',      data.quantityAvailable);
  formData.append('estimatedAvailableDate', data.estimatedAvailableDate);
  formData.append('tags',    JSON.stringify(data.tags || []));
  formData.append('location', JSON.stringify(data.location || {}));

  // Append image files (multiple)
  if (data.images) {
    Array.from(data.images).forEach((file) => {
      formData.append('images', file);
    });
  }

  const res = await api.post('/listings', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const getListings = async (params = {}) => {
  const res = await api.get('/listings', { params });
  return res.data;
};

export const getListingById = async (id) => {
  const res = await api.get(`/listings/${id}`);
  return res.data;
};

export const getMyListings = async () => {
  const res = await api.get('/listings/farmer/my-listings');
  return res.data;
};

export const updateListing = async ({ id, data }) => {
  const formData = new FormData();
  Object.keys(data).forEach((key) => {
    if (key === 'images' && data[key]) {
      Array.from(data[key]).forEach((f) => formData.append('images', f));
    } else {
      formData.append(key, typeof data[key] === 'object'
        ? JSON.stringify(data[key])
        : data[key]
      );
    }
  });
  const res = await api.put(`/listings/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const deleteListing = async (id) => {
  const res = await api.delete(`/listings/${id}`);
  return res.data;
};