/**
 * DataLens Studio – Core Application Controller
 * Workflow Orchestration, State Management, View Routing & Gemini Integration
 */

import {
  getDatasetList,
  getDataset,
  getDatasetPage,
  updateDatasetCell,
  deleteDataset,
  cleanDataset,
  getCleanLog,
  analyzeDataset,
  getGeminiInsights,
  getQualityAudit,
  undoCleanDataset,
  testGeminiConnection
} from './api.js';
import { DataGrid } from './grid.js';
import { renderCharts, destroyCharts } from './charts.js';
import { initUploadHandler } from './upload.js';
import { initExportHandlers } from './export.js';
import { showToast, showLoading, skeletonStatCards } from './ui.js';

// Global Application State
const state = {
  currentDatasetId: null,
  activeView: 'home',
  dataset: null,
  cleanResult: null,
  analysisResult: null,
  geminiInsights: null,
  userQuestion: '',
  rules: {
    trimWhitespace: true,
    removeDuplicates: true,
    standardizeText: true,
    fillMissingWithMean: false,
    fillMissingWithMedian: false,
    removeMissingRows: false,
    detectOutliers: true
  }
};

let previewGrid = null;
let latestAuditLogs = [];

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initMotionPreference();
  initGeminiKeyModal();
  initNavigation();
  initUpload();
  initCleaningControls();
  initAnalysisControls();
  initExportHandlers(() => state.currentDatasetId);
  initHistoryView();
  loadHomeStats();
});

// ── Gemini Key Modal Management ──────────────────────────────────────────

function initGeminiKeyModal() {
  const modal = document.getElementById('gemini-key-modal');
  const input = document.getElementById('input-gemini-key');
  const statusEl = document.getElementById('gemini-modal-status');
  const statusText = document.getElementById('gemini-key-status-text');
  const statusDot = document.getElementById('gemini-key-status-dot');
  const toggleVisibility = document.getElementById('btn-toggle-key-visibility');
  const btnTestKey = document.getElementById('btn-test-gemini-key');

  function updateStatusUI() {
    const key = (localStorage.getItem('datalens_gemini_key') || '').trim();
    if (key) {
      if (statusText) statusText.textContent = 'Gemini 2.5: Sẵn sàng';
      if (statusDot) {
        statusDot.style.background = '#10B981';
        statusDot.style.boxShadow = '0 0 6px rgba(16,185,129,0.6)';
      }
      const badgeSource = document.getElementById('gemini-badge-source');
      if (badgeSource) {
        badgeSource.className = 'badge badge-success';
        badgeSource.textContent = '✨ Gemini 2.5 / 2.0 Flash (API thật)';
      }
    } else {
      if (statusText) statusText.textContent = 'Gemini: Chưa kết nối';
      if (statusDot) {
        statusDot.style.background = '#94A3B8';
        statusDot.style.boxShadow = 'none';
      }
      const badgeSource = document.getElementById('gemini-badge-source');
      if (badgeSource) {
        badgeSource.className = 'badge badge-slate';
        badgeSource.textContent = '⚡ Heuristic (Chưa có Key)';
      }
    }
  }

  updateStatusUI();

  function openModal() {
    if (!modal) return;
    const currentKey = localStorage.getItem('datalens_gemini_key') || '';
    if (input) input.value = currentKey;
    if (statusEl) {
      if (currentKey) {
        statusEl.style.display = 'block';
        statusEl.style.background = 'var(--emerald-50)';
        statusEl.style.color = 'var(--emerald-600)';
        statusEl.innerHTML = `✅ Đã lưu khóa API (kết thúc bằng <code>...${currentKey.slice(-4)}</code>)`;
      } else {
        statusEl.style.display = 'none';
      }
    }
    modal.classList.add('open');
  }

  function closeModal() {
    if (modal) modal.classList.remove('open');
  }

  document.getElementById('btn-open-gemini-modal')?.addEventListener('click', openModal);
  document.getElementById('btn-config-gemini-inline')?.addEventListener('click', openModal);
  document.getElementById('btn-close-gemini-modal')?.addEventListener('click', closeModal);
  document.getElementById('btn-cancel-gemini-modal')?.addEventListener('click', closeModal);

  // Toggle password visibility
  toggleVisibility?.addEventListener('click', () => {
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      toggleVisibility.textContent = 'Ẩn';
    } else {
      input.type = 'password';
      toggleVisibility.textContent = 'Hiện';
    }
  });

  // Test Connection Button
  btnTestKey?.addEventListener('click', async () => {
    const rawVal = input ? input.value.trim() : '';
    const cleanKey = rawVal.replace(/^["']|["']$/g, '').trim();

    if (!cleanKey) {
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.background = 'var(--amber-50)';
        statusEl.style.color = 'var(--amber-500)';
        statusEl.textContent = '⚠️ Vui lòng dán khóa API vào ô trước khi kiểm tra.';
      }
      return;
    }

    btnTestKey.disabled = true;
    const originalText = btnTestKey.innerHTML;
    btnTestKey.innerHTML = '<span class="spinner spinner-sm"></span> Đang thử...';
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.style.background = 'var(--indigo-50)';
      statusEl.style.color = 'var(--indigo-600)';
      statusEl.textContent = '🔄 Đang gửi ping kiểm tra tới mô hình Google Gemini 2.5 / 2.0 Flash...';
    }

    try {
      const res = await testGeminiConnection(cleanKey);
      if (res.success) {
        statusEl.style.display = 'block';
        statusEl.style.background = 'var(--emerald-50)';
        statusEl.style.color = 'var(--emerald-600)';
        statusEl.innerHTML = `✅ ${escapeHtml(res.message || 'Kết nối thành công!')} Khóa hợp lệ.`;
        showToast({
          type: 'success',
          title: 'Kết nối Gemini thành công',
          desc: `Mô hình ${res.model || 'Gemini 2.5 Flash'} phản hồi tốt!`
        });
      } else {
        statusEl.style.display = 'block';
        statusEl.style.background = 'var(--red-50)';
        statusEl.style.color = 'var(--red-500)';
        statusEl.innerHTML = `❌ Lỗi: ${escapeHtml(res.error || 'Khóa không hợp lệ')}`;
      }
    } catch (err) {
      statusEl.style.display = 'block';
      statusEl.style.background = 'var(--red-50)';
      statusEl.style.color = 'var(--red-500)';
      let msg = err.message || 'Không thể gọi backend';
      if (msg.includes('Not Found') || msg.includes('404')) {
        msg = 'Không tìm thấy API backend (404 Not Found). Vui lòng đảm bảo Backend Java đã được khởi động trên cổng 8080 (lệnh: java -jar backend/build/libs/datalens-backend-1.0.0.jar) và tải lại trang.';
      } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        msg = 'Không thể kết nối tới Backend (Cổng 8080 chưa mở). Vui lòng mở Terminal và chạy Backend trước: java -jar backend/build/libs/datalens-backend-1.0.0.jar';
      }
      statusEl.innerHTML = `❌ Lỗi: ${escapeHtml(msg)}`;
    } finally {
      btnTestKey.disabled = false;
      btnTestKey.innerHTML = originalText;
    }
  });

  // Save Key
  document.getElementById('btn-save-gemini-key')?.addEventListener('click', () => {
    const rawVal = input ? input.value.trim() : '';
    const cleanKey = rawVal.replace(/^["']|["']$/g, '').trim();

    if (!cleanKey) {
      showToast({ type: 'warning', title: 'Khóa trống', desc: 'Vui lòng nhập Google Gemini API Key hoặc bấm Đóng.' });
      return;
    }
    localStorage.setItem('datalens_gemini_key', cleanKey);
    updateStatusUI();
    closeModal();
    showToast({
      type: 'success',
      title: 'Đã lưu Gemini API Key',
      desc: 'Mô hình Google Gemini Flash đã được kích hoạt!'
    });
    if (state.activeView === 'analyze' && state.analysisResult) {
      fetchGeminiInsights();
    }
  });

  // Clear Key
  document.getElementById('btn-clear-gemini-key')?.addEventListener('click', () => {
    localStorage.removeItem('datalens_gemini_key');
    if (input) input.value = '';
    updateStatusUI();
    closeModal();
    showToast({
      type: 'info',
      title: 'Đã xóa Gemini API Key',
      desc: 'Hệ thống sẽ chuyển về bộ phân tích Heuristic nội bộ.'
    });
    if (state.activeView === 'analyze' && state.analysisResult) {
      fetchGeminiInsights();
    }
  });
}

// ── Theme Management ─────────────────────────────────────────────────────

function initTheme() {
  const savedTheme = localStorage.getItem('datalens_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeButton(savedTheme);

  const toggleBtn = document.getElementById('btn-toggle-theme');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('datalens_theme', next);
      updateThemeButton(next);
      if (state.analysisResult && state.activeView === 'analyze') {
        renderCharts(state.analysisResult);
      }
    });
  }
}

