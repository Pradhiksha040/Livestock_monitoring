/**
 * api.js — JWT-Secured Centralised API Client
 *
 * Architecture Overview
 * ─────────────────────
 *  1. All API calls route through `apiFetch()` — a thin wrapper around the
 *     native fetch() API that automatically injects the JWT Bearer token.
 *  2. On a 401 Unauthorized response, the client silently attempts ONE token
 *     refresh before surfacing an error to the UI — mimicking the behaviour of
 *     axios interceptors without adding a dependency.
 *  3. Tokens are stored in localStorage (suitable for a demo/academic project).
 *     In a high-security production app, HttpOnly cookies are preferred because
 *     JavaScript cannot read them, making them immune to XSS attacks.
 */

const BASE_URL = '/api'; // Vite proxy forwards this to http://127.0.0.1:8000/api

// ─── Token Storage Helpers ────────────────────────────────────────────────────
// Centralising these functions means we only need to change ONE place if we
// ever migrate from localStorage to sessionStorage or a more secure method.

/** Reads the short-lived access token from browser storage. */
export const getAccessToken  = () => localStorage.getItem('access_token');

/** Reads the long-lived refresh token from browser storage. */
export const getRefreshToken = () => localStorage.getItem('refresh_token');

/** Reads the user role from browser storage. */
export const getUserRole = () => localStorage.getItem('user_role') || 'FARMER';

/** Saves both tokens after a successful login or token refresh. */
export const storeTokens = ({ access, refresh, role }) => {
  localStorage.setItem('access_token',  access);
  // Only overwrite the refresh token if a new one was returned
  // (ROTATE_REFRESH_TOKENS=True in settings.py means a new one is always sent)
  if (refresh) localStorage.setItem('refresh_token', refresh);
  if (role) localStorage.setItem('user_role', role);
};

/** Removes all tokens — called on logout or when the refresh token expires. */
export const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_role');
};

/** Returns true if the user has a stored access token (i.e., is likely logged in). */
export const isLoggedIn = () => !!getAccessToken();


// ─── Authentication API calls ─────────────────────────────────────────────────

/**
 * Logs in a user by exchanging credentials for a JWT token pair and role.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{access: string, refresh: string, role: string}>}
 */
export async function login(username, password) {
  // POST to the public /api/token/ endpoint — NO Bearer token needed here.
  const res = await fetch(`${BASE_URL}/token/`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || 'Login failed.');
  }

  // Store tokens (and role) and return them
  storeTokens(data);
  return data;
}

/**
 * Registers a new user.
 * @param {string} username
 * @param {string} password
 * @param {string} role (FARMER, VET, ADMIN)
 */
export async function register(username, password, role) {
  const res = await fetch(`${BASE_URL}/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, role }),
  });

  const data = await res.json();
  
  if (!res.ok) {
    const errorMsg = data.username ? data.username[0] : (data.detail || 'Registration failed.');
    throw new Error(errorMsg);
  }
  
  return data;
}

/**
 * Uses the stored refresh token to silently obtain a new access token.
 * Called automatically by `apiFetch` when a 401 is received.
 * @returns {Promise<string>} The new access token, or throws if the refresh itself fails.
 */
async function silentRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available. User must log in again.');
  }

  const res = await fetch(`${BASE_URL}/token/refresh/`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refresh: refreshToken }),
  });

  if (!res.ok) {
    // The refresh token itself is expired or invalid → force logout
    clearTokens();
    throw new Error('Session expired. Please log in again.');
  }

  const tokens = await res.json(); // { access: "...", refresh?: "..." }
  storeTokens(tokens);
  return tokens.access;
}


// ─── Core Authenticated Fetch Wrapper ─────────────────────────────────────────

/**
 * A drop-in replacement for `fetch()` that automatically:
 *   1. Reads the current access token from localStorage.
 *   2. Injects `Authorization: Bearer <token>` into every request header.
 *   3. On a 401 response, attempts ONE silent token refresh and retries.
 *   4. If the retry also fails (refresh token expired), clears storage and throws.
 *
 * @param {string} url     - The request URL (relative or absolute)
 * @param {object} options - Standard fetch() options (method, body, headers, etc.)
 * @returns {Promise<Response>} The raw fetch Response object
 */
async function apiFetch(url, options = {}) {
  const accessToken = getAccessToken();

  // Merge caller-provided headers with our Authorization header.
  // The spread ensures we don't accidentally delete headers the caller set.
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  // ── First Attempt ──────────────────────────────────────────────────────────
  let response = await fetch(url, { ...options, headers });

  // ── Silent Refresh on 401 ──────────────────────────────────────────────────
  // HTTP 401 = "Unauthorized" → Our access token is likely expired.
  // We transparently fetch a new one and retry the original request.
  if (response.status === 401) {
    try {
      const newAccessToken = await silentRefresh();

      // Retry the original request with the fresh token
      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${newAccessToken}`,
      };
      response = await fetch(url, { ...options, headers: retryHeaders });
    } catch (refreshError) {
      // The refresh itself failed — the user must log in again.
      // Redirect to login page if your app has one, or just surface the error.
      console.error('Token refresh failed:', refreshError.message);
      throw refreshError;
    }
  }

  return response; // Return the raw Response; callers handle JSON parsing
}


