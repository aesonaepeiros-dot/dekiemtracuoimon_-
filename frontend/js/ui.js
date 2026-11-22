/**
 * DataLens Studio – UI Components
 * Toast, Loading, Modal, Drawer utilities
 */

// ── Toast Notification ────────────────────────────────────────────────────

const toastContainer = document.getElementById('toast-container');

const TOAST_ICONS = {
  success: `<svg viewBox="0 0 20 20" fill="currentColor" class="toast-icon" style="color:#10B981"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>`,
  error:   `<svg viewBox="0 0 20 20" fill="currentColor" class="toast-icon" style="color:#EF4444"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/></svg>`,
  warning: `<svg viewBox="0 0 20 20" fill="currentColor" class="toast-icon" style="color:#F59E0B"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>`,
  info:    `<svg viewBox="0 0 20 20" fill="currentColor" class="toast-icon" style="color:#6366F1"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd"/></svg>`,
};

/**
 * Show a toast notification.
 * @param {{ type?: 'success'|'error'|'warning'|'info', title: string, desc?: string, duration?: number }} options
 */
export function showToast({ type = 'info', title, desc = '', duration = 4000 }) {
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    ${TOAST_ICONS[type] || TOAST_ICONS.info}
    <div class="toast-body">
      <div class="toast-title">${escapeHtml(title)}</div>
      ${desc ? `<div class="toast-desc">${escapeHtml(desc)}</div>` : ''}
    </div>
    <button class="toast-close" aria-label="Đóng">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
        <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
      </svg>
    </button>
  `;

  toast.querySelector('.toast-close').addEventListener('click', () => dismissToast(toast));
  toastContainer.appendChild(toast);

  const timer = setTimeout(() => dismissToast(toast), duration);
  toast._timer = timer;
}

function dismissToast(toast) {
  clearTimeout(toast._timer);
  toast.classList.add('hiding');
  toast.addEventListener('animationend', () => toast.remove(), { once: true });
  setTimeout(() => toast.remove(), 400);
}

// ── Loading State ─────────────────────────────────────────────────────────

/**
 * Show loading overlay inside a container element.
 * @param {HTMLElement} el
 * @param {string} [text]
 * @returns {() => void} hide function
 */
export function showLoading(el, text = 'Đang tải...') {
  el.style.position = 'relative';
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.innerHTML = `
    <div class="spinner spinner-lg"></div>
    <div class="loading-overlay-text">${escapeHtml(text)}</div>
  `;
  overlay.dataset.loadingOverlay = '1';
  el.appendChild(overlay);
  return () => overlay.remove();
}

/**
 * Show inline loading spinner + text inside an element.
 * @param {HTMLElement} el
 * @param {string} [text]
 */
export function setLoadingState(el, text = '') {
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;gap:10px;padding:48px;color:var(--slate-500);font-size:13px;">
      <div class="spinner"></div>
      ${text ? `<span>${escapeHtml(text)}</span>` : ''}
    </div>
  `;
}

// ── Skeleton Loaders ──────────────────────────────────────────────────────

/**
 * Generate skeleton stat cards HTML.
 * @param {number} count
 */
export function skeletonStatCards(count = 3) {
  return Array.from({ length: count }, () => `
    <div class="stat-card">
      <div class="skeleton" style="height:14px;width:60%;margin-bottom:12px;"></div>
      <div class="skeleton" style="height:32px;width:80%;margin-bottom:8px;"></div>
      <div class="skeleton" style="height:12px;width:40%;"></div>
    </div>
  `).join('');
}

/**
 * Generate skeleton table rows.
 * @param {number} rows
 * @param {number} cols
 */
export function skeletonTableRows(rows = 8, cols = 6) {
  const widths = ['60%', '80%', '50%', '70%', '55%', '75%'];
  return Array.from({ length: rows }, (_, r) => `
    <tr>
      ${Array.from({ length: cols }, (_, c) => `
        <td class="skeleton-cell">
          <div class="skeleton skeleton-line" style="width:${widths[(r + c) % widths.length]}"></div>
        </td>
      `).join('')}
    </tr>
  `).join('');
}

// ── Modal ─────────────────────────────────────────────────────────────────

/**
 * Show a confirmation modal.
 * @param {{ title: string, message: string, confirmLabel?: string, type?: 'danger'|'primary' }} opts
 * @returns {Promise<boolean>}
 */
export function showConfirm({ title, message, confirmLabel = 'Xác nhận', type = 'primary' }) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">${escapeHtml(title)}</span>
          <button class="btn btn-ghost btn-sm modal-cancel" style="padding:4px;">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75">
              <path d="M2 2l12 12M14 2L2 14"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <p style="font-size:14px;color:var(--slate-500);line-height:1.6;">${escapeHtml(message)}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary modal-cancel">Hủy</button>
          <button class="btn btn-${type} modal-confirm">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    const close = (result) => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 250);
      resolve(result);
    };

    overlay.querySelectorAll('.modal-cancel').forEach(b => b.addEventListener('click', () => close(false)));
    overlay.querySelector('.modal-confirm').addEventListener('click', () => close(true));
    overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });
  });
}

// ── Utility ───────────────────────────────────────────────────────────────

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format a number in Vietnamese style (1.234.567).
 * Abbrev Tỷ / Tr for large values.
 */
export function formatNumber(value, abbrev = false) {
  const n = Number(value);
  if (isNaN(n)) return String(value ?? '');
  if (abbrev) {
    if (Math.abs(n) >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace('.', ',') + ' Tỷ';
    if (Math.abs(n) >= 1_000_000)     return (n / 1_000_000).toFixed(1).replace('.', ',') + ' Tr';
  }
  return n.toLocaleString('vi-VN');
}

/**
 * Format date to dd/mm/yyyy HH:mm
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Debounce utility.
 */
export function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Set button to loading state and return restore function.
 */
export function setButtonLoading(btn, loadingText = 'Đang xử lý...') {
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner spinner-sm"></span> ${escapeHtml(loadingText)}`;
  return () => {
    btn.disabled = false;
    btn.innerHTML = original;
  };
}

/**
 * Render badge HTML.
 */
export function badge(text, variant = 'slate') {
  return `<span class="badge badge-${variant}">${escapeHtml(text)}</span>`;
}

/**
 * Render status badge for dataset.
 */
export function statusBadge(status) {
  const map = {
    'uploaded':  ['indigo',  'Đã tải lên'],
    'cleaned':   ['emerald', 'Đã làm sạch'],
    'analyzed':  ['violet',  'Đã phân tích'],
    'exported':  ['slate',   'Đã xuất'],
    'error':     ['red',     'Lỗi'],
  };
  const [variant, label] = map[status?.toLowerCase()] || ['slate', status || 'Không rõ'];
  return badge(label, variant);
}
