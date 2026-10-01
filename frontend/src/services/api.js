/**
 * API Service — centralized HTTP client for backend communication.
 */

const API_BASE = '/api';

async function request(url, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Accept': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed (${response.status})`);
    }

    // Handle file downloads
    if (options.responseType === 'blob') {
      return response.blob();
    }

    return response.json();
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Cannot connect to the server. Please ensure the backend is running.');
    }
    throw error;
  }
}

// ── Dashboard ──────────────────────────────────────────────────────────

export function getDashboard() {
  return request('/dashboard');
}

// ── Transcription ──────────────────────────────────────────────────────

export function uploadAndTranscribe(file, options = {}) {
  const formData = new FormData();
  formData.append('file', file);
  if (options.title) formData.append('title', options.title);
  if (options.language) formData.append('language', options.language);
  if (options.model_size) formData.append('model_size', options.model_size);
  if (options.word_timestamps) formData.append('word_timestamps', 'true');

  return request('/transcribe', {
    method: 'POST',
    body: formData,
    // Don't set Content-Type — browser sets it with boundary for FormData
    headers: {},
  });
}

export function getTranscriptionStatus(id) {
  return request(`/transcription/${id}/status`);
}

export function getTranscription(id) {
  return request(`/transcription/${id}`);
}

export function regenerateSummary(id) {
  return request(`/transcription/${id}/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── History ────────────────────────────────────────────────────────────

export function getHistory(limit = 50, offset = 0) {
  return request(`/history?limit=${limit}&offset=${offset}`);
}

export function searchHistory(query) {
  return request(`/history/search?q=${encodeURIComponent(query)}`);
}

export function deleteTranscription(id) {
  return request(`/history/${id}`, { method: 'DELETE' });
}

// ── Export ──────────────────────────────────────────────────────────────

export function exportTranscription(id, format) {
  return request(`/export/${id}/${format}`, { responseType: 'blob' });
}

export function getExportUrl(id, format) {
  return `${API_BASE}/export/${id}/${format}`;
}

// ── Settings / Model ───────────────────────────────────────────────────

export function getSettings() {
  return request('/settings');
}

export function getModelInfo() {
  return request('/model/info');
}

export function preloadModel(modelSize) {
  return request('/model/preload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model_size: modelSize }),
  });
}

// ── Health ──────────────────────────────────────────────────────────────

export function healthCheck() {
  return request('/health');
}