// ─── Protected API Functions ──────────────────────────────────────────────────
// These are identical to the original api.js functions, but now routed through
// `apiFetch` instead of raw `fetch`. All JWT injection happens automatically.

/**
 * [PROTECTED] Fetches all registered livestock animals.
 * Requires: valid JWT Bearer token in localStorage.
 * @returns {Promise<Array>} Array of livestock objects
 */
export async function fetchLivestock() {
  const res = await apiFetch(`${BASE_URL}/livestock/`);
  if (!res.ok) throw new Error(`Failed to fetch livestock: ${res.status}`);
  return res.json();
}

/**
 * [PROTECTED] Fetches all treatment prescriptions, enriched with compliance status.
 * Requires: valid JWT Bearer token in localStorage.
 * @returns {Promise<Array>} Array of treatment objects with compliance_status field
 */
export async function fetchTreatments() {
  const res = await apiFetch(`${BASE_URL}/treatments/`);
  if (!res.ok) throw new Error(`Failed to fetch treatments: ${res.status}`);
  return res.json();
}

/**
 * [PROTECTED] Posts a new treatment prescription and retrieves the AI prediction.
 * Requires: valid JWT Bearer token in localStorage.
 * @param {Object} payload  { livestock, drug_name, dosage_mg_kg, route, health_status }
 * @returns {Promise<Object>}  { message, data: { predicted_clearance_days, safe_market_date, ... } }
 */
export async function createTreatment(payload) {
  const res = await apiFetch(`${BASE_URL}/treatments/`, {
    method: 'POST',
    body:   JSON.stringify(payload),
  });

  // Parse JSON regardless — even error responses come with a body
  const data = await res.json();
  if (!res.ok) {
    // Throw a descriptive error so the form can display it
    const message = data?.error || JSON.stringify(data);
    throw new Error(message);
  }
  return data;
}

/**
 * [PROTECTED] PATCHes a vet review decision onto an existing treatment prescription.
 * Uses partial update semantics — only the fields you include in `payload` are updated.
 *
 * @param {number} treatmentId  - PK of the TreatmentPrescription to update
 * @param {Object} payload      - Any subset of:
 *                                  { vet_clinical_notes, vet_decision_status, final_safe_market_date }
 * @returns {Promise<Object>}   - { message, data: { ...fullTreatmentRecord } }
 */
export async function submitVetReview(treatmentId, payload) {
  const res = await apiFetch(`${BASE_URL}/treatments/${treatmentId}/vet-review/`, {
    method: 'PATCH',
    body:   JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    // Surface structured validation errors (e.g. missing final date for 'Modified' decision)
    const message = data?.final_safe_market_date?.[0]
      || data?.vet_decision_status?.[0]
      || data?.non_field_errors?.[0]
      || JSON.stringify(data);
    throw new Error(message);
  }
  return data;
}