function updateThemeButton(theme) {
  const textEl = document.getElementById('theme-btn-text');
  const iconEl = document.getElementById('theme-btn-icon');
  if (textEl) textEl.textContent = theme === 'dark' ? 'Giao diện Sáng' : 'Giao diện Tối';
  if (iconEl) iconEl.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function initMotionPreference() {
  const saved = localStorage.getItem('datalens_motion') || 'on';
  document.documentElement.dataset.motion = saved;
  const button = document.getElementById('btn-toggle-motion');
  const label = document.getElementById('motion-btn-text');
  const update = () => {
    const off = document.documentElement.dataset.motion === 'off';
    if (button) button.setAttribute('aria-pressed', String(off));
    if (label) label.textContent = off ? 'Bật chuyển động' : 'Tắt chuyển động';
  };
  update();
  button?.addEventListener('click', () => {
    const next = document.documentElement.dataset.motion === 'off' ? 'on' : 'off';
    document.documentElement.dataset.motion = next;
    localStorage.setItem('datalens_motion', next);
    update();
  });
}

// ── Navigation & View Routing ────────────────────────────────────────────

function initNavigation() {
  document.querySelectorAll('[data-view-target]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.dataset.viewTarget;
      navigateTo(target);
    });
  });

  // Logo goes home
  document.getElementById('nav-brand')?.addEventListener('click', () => navigateTo('home'));

  // Quick Action Buttons
  document.getElementById('home-btn-upload')?.addEventListener('click', () => navigateTo('upload'));
  document.getElementById('home-btn-history')?.addEventListener('click', () => {
    navigateTo('history');
    loadHistoryList();
  });
}

