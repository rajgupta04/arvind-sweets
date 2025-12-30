import API from './api.js';

export const listMyAddresses = async () => {
  const response = await API.get('/addresses');
  return response.data;
};

export const upsertMyAddress = async ({
  label,
  name,
  phone,
  street,
  city,
  state,
  pincode,
  location,
  setDefault,
} = {}) => {
  const response = await API.post('/addresses', {
    label,
    name,
    phone,
    street,
    city,
    state,
    pincode,
    location,
    setDefault,
  });
  return response.data;
};

export const updateMyAddress = async (id, {
  label,
  name,
  phone,
  street,
  city,
  state,
  pincode,
  location,
  setDefault,
} = {}) => {
  const response = await API.put(`/addresses/${id}`, {
    label,
    name,
    phone,
    street,
    city,
    state,
    pincode,
    location,
    setDefault,
  });
  return response.data;
};

export const deleteMyAddress = async (id) => {
  const response = await API.delete(`/addresses/${id}`);
  return response.data;
};

export const setDefaultMyAddress = async (id) => {
  const response = await API.put(`/addresses/${id}/default`);
  return response.data;
};
