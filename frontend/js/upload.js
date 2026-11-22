/**
 * DataLens Studio – Upload Handler Module
 * Drag & Drop, File Validation, Progress & API Connection
 */

import { uploadDataset, getUploadConfig } from './api.js';
import { showToast } from './ui.js';

export function initUploadHandler({ onUploadSuccess, onUploadStart, onUploadError }) {
  const dropzone = document.getElementById('upload-dropzone');
  const fileInput = document.getElementById('file-input');
  const fileInfoCard = document.getElementById('upload-file-info');
  const submitBtn = document.getElementById('btn-submit-upload');
  const sampleBtn = document.getElementById('btn-load-sample');

  if (!dropzone || !fileInput) return;

  let selectedFile = null;
  let maxFileSize = 50 * 1024 * 1024;
  getUploadConfig().then(config => {
    if (Number.isFinite(Number(config.maxUploadBytes)) && Number(config.maxUploadBytes) > 0) {
      maxFileSize = Number(config.maxUploadBytes);
      const limit = document.querySelector('.upload-max-size');
      if (limit) limit.textContent = formatBytes(maxFileSize);
    }
  }).catch(() => {});

  // Click to browse
  dropzone.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SELECT') {
      fileInput.click();
    }
  });

  // Drag & drop
  ['dragenter', 'dragover'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileSelected(files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      handleFileSelected(fileInput.files[0]);
    }
  });

  function handleFileSelected(file) {
    const validExtensions = ['.xlsx', '.xls', '.csv', '.tsv', '.txt', '.json', '.docx', '.pdf'];
    const name = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => name.endsWith(ext));

    if (!isValid) {
      showToast({
        type: 'error',
        title: 'Định dạng không được hỗ trợ',
        desc: `Chỉ hỗ trợ: ${validExtensions.join(', ')}`
      });
      return;
    }

    if (file.size === 0) {
      showToast({
        type: 'error',
        title: 'Tệp rỗng',
        desc: 'Tệp tải lên có dung lượng 0 byte.'
      });
      return;
    }

    if (file.size > maxFileSize) {
      showToast({
        type: 'error',
        title: 'Dung lượng vượt quá giới hạn',
        desc: `Dung lượng tối đa cho phép là ${formatBytes(maxFileSize)}.`
      });
      return;
    }

    selectedFile = file;
    updateFileInfoDisplay(file);
  }

  function updateFileInfoDisplay(file) {
    if (!fileInfoCard) return;

    const nameEl = fileInfoCard.querySelector('.file-info-name');
    const sizeEl = fileInfoCard.querySelector('.file-info-size');
    const typeEl = fileInfoCard.querySelector('.file-info-type');

    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = formatBytes(file.size);
    if (typeEl) {
      const ext = file.name.split('.').pop().toUpperCase();
      typeEl.textContent = ext;
    }

    fileInfoCard.classList.remove('hidden');
    fileInfoCard.style.display = '';
    if (submitBtn) submitBtn.disabled = false;
  }

  // Submit Upload Button
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      if (!selectedFile) {
        showToast({ type: 'warning', title: 'Chưa chọn tệp', desc: 'Vui lòng chọn một tệp dữ liệu trước.' });
        return;
      }

      await submitSelectedFile();
    });
  }

  sampleBtn?.addEventListener('click', async () => {
    sampleBtn.disabled = true;
    try {
      const response = await fetch('./assets/sample-sales.csv');
      if (!response.ok) throw new Error('Không tải được dữ liệu mẫu.');
      const file = new File([await response.blob()], 'datalens-sales-sample.csv', { type: 'text/csv' });
      handleFileSelected(file);
      document.getElementById('upload-business-context').value = 'Doanh nghiệp bán hàng đa kênh tại ba miền';
      document.getElementById('upload-data-goal').value = 'So sánh doanh thu theo thời gian, khu vực và kênh bán; rà soát đơn hàng đã hủy.';
      await submitSelectedFile();
    } catch (err) {
      showToast({ type: 'error', title: 'Không thể chạy dữ liệu mẫu', desc: err.message || 'Vui lòng thử lại.' });
    } finally {
      sampleBtn.disabled = false;
    }
  });

  async function submitSelectedFile() {
    if (!selectedFile || !submitBtn) return;
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    if (sampleBtn) sampleBtn.disabled = true;
    if (onUploadStart) onUploadStart();
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const sheetSelect = document.getElementById('upload-sheet-select');
      if (sheetSelect?.value) formData.append('sheetName', sheetSelect.value);
      const context = document.getElementById('upload-business-context')?.value.trim();
      const goal = document.getElementById('upload-data-goal')?.value.trim();
      if (context) formData.append('businessContext', context);
      if (goal) formData.append('dataGoal', goal);

      const res = await uploadDataset(formData);
      showToast({
        type: 'success',
        title: 'Tải lên thành công',
        desc: `Đã nạp ${res.rowCount?.toLocaleString('vi-VN')} dòng, ${res.columnCount} cột từ "${res.originalFileName}"`
      });
      if (onUploadSuccess) onUploadSuccess(res);
    } catch (err) {
      showToast({ type: 'error', title: 'Lỗi tải lên tệp', desc: err.message || 'Không thể xử lý tệp dữ liệu.' });
      if (onUploadError) onUploadError(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
      if (sampleBtn) sampleBtn.disabled = false;
    }
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
