import API from './api';

export const getPublicSettings = async () => {
  const response = await API.get('/settings/public');
  return response.data;
};
