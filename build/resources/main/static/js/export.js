/**
 * DataLens Studio – Export Handler Module
 * Export cleaned datasets in Excel, CSV, JSON, HTML Dashboard formats
 */

import { exportDataset, getPrintableReport } from './api.js';
import { showToast } from './ui.js';

export function initExportHandlers(getDatasetId) {
  const exportButtons = document.querySelectorAll('[data-export-format]');

  exportButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const datasetId = typeof getDatasetId === 'function' ? getDatasetId() : getDatasetId;
      if (!datasetId) {
        showToast({
          type: 'warning',
          title: 'Chưa có dữ liệu',
          desc: 'Vui lòng hoàn tất nạp và làm sạch dữ liệu trước khi xuất.'
        });
        return;
      }

      const format = btn.dataset.exportFormat;
      const originalText = btn.innerHTML;
      const printWindow = format === 'pdf' ? window.open('', '_blank') : null;
      if (format === 'pdf' && !printWindow) {
        showToast({ type: 'warning', title: 'Trình duyệt chặn cửa sổ in', desc: 'Cho phép cửa sổ bật lên rồi thử lại.' });
        return;
      }
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner spinner-sm"></span> Đang xuất...`;

      try {
        if (format === 'pdf') {
          const html = await getPrintableReport(datasetId);
          const loaded = new Promise((resolve) => {
            printWindow.addEventListener('load', resolve, { once: true });
            setTimeout(resolve, 1200);
          });
          printWindow.document.open();
          printWindow.document.write(html);
          printWindow.document.close();
          await loaded;
          if (printWindow.document.fonts?.ready) await printWindow.document.fonts.ready;
          await new Promise(resolve => printWindow.requestAnimationFrame(() => printWindow.requestAnimationFrame(resolve)));
          printWindow.focus();
          printWindow.print();
          showToast({ type: 'info', title: 'Bản in đã sẵn sàng', desc: 'Chọn “Lưu dưới dạng PDF” trong hộp thoại in.' });
        } else {
          await exportDataset(datasetId, format);
          showToast({ type: 'success', title: 'Xuất tệp thành công', desc: `Đã tải xuống tệp định dạng ${format.toUpperCase()}` });
        }
      } catch (err) {
        printWindow?.close();
        showToast({
          type: 'error',
          title: 'Lỗi xuất tệp',
          desc: err.message || 'Không thể tạo tệp xuất.'
        });
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });
  });
}
