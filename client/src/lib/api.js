const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : '/api');

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(
      import.meta.env.PROD
        ? 'Cannot reach the server. Please try again in a moment.'
        : 'Cannot reach the API. Start the backend with: cd server && npm start',
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}

export const api = {
  signup: (payload) => request('/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),

  quote: (payload) => request('/rides/quote', { method: 'POST', body: payload }),
  bookRide: (payload, token) => request('/rides', { method: 'POST', body: payload, token }),
  listRides: (token) => request('/rides', { token }),
  getRide: (id, token) => request(`/rides/${id}`, { token }),
  queue: (token) => request('/rides/queue', { token }),
  acceptRide: (id, token) => request(`/rides/${id}/accept`, { method: 'POST', token }),
  updateRideStatus: (id, status, token) =>
    request(`/rides/${id}/status`, { method: 'PATCH', body: { status }, token }),

  driverMe: (token) => request('/drivers/me', { token }),
  setDriverStatus: (status, token) =>
    request('/drivers/me/status', { method: 'PATCH', body: { status }, token }),
  setDriverLocation: (lat, lng, token) =>
    request('/drivers/me/location', { method: 'PATCH', body: { lat, lng }, token }),
  listDrivers: (token) => request('/drivers', { token }),

  createPaymentIntent: (rideId, splitIndex, token) =>
    request('/payments/create-intent', { method: 'POST', body: { rideId, splitIndex }, token }),
  simulateConfirmPayment: (paymentId, token) =>
    request(`/payments/${paymentId}/simulate-confirm`, { method: 'POST', token }),
  paymentsByRide: (rideId, token) => request(`/payments/by-ride/${rideId}`, { token }),

  adminOverview: (token) => request('/admin/overview', { token }),
  adminUsers: (token) => request('/admin/users', { token }),
};
