import api from './api';

export async function loginRequest(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  return data; // { success, data: { token, usuario }, message }
}

export async function logoutRequest() {
  const { data } = await api.post('/auth/logout');
  return data;
}