export function navigateTo(viewName) {
  state.activeView = viewName;

  // Update nav sidebar items (CSS class: .nav-item)
  document.querySelectorAll('.nav-item[data-view-target]').forEach(item => {
    item.classList.toggle('active', item.dataset.viewTarget === viewName);
  });

  // Hide all views, then show the target (CSS: .view / .view.active)
  document.querySelectorAll('.view').forEach(sec => {
    sec.classList.remove('active');
  });

  const targetSec = document.getElementById(`view-${viewName}`);
  if (targetSec) {
    targetSec.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Show/hide stepper based on workflow step
  const workflowViews = ['upload', 'clean', 'analyze', 'export'];
  const stepper = document.getElementById('workflow-stepper');
  if (stepper) {
    stepper.style.display = workflowViews.includes(viewName) ? 'flex' : 'none';
  }

  // Update stepper active step
  updateStepperState(viewName);

  // View-specific activations
  if (viewName === 'analyze' && state.analysisResult) {
    setTimeout(() => renderCharts(state.analysisResult), 100);
  }
  if (viewName === 'history') {
    loadHistoryList();
  }
  if (viewName === 'home') {
    loadHomeStats();
  }
}

function updateStepperState(viewName) {
  const stepMap = {
    upload: 1,
    clean: 2,
    analyze: 3,
    export: 4
  };
  const activeStep = stepMap[viewName] || 0;
  if (!activeStep) return;

  const completed = [
    Boolean(state.dataset),
    Boolean(state.cleanResult || state.dataset?.status === 'CLEANED' || state.dataset?.status === 'ANALYZED'),
    Boolean(state.analysisResult),
    false
  ];
  for (let i = 1; i <= 4; i++) {
    const stepEl = document.getElementById(`stepper-step-${i}`);
    if (stepEl) {
      stepEl.classList.remove('active', 'done');
      if (i === activeStep) {
        stepEl.classList.add('active');
      } else if (completed[i - 1]) {
        stepEl.classList.add('done');
      }
    }
  }
}

// ── Step 1: Upload ───────────────────────────────────────────────────────

function initUpload() {
  initUploadHandler({
    onUploadSuccess: (uploadRes) => {
      state.currentDatasetId = uploadRes.datasetId;
      state.dataset = uploadRes;
      state.cleanResult = null;
      state.analysisResult = null;
      state.geminiInsights = null;
      state.userQuestion = '';
      const questionInput = document.getElementById('analysis-ai-question');
      if (questionInput) questionInput.value = '';
      latestAuditLogs = [];
      const undoButton = document.getElementById('btn-undo-clean');
      if (undoButton) undoButton.style.display = 'none';
      const approveButton = document.getElementById('btn-approve-clean');
      if (approveButton) approveButton.disabled = true;

      // Update dataset badge info
      document.querySelectorAll('.current-dataset-name').forEach(el => {
        el.textContent = uploadRes.originalFileName;
      });
      document.querySelectorAll('.current-dataset-meta').forEach(el => {
        el.textContent = `${uploadRes.rowCount?.toLocaleString('vi-VN')} dòng • ${uploadRes.columnCount} cột`;
      });

      // Prepare preview grid in Step 2
      preparePreviewGrid(uploadRes.previewRows || [], uploadRes.columns || []);

      // Advance to Step 2 (Cleaning)
      navigateTo('clean');
    }
  });
}

function preparePreviewGrid(rows, columns, auditLogs = []) {
  const container = document.getElementById('clean-preview-grid');
  if (!container) return;

  if (!previewGrid) {
    previewGrid = new DataGrid(container, {
      pageSize: 15,
      onCellEdit: async ({ rowNumber, columnName, value }) => {
        try {
          await updateDatasetCell(state.currentDatasetId, rowNumber, columnName, value);
          latestAuditLogs = await getCleanLog(state.currentDatasetId);
          if (state.dataset) {
            state.dataset.status = 'CLEANED';
            state.dataset.canUndo = true;
          }
          state.cleanResult = null;
          state.analysisResult = null;
          state.geminiInsights = null;
          const undoButton = document.getElementById('btn-undo-clean');
          if (undoButton) undoButton.style.display = 'inline-flex';
          previewGrid.auditLogs = latestAuditLogs;
          renderAuditLogList(latestAuditLogs);
          await previewGrid.loadRemotePage();
          showToast({ type: 'success', title: 'Đã cập nhật ô dữ liệu', desc: `Dòng ${rowNumber} · ${columnName}. Thay đổi đã được lưu vào nhật ký.` });
        } catch (err) {
          showToast({ type: 'error', title: 'Không thể lưu thay đổi', desc: err.message || 'Kiểm tra giá trị rồi thử lại.' });
          throw err;
        }
      }
    });
  }
  previewGrid.setData(rows, columns, auditLogs);
  if (state.currentDatasetId) {
    previewGrid.setRemoteLoader(query => getDatasetPage(state.currentDatasetId, query));
  }
}

// ── Step 2: Cleaning ─────────────────────────────────────────────────────

function initCleaningControls() {
  document.getElementById('audit-rule-filter')?.addEventListener('change', () => renderAuditLogList(latestAuditLogs));
  const ruleInputs = document.querySelectorAll('[data-rule-key]');
  ruleInputs.forEach(input => {
    const key = input.dataset.ruleKey;
    if (state.rules[key] !== undefined) {
      input.checked = state.rules[key];
    }
    input.addEventListener('change', () => {
      state.rules[key] = input.checked;
      state.cleanResult = null;
      const approve = document.getElementById('btn-approve-clean');
      if (approve) approve.disabled = true;
    });
  });

  // Run Cleaning Button
  const btnRunClean = document.getElementById('btn-run-clean');
  if (btnRunClean) {
    btnRunClean.addEventListener('click', async () => {
      if (!state.currentDatasetId) {
        showToast({ type: 'warning', title: 'Chưa có tệp', desc: 'Vui lòng nạp tệp dữ liệu ở Bước 1 trước.' });
        navigateTo('upload');
        return;
      }

      btnRunClean.disabled = true;
      btnRunClean.classList.add('loading');
      const hideLoad = showLoading(document.getElementById('clean-preview-grid'), 'Đang áp dụng các quy tắc làm sạch...');

      try {
        const cleanRes = await cleanDataset(state.currentDatasetId, state.rules);
        state.cleanResult = cleanRes;
        state.analysisResult = null;
        state.geminiInsights = null;

        // Fetch audit logs
        const auditLogs = await getCleanLog(state.currentDatasetId);

        // Update clean stats cards
        updateCleanStatsUI(cleanRes, auditLogs);
        const undoButton = document.getElementById('btn-undo-clean');
        if (undoButton) undoButton.style.display = 'inline-flex';

        // Update preview grid with cleaned data & audit highlights
        const cleanedRows = cleanRes.cleanedPreview || cleanRes.previewRows;
        if (cleanedRows && cleanedRows.length > 0) {
          preparePreviewGrid(cleanedRows, Object.keys(cleanedRows[0] || {}), auditLogs);
        }

        // Render audit log list
        renderAuditLogList(auditLogs);

        showToast({
          type: 'success',
          title: 'Làm sạch hoàn tất',
          desc: `Đã chuẩn hóa ${cleanRes.cellsModified?.toLocaleString('vi-VN')} ô, phát hiện ${cleanRes.outliersDetected?.toLocaleString('vi-VN')} ngoại lai IQR`
        });

        // Enable Approve Button
        const btnApprove = document.getElementById('btn-approve-clean');
        if (btnApprove) btnApprove.disabled = false;
      } catch (err) {
        showToast({
          type: 'error',
          title: 'Lỗi làm sạch dữ liệu',
          desc: err.message || 'Không thể thực thi quy tắc làm sạch.'
        });
      } finally {
        hideLoad();
        btnRunClean.disabled = false;
        btnRunClean.classList.remove('loading');
      }
    });
  }

  // Skip Cleaning & Proceed directly to Analysis
  const btnSkipClean = document.getElementById('btn-skip-clean');
  if (btnSkipClean) {
    btnSkipClean.addEventListener('click', async () => {
      if (!state.currentDatasetId) {
        showToast({ type: 'warning', title: 'Chưa có tệp', desc: 'Vui lòng nạp tệp dữ liệu trước.' });
        navigateTo('upload');
        return;
      }
      btnSkipClean.disabled = true;
      btnSkipClean.classList.add('loading');
      try {
        await executeAnalysis();
        navigateTo('analyze');
      } catch (err) {
        showToast({ type: 'error', title: 'Lỗi phân tích', desc: err.message });
      } finally {
        btnSkipClean.disabled = false;
        btnSkipClean.classList.remove('loading');
      }
    });
  }

  // Approve & Proceed to Step 3
  const btnApprove = document.getElementById('btn-approve-clean');
  if (btnApprove) {
    btnApprove.addEventListener('click', async () => {
      if (!state.currentDatasetId) return;

      btnApprove.disabled = true;
      btnApprove.classList.add('loading');

      try {
        await executeAnalysis();
        navigateTo('analyze');
      } catch (err) {
        showToast({
          type: 'error',
          title: 'Lỗi phân tích',
          desc: err.message || 'Không thể tính toán Dashboard.'
        });
      } finally {
        btnApprove.disabled = false;
        btnApprove.classList.remove('loading');
      }
    });
  }

  document.getElementById('btn-undo-clean')?.addEventListener('click', async (event) => {
    if (!state.currentDatasetId) return;
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await undoCleanDataset(state.currentDatasetId);
      const dataset = await getDataset(state.currentDatasetId);
      state.dataset = dataset;
      state.cleanResult = null;
      state.analysisResult = null;
      state.geminiInsights = null;
      preparePreviewGrid(dataset.previewRows || [], dataset.columns || []);
      renderAuditLogList([]);
      updateCleanStatsUI({ cleanedRowCount: dataset.rowCount, rowsRemoved: 0, cellsModified: 0, outliersDetected: 0 }, []);
      button.style.display = 'none';
      const approve = document.getElementById('btn-approve-clean');
      if (approve) approve.disabled = true;
      showToast({ type: 'success', title: 'Đã hoàn tác', desc: 'Dữ liệu đã được khôi phục về bản gốc. Nhật ký phiên cũ vẫn được lưu.' });
    } catch (err) {
      showToast({ type: 'error', title: 'Không thể hoàn tác', desc: err.message || 'Vui lòng thử lại.' });
    } finally {
      button.disabled = false;
    }
  });
}

