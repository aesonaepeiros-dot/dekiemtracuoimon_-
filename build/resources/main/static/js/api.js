/**
 * DataLens Studio – API Module
 * All REST calls to the same-origin Spring Boot API.
 */

const API_BASE = '/api';

export const getUploadConfig = () => fetch(`${API_BASE}/config`).then(handleResponse);

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const key = localStorage.getItem('datalens_gemini_key');
  if (key && key.trim()) {
    headers['X-Gemini-Api-Key'] = key.trim();
  }
  return headers;
}

function getUploadHeaders() {
  const headers = {};
  const key = localStorage.getItem('datalens_gemini_key');
  if (key && key.trim()) {
    headers['X-Gemini-Api-Key'] = key.trim();
  }
  return headers;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function handleResponse(res) {
  if (!res.ok) {
    return res.json().catch(() => ({})).then(err => {
      throw new Error(err.message || err.error || `HTTP ${res.status}`);
    });
  }
  return res.json();
}

function handleBlobResponse(res) {
  if (!res.ok) {
    return res.json().catch(() => ({})).then(err => {
      throw new Error(err.message || `HTTP ${res.status}`);
    });
  }
  return res.blob().then(blob => ({ blob, res }));
}

// ── Dataset ──────────────────────────────────────────────────────────────

/**
 * Upload a dataset file with optional context metadata.
 * @param {FormData} formData
 * @returns {Promise<UploadResponseDto>}
 */
export const uploadDataset = (formData) =>
  fetch(`${API_BASE}/dataset/upload`, {
    method: 'POST',
    headers: getUploadHeaders(),
    body: formData
  })
    .then(handleResponse);

/**
 * List all uploaded datasets.
 * @returns {Promise<DatasetSummary[]>}
 */
export const getDatasetList = () =>
  fetch(`${API_BASE}/dataset/list`)
    .then(handleResponse);

/**
 * Get a single dataset with preview rows.
 * @param {number|string} id
 * @returns {Promise<DatasetDetail>}
 */
export const getDataset = (id) =>
  fetch(`${API_BASE}/dataset/${id}`)
    .then(handleResponse);

export const getDatasetPage = (id, query) => {
  const params = new URLSearchParams({
    page: String(query.page), size: String(query.size), search: query.search || '',
    sort: query.sort || '', direction: query.direction || 'asc', filterMode: query.filterMode || 'all'
  });
  for (const [column, value] of Object.entries(query.filters || {})) {
    if (value) params.set(`filter.${column}`, value);
  }
  return fetch(`${API_BASE}/dataset/${id}/page?${params}`).then(handleResponse);
};

export const updateDatasetCell = (id, rowNumber, columnName, value) =>
  fetch(`${API_BASE}/dataset/${id}/cell`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rowNumber, columnName, value })
  }).then(handleResponse);

/**
 * Delete a dataset.
 * @param {number|string} id
 * @returns {Promise<void>}
 */
export const deleteDataset = (id) =>
  fetch(`${API_BASE}/dataset/${id}`, { method: 'DELETE' })
    .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); });

// ── Cleaning ─────────────────────────────────────────────────────────────

/**
 * Run cleaning rules on a dataset.
 * @param {number|string} datasetId
 * @param {CleanRequestDto} rules
 * @returns {Promise<CleanResponseDto>}
 */
export const cleanDataset = (datasetId, rules) =>
  fetch(`${API_BASE}/clean/${datasetId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rules),
  }).then(handleResponse);

/**
 * Get audit log of cleaning changes.
 * @param {number|string} datasetId
 * @returns {Promise<AuditLog[]>}
 */
export const getCleanLog = (datasetId) =>
  fetch(`${API_BASE}/clean/${datasetId}/log`)
    .then(handleResponse);

/**
 * Get cleaned preview rows.
 * @param {number|string} datasetId
 * @returns {Promise<CleanedPreview>}
 */
export const getCleanedPreview = (datasetId) =>
  fetch(`${API_BASE}/clean/${datasetId}/preview`)
    .then(handleResponse);

export const undoCleanDataset = (datasetId) =>
  fetch(`${API_BASE}/clean/${datasetId}/undo`, { method: 'POST' }).then(handleResponse);

// ── Analysis ─────────────────────────────────────────────────────────────

/**
 * Run analysis on a dataset.
 * @param {number|string} datasetId
 * @param {{ metricCol: string, categoryCol: string }} params
 * @returns {Promise<AnalysisResponseDto>}
 */
export const analyzeDataset = (datasetId, params) =>
  fetch(`${API_BASE}/analyze/${datasetId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  }).then(handleResponse);

// ── Gemini AI ────────────────────────────────────────────────────────────

/**
 * Get AI insights from Gemini.
 * @param {GeminiInsightRequestDto} payload
 * @returns {Promise<{ insights: string[], recommendations: Recommendation[] }>}
 */
export const testGeminiConnection = (apiKey) =>
  fetch(`${API_BASE}/gemini/test-connection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  }).then(handleResponse);

export const getGeminiInsights = (payload) => {
  const headers = getAuthHeaders();
  if (headers['X-Gemini-Api-Key'] && (!payload.apiKey || !payload.apiKey.trim())) {
    payload.apiKey = headers['X-Gemini-Api-Key'];
  }
  return fetch(`${API_BASE}/gemini/insights`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  }).then(handleResponse);
};

export const getQualityAudit = (payload) =>
  fetch(`${API_BASE}/gemini/quality-audit`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  }).then(handleResponse);

// ── Export ───────────────────────────────────────────────────────────────

/**
 * Download exported file.
 * @param {number|string} datasetId
 * @param {'excel'|'csv'|'json'|'html'} format
 * @returns {Promise<void>} triggers browser download
 */
export const exportDataset = async (datasetId, format) => {
  const res = await fetch(`${API_BASE}/export/${datasetId}/${format}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const contentDisposition = res.headers.get('Content-Disposition') || '';
  const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
  const filename = filenameMatch ? filenameMatch[1].replace(/['"]/g, '') : `export_${datasetId}.${format === 'excel' ? 'xlsx' : format}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Browsers start the download asynchronously; revoking immediately can
  // cancel the transfer before the file has been consumed.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const getPrintableReport = async (datasetId) => {
  const res = await fetch(`${API_BASE}/export/${datasetId}/html`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.text();
};

// ── Stats ────────────────────────────────────────────────────────────────

/**
 * Get platform-level statistics for the home screen.
 * Falls back gracefully if endpoint not available.
 */
export const getPlatformStats = () =>
  fetch(`${API_BASE}/stats`)
    .then(handleResponse)
    .catch(() => ({ datasetsProcessed: 0, rowsCleaned: 0, reportsExported: 0 }));