function updateCleanStatsUI(stats, auditLogs = []) {
  const cleanedRowsEl = document.getElementById('stat-cleaned-rows');
  const removedRowsEl = document.getElementById('stat-removed-rows');
  const modifiedCellsEl = document.getElementById('stat-modified-cells');
  const outliersEl = document.getElementById('stat-outliers-count');

  if (cleanedRowsEl) cleanedRowsEl.textContent = stats.cleanedRowCount?.toLocaleString('vi-VN') || '0';
  if (removedRowsEl) removedRowsEl.textContent = stats.rowsRemoved?.toLocaleString('vi-VN') || '0';
  if (modifiedCellsEl) modifiedCellsEl.textContent = stats.cellsModified?.toLocaleString('vi-VN') || '0';
  if (outliersEl) outliersEl.textContent = stats.outliersDetected?.toLocaleString('vi-VN') || '0';
  const impact = document.getElementById('clean-impact-summary');
  if (impact) {
    const changedRows = new Set(auditLogs.filter(log => log.columnName !== '*' && !log.changeReason?.includes('OUTLIER')).map(log => log.rowNumber)).size;
    const changedColumns = new Set(auditLogs.filter(log => log.columnName && log.columnName !== '*').map(log => log.columnName)).size;
    impact.style.display = 'block';
    impact.innerHTML = `<strong>Tác động phiên này:</strong> ${changedRows.toLocaleString('vi-VN')} dòng có thay đổi ô · ${changedColumns.toLocaleString('vi-VN')} cột bị ảnh hưởng · ${Number(stats.rowsRemoved || 0).toLocaleString('vi-VN')} dòng bị loại bỏ.`;
  }
}

function renderAuditLogList(logs) {
  const container = document.getElementById('audit-log-container');
  if (!container) return;
  latestAuditLogs = Array.isArray(logs) ? logs : [];
  const ruleFilter = document.getElementById('audit-rule-filter');
  if (ruleFilter) {
    const previous = ruleFilter.value;
    const rules = [...new Set(latestAuditLogs.map(log => log.changeReason).filter(Boolean))].sort();
    ruleFilter.innerHTML = '<option value="">Tất cả quy tắc</option>' + rules.map(rule =>
      `<option value="${escapeHtml(rule)}">${escapeHtml(rule)}</option>`).join('');
    if (rules.includes(previous)) ruleFilter.value = previous;
  }

  const selectedRule = ruleFilter?.value || '';
  const visibleLogs = selectedRule ? latestAuditLogs.filter(log => log.changeReason === selectedRule) : latestAuditLogs;
  if (visibleLogs.length === 0) {
    container.innerHTML = `<div class="empty-state-card">Không có thay đổi nào được ghi lại trong nhật ký.</div>`;
    return;
  }

  const items = visibleLogs.slice(0, 30).map(log => {
    const isOutlier = log.changeReason?.includes('OUTLIER');
    const badgeClass = isOutlier ? 'badge-warning' : 'badge-primary';

    return `
      <div class="audit-log-item">
        <div class="audit-log-header">
          <span class="badge ${badgeClass}">${escapeHtml(log.changeReason || 'MODIFIED')}</span>
          <span class="audit-log-location">Dòng ${log.rowNumber} • Cột <strong>${escapeHtml(log.columnName)}</strong></span>
          <span class="audit-log-time">${formatDate(log.createdAt)}</span>
        </div>
        <div class="audit-log-diff">
          <div class="diff-before">Trước: <code>${escapeHtml(log.beforeValue || '(trống)')}</code></div>
          <span class="diff-arrow">→</span>
          <div class="diff-after">Sau: <code>${escapeHtml(log.afterValue || '(trống)')}</code></div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = items + (visibleLogs.length > 30 ? `<div class="text-muted text-sm" style="padding:12px;text-align:center;">... và ${(visibleLogs.length - 30).toLocaleString('vi-VN')} bản ghi thay đổi khác</div>` : '');
}

// ── Step 3: Analysis & Gemini ────────────────────────────────────────────

function initAnalysisControls() {
  const metricSelect = document.getElementById('analysis-metric-select');
  const categorySelect = document.getElementById('analysis-category-select');
  const btnReanalyze = document.getElementById('btn-reanalyze');
  const btnProceedExport = document.getElementById('btn-proceed-export');
  const chartTypeSelect = document.getElementById('analysis-chart-type');
  chartTypeSelect?.addEventListener('change', () => setVisibleChart(chartTypeSelect.value));
  document.getElementById('btn-back-clean')?.addEventListener('click', () => navigateTo('clean'));

  document.getElementById('btn-quality-audit')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const results = document.getElementById('quality-audit-results');
    if (!state.currentDatasetId || !results) return;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Đang kiểm tra...';
    results.textContent = 'Đang tính toán chỉ số chất lượng...';
    try {
      const report = await getQualityAudit({ datasetId: state.currentDatasetId });
      const metrics = report.metrics || report;
      const issues = Array.isArray(report.issues) ? report.issues : [];
      const completeness = Number(metrics.completenessPercent);
      results.innerHTML = `
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
          <span class="badge badge-primary">Độ đầy đủ: ${Number.isFinite(completeness) ? `${completeness.toFixed(1)}%` : '—'}</span>
          <span class="badge badge-warning">Ô trống: ${escapeHtml(metrics.totalMissing ?? '—')}</span>
          <span class="badge badge-slate">Dòng trùng ước tính: ${escapeHtml(metrics.estimatedDuplicates ?? '—')}</span>
          <span class="badge badge-slate">Nguồn: ${escapeHtml(report.source || 'phân tích nội bộ')}</span>
        </div>
        ${issues.length ? `<ul style="padding-left:20px;">${issues.map(issue => `<li class="text-sm" style="margin:5px 0;">${escapeHtml(issue)}</li>`).join('')}</ul>` : '<div class="text-sm text-muted">Không phát hiện vấn đề nổi bật.</div>'}
      `;
    } catch (err) {
      results.textContent = err.message || 'Không thể kiểm tra chất lượng dữ liệu.';
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  });

  if (btnReanalyze) {
    btnReanalyze.addEventListener('click', async () => {
      const metricCol = metricSelect?.value;
      const categoryCol = categorySelect?.value;
      const fromDate = document.getElementById('analysis-from-date')?.value || '';
      const toDate = document.getElementById('analysis-to-date')?.value || '';
      if (fromDate && toDate && fromDate > toDate) {
        showToast({ type: 'warning', title: 'Khoảng ngày chưa hợp lệ', desc: 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.' });
        return;
      }
      const dateCol = document.getElementById('analysis-date-select')?.value;
      if ((fromDate || toDate) && !dateCol) {
        showToast({ type: 'warning', title: 'Chưa chọn cột ngày', desc: 'Hãy chọn cột ngày trước khi đặt khoảng lọc.' });
        return;
      }
      btnReanalyze.disabled = true;
      try {
        await executeAnalysis(metricCol, categoryCol, {
          dateCol,
          fromDate,
          toDate,
          categoryValue: document.getElementById('analysis-category-value')?.value.trim()
        });
      } catch (err) {
        showToast({ type: 'error', title: 'Không thể tính toán lại', desc: err.message || 'Kiểm tra bộ lọc rồi thử lại.' });
      } finally {
        btnReanalyze.disabled = false;
      }
    });
  }

  if (btnProceedExport) {
    btnProceedExport.addEventListener('click', () => {
      updateExportSummary();
      navigateTo('export');
    });
  }

  // Trigger Gemini Insights Manually
  document.getElementById('btn-refresh-gemini')?.addEventListener('click', () => {
    fetchGeminiInsights();
  });

  document.getElementById('btn-ask-data')?.addEventListener('click', async (event) => {
    const question = document.getElementById('analysis-ai-question')?.value.trim();
    if (!question) {
      showToast({ type: 'warning', title: 'Nhập câu hỏi trước', desc: 'Hãy hỏi điều bạn muốn biết về bộ dữ liệu.' });
      return;
    }
    if (!(localStorage.getItem('datalens_gemini_key') || '').trim()) {
      showToast({ type: 'info', title: 'Cần cấu hình Gemini', desc: 'Nhập API Key để AI trả lời câu hỏi theo bối cảnh dữ liệu.' });
      document.getElementById('btn-config-gemini-inline')?.click();
      return;
    }
    state.userQuestion = question;
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await fetchGeminiInsights(question);
    } finally {
      button.disabled = false;
    }
  });
}

async function executeAnalysis(customMetric, customCategory) {
  if (!state.currentDatasetId) return;

  const params = {};
  if (customMetric) params.metricCol = customMetric;
  if (customCategory) params.categoryCol = customCategory;
  const dateCol = document.getElementById('analysis-date-select')?.value;
  const fromDate = document.getElementById('analysis-from-date')?.value;
  const toDate = document.getElementById('analysis-to-date')?.value;
  const categoryValue = document.getElementById('analysis-category-value')?.value.trim();
  if (dateCol) params.dateCol = dateCol;
  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;
  if (categoryValue) params.categoryValue = categoryValue;

  const res = await analyzeDataset(state.currentDatasetId, params);
  state.analysisResult = res;

  // Populate Select Dropdowns
  populateColumnSelects(res);

  // Update 4 KPI Cards
  updateKpiCards(res);

  // Render 5 Charts
  renderCharts(res);
  setVisibleChart(document.getElementById('analysis-chart-type')?.value || 'bar');

  // Fetch AI Insights from Gemini
  fetchGeminiInsights();
}

function populateColumnSelects(analysis) {
  const metricSelect = document.getElementById('analysis-metric-select');
  const categorySelect = document.getElementById('analysis-category-select');

  if (metricSelect && analysis.numericColumns) {
    metricSelect.innerHTML = analysis.numericColumns.map(col => `
      <option value="${escapeHtml(col)}" ${col === analysis.metricCol ? 'selected' : ''}>
        Chỉ số: ${escapeHtml(col)}
      </option>
    `).join('');
  }

  if (categorySelect) {
    const options = [...(analysis.categoricalColumns || []), ...(analysis.dateColumns || [])];
    categorySelect.innerHTML = options.map(col => `
      <option value="${escapeHtml(col)}" ${col === analysis.categoryCol ? 'selected' : ''}>
        ${analysis.dateColumns?.includes(col) ? 'Thời gian' : 'Phân loại'}: ${escapeHtml(col)}
      </option>
    `).join('');
  }

  const dateSelect = document.getElementById('analysis-date-select');
  if (dateSelect) {
    const previous = dateSelect.value;
    dateSelect.innerHTML = '<option value="">Không lọc ngày</option>' + (analysis.dateColumns || []).map(col =>
      `<option value="${escapeHtml(col)}">${escapeHtml(col)}</option>`).join('');
    if ((analysis.dateColumns || []).includes(previous)) dateSelect.value = previous;
  }
}

function setVisibleChart(type) {
  const ids = { bar: 'chart-bar', line: 'chart-line', doughnut: 'chart-doughnut', pareto: 'chart-pareto', histogram: 'chart-histogram' };
  const notice = document.getElementById('analysis-chart-notice');
  const lineHasDate = state.analysisResult?.dateColumns?.includes(state.analysisResult?.categoryCol);
  if (notice) {
    notice.textContent = type === 'line' && !lineHasDate
      ? 'Để xem xu hướng theo thời gian, hãy chọn một cột ngày ở mục “Phân nhóm theo” rồi tính toán lại.'
      : '';
    notice.style.display = type === 'line' && !lineHasDate ? 'block' : 'none';
  }
  Object.entries(ids).forEach(([key, id]) => {
    const canvas = document.getElementById(id);
    const card = canvas?.closest('.chart-card');
    if (card) card.style.display = key === type ? '' : 'none';
  });
}

function updateKpiCards(analysis) {
  const sumEl = document.getElementById('kpi-sum');
  const meanEl = document.getElementById('kpi-mean');
  const medianEl = document.getElementById('kpi-median');
  const stdEl = document.getElementById('kpi-std');

  const stats = analysis.columnStats && analysis.metricCol ? analysis.columnStats[analysis.metricCol] : null;

  if (stats) {
    if (sumEl) sumEl.textContent = formatCompactCurrency(stats.sum);
    if (meanEl) meanEl.textContent = formatCompactCurrency(stats.mean);
    if (medianEl) medianEl.textContent = formatCompactCurrency(stats.median);
    if (stdEl) stdEl.textContent = formatCompactCurrency(stats.stdDev);

    document.querySelectorAll('.kpi-metric-name').forEach(el => {
      el.textContent = analysis.metricCol;
    });
  }
}

async function fetchGeminiInsights(userQuestion = state.userQuestion) {
  const container = document.getElementById('gemini-insights-container');
  const recContainer = document.getElementById('gemini-recommendations-container');
  const badgeSource = document.getElementById('gemini-badge-source');
  if (!container || !state.analysisResult) return;

  state.userQuestion = userQuestion || '';

  const userKey = localStorage.getItem('datalens_gemini_key') || '';

  container.innerHTML = `
    <div class="ai-loading-state">
      <div class="spinner spinner-sm"></div>
      <span>Đang phân tích số liệu ${userKey ? 'với Google Gemini Flash...' : 'với Bộ phân tích Heuristic...'}</span>
    </div>
  `;

  try {
    const statObj = state.analysisResult.columnStats ? state.analysisResult.columnStats[state.analysisResult.metricCol] : {};
    const payload = {
      datasetId: state.currentDatasetId,
      apiKey: userKey,
      metricCol: state.analysisResult.metricCol,
      categoryCol: state.analysisResult.categoryCol,
      rowCount: state.dataset?.rowCount || 0,
      columns: state.dataset?.columns || [],
      analysisContext: [state.dataset?.businessContext, state.dataset?.dataGoal].filter(Boolean).join('\n'),
      userQuestion: state.userQuestion,
      statistics: statObj
    };

    const res = await getGeminiInsights(payload);
    state.geminiInsights = res;

    // Update source badge
    if (badgeSource) {
      if (res.source === 'gemini') {
        badgeSource.className = 'badge badge-success';
        badgeSource.textContent = '✨ Google Gemini Flash (' + (res.model || 'API thật') + ')';
      } else {
        badgeSource.className = 'badge badge-slate';
        badgeSource.textContent = userKey ? '⚡ Heuristic (Gemini lỗi kết nối)' : '⚡ Heuristic (Chưa có API Key)';
      }
    }

    // Render Insights
    if (res.insights && res.insights.length > 0) {
      container.innerHTML = res.insights.map((ins, idx) => `
        <div class="insight-card">
          <div class="insight-badge">Nhận định ${idx + 1}</div>
          <div class="insight-content">${escapeHtml(ins)}</div>
        </div>
      `).join('');
    } else {
      container.innerHTML = `<div class="text-muted text-sm" style="padding:16px;">Chưa có nhận định nào từ mô hình.</div>`;
    }

    // Render Recommendations
    if (recContainer && res.recommendations) {
      recContainer.innerHTML = res.recommendations.map((rec, idx) => {
        const priorityColors = ['badge-danger', 'badge-warning', 'badge-primary'];
        const badgeClass = priorityColors[idx % 3];
        let title = typeof rec === 'object' ? rec.priority || `Ưu tiên ${idx + 1}` : `Ưu tiên ${idx + 1}`;
        title = String(title)
          .replace(/priority\s*1/i, 'Ưu tiên 1 (Khẩn cấp)')
          .replace(/priority\s*2/i, 'Ưu tiên 2 (Quan trọng)')
          .replace(/priority\s*3/i, 'Ưu tiên 3 (Dài hạn)')
          .replace(/^p1$/i, 'Ưu tiên 1 (Khẩn cấp)')
          .replace(/^p2$/i, 'Ưu tiên 2 (Quan trọng)')
          .replace(/^p3$/i, 'Ưu tiên 3 (Dài hạn)');
        const desc = typeof rec === 'object' ? rec.action || rec.description : rec;

        return `
          <div class="recommendation-card">
            <div class="recommendation-header">
              <span class="badge ${badgeClass}">${escapeHtml(title)}</span>
            </div>
            <p class="recommendation-text">${escapeHtml(desc)}</p>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    if (badgeSource) {
      badgeSource.className = 'badge badge-warning';
      badgeSource.textContent = 'Bộ phân tích Heuristic';
    }
    container.innerHTML = `
      <div class="insight-card fallback-notice">
        <div class="insight-badge">Bộ phân tích Heuristic</div>
        <div class="insight-content">
          ${escapeHtml(err.message || 'Hệ thống đã tự động chuyển sang phân tích heuristic dựa trên số liệu thống kê thực.')}
        </div>
      </div>
    `;
  }
}

// ── Step 4: Export Summary ───────────────────────────────────────────────

function updateExportSummary() {
  const fileNameEl = document.getElementById('export-summary-filename');
  const rowsEl = document.getElementById('export-summary-rows');
  const colsEl = document.getElementById('export-summary-cols');
  const metricEl = document.getElementById('export-summary-metric');

  if (state.dataset) {
    if (fileNameEl) fileNameEl.textContent = state.dataset.originalFileName || 'Tệp dữ liệu';
    if (rowsEl) rowsEl.textContent = (state.cleanResult?.cleanedRowCount || state.dataset.rowCount || 0).toLocaleString('vi-VN');
    if (colsEl) colsEl.textContent = state.dataset.columnCount || 0;
  }
  if (state.analysisResult && metricEl) {
    metricEl.textContent = state.analysisResult.metricCol || 'Chưa chọn';
  }
}

// ── History View ─────────────────────────────────────────────────────────

function initHistoryView() {
  document.getElementById('btn-refresh-history')?.addEventListener('click', loadHistoryList);
}

async function loadHistoryList() {
  const tbody = document.getElementById('history-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:32px;"><div class="spinner"></div> Đang tải lịch sử...</td></tr>`;

  try {
    const list = await getDatasetList();
    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding:48px;">Chưa có tệp dữ liệu nào trong cơ sở dữ liệu.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((item, idx) => `
      <tr>
        <td class="text-center font-mono">${idx + 1}</td>
        <td>
          <div class="font-medium">${escapeHtml(item.originalFileName)}</div>
          <div class="text-muted text-xs">${escapeHtml(item.fileType || 'EXCEL')} • Sheet: ${escapeHtml(item.sheetName || 'Sheet1')}</div>
        </td>
        <td>${formatDate(item.uploadedAt)}</td>
        <td class="font-mono text-right">${item.rowCount?.toLocaleString('vi-VN') || 0}</td>
        <td class="font-mono text-right">${item.columnCount || 0}</td>
        <td><span class="badge ${item.status === 'CLEANED' ? 'badge-success' : 'badge-primary'}">${escapeHtml(item.status || 'UPLOADED')}</span></td>
        <td class="text-center">
          <div class="action-btn-group">
            <button class="btn btn-secondary btn-sm" data-action="load-dataset" data-id="${item.id}">Mở</button>
            <button class="btn btn-danger btn-sm" data-action="delete-dataset" data-id="${item.id}">Xóa</button>
          </div>
        </td>
      </tr>
    `).join('');

    // Attach actions
    tbody.querySelectorAll('[data-action="load-dataset"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        await loadExistingDataset(id);
      });
    });

    tbody.querySelectorAll('[data-action="delete-dataset"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (confirm(`Bạn có chắc muốn xóa tệp này khỏi cơ sở dữ liệu?`)) {
          btn.disabled = true;
          try {
            await deleteDataset(id);
            if (String(state.currentDatasetId) === String(id)) {
              state.currentDatasetId = null;
              state.dataset = null;
              state.cleanResult = null;
              state.analysisResult = null;
              state.geminiInsights = null;
            }
            showToast({ type: 'info', title: 'Đã xóa tệp dữ liệu' });
            await loadHistoryList();
            loadHomeStats();
          } catch (err) {
            btn.disabled = false;
            showToast({ type: 'error', title: 'Không thể xóa tệp', desc: err.message || 'Vui lòng thử lại.' });
          }
        }
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger" style="padding:24px;">Lỗi tải danh sách: ${escapeHtml(err.message)}</td></tr>`;
  }
}

async function loadExistingDataset(id) {
  try {
    const data = await getDataset(id);
    state.currentDatasetId = data.id;
    state.dataset = data;
    state.cleanResult = null;
    state.analysisResult = null;
    state.geminiInsights = null;
    state.userQuestion = '';
    const questionInput = document.getElementById('analysis-ai-question');
    if (questionInput) questionInput.value = '';
    const undoButton = document.getElementById('btn-undo-clean');
    if (undoButton) undoButton.style.display = data.canUndo && ['CLEANED', 'ANALYZED'].includes(data.status) ? 'inline-flex' : 'none';

    document.querySelectorAll('.current-dataset-name').forEach(el => el.textContent = data.originalFileName);
    document.querySelectorAll('.current-dataset-meta').forEach(el => el.textContent = `${data.rowCount?.toLocaleString('vi-VN')} dòng • ${data.columnCount} cột`);

    const auditLogs = await getCleanLog(id);
    preparePreviewGrid(data.previewRows || [], data.columns || [], auditLogs);
    renderAuditLogList(auditLogs);

    navigateTo('clean');
    showToast({ type: 'success', title: 'Đã mở tệp dữ liệu', desc: data.originalFileName });
  } catch (err) {
    showToast({ type: 'error', title: 'Lỗi tải tệp', desc: err.message });
  }
}

async function loadHomeStats() {
  try {
    const list = await getDatasetList();
    const countEl = document.getElementById('home-stat-datasets');
    const rowsEl = document.getElementById('home-stat-rows');
    const recentContainer = document.getElementById('home-recent-datasets');

    if (countEl) countEl.textContent = (list?.length || 0).toLocaleString('vi-VN');

    if (rowsEl && list) {
      const totalRows = list.reduce((acc, cur) => acc + (cur.rowCount || 0), 0);
      rowsEl.textContent = totalRows.toLocaleString('vi-VN');
    }

    if (recentContainer && list) {
      if (list.length === 0) {
        recentContainer.innerHTML = `<div class="text-muted text-sm" style="padding:16px;">Chưa có dữ liệu nào được tải lên. Hãy bắt đầu bằng cách nạp tệp dữ liệu thật của bạn.</div>`;
      } else {
        recentContainer.innerHTML = list.slice(0, 4).map(d => `
          <div class="recent-item-card" data-id="${d.id}">
            <div class="recent-item-info">
              <span class="recent-item-title">${escapeHtml(d.originalFileName)}</span>
              <span class="recent-item-meta">${formatDate(d.uploadedAt)} • ${d.rowCount?.toLocaleString('vi-VN')} dòng</span>
            </div>
            <button class="btn btn-secondary btn-sm" data-action="quick-open" data-id="${d.id}">Xem chi tiết →</button>
          </div>
        `).join('');

        recentContainer.querySelectorAll('[data-action="quick-open"]').forEach(btn => {
          btn.addEventListener('click', () => loadExistingDataset(btn.dataset.id));
        });
      }
    }
  } catch (ignored) {}
}

// ── Formatters ───────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return isoStr;
  }
}

function formatCompactCurrency(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  const n = Number(num);
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + ' Tỷ';
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(2) + ' Triệu';
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + ' nghìn';
  return n.toLocaleString('vi-VN');
}
