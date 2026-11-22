/**
 * DataLens Studio – Data Grid Component
 * Enterprise Data Grid: Sorting, Filtering, Pagination, Outlier & Modification Highlights
 */

export class DataGrid {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.options = {
      pageSize: 15,
      showSearch: true,
      showPagination: true,
      showFilterButtons: true,
      onRowClick: null,
      onCellEdit: null,
      ...options
    };

    this.rawRows = [];
    this.filteredRows = [];
    this.columns = [];
    this.auditLogs = [];
    this.sortCol = null;
    this.sortDir = 'asc'; // 'asc' | 'desc'
    this.searchTerm = '';
    this.columnFilters = {};
    this.filterMode = 'all'; // 'all' | 'modified' | 'outlier'
    this.currentPage = 1;
    this.remoteLoader = null;
    this.remoteTotalRows = null;
    this.remoteAllRows = null;
    this.remoteModifiedRows = null;
    this.remoteOutlierRows = null;
    this.remoteTotalPages = null;
    this.remoteStartIndex = 0;
    this.remoteTimer = null;
    this.remoteRequestId = 0;

    this.init();
  }

  init() {
    if (!this.container) return;
    this.container.classList.add('grid-container');
    this.renderShell();
  }

  renderShell() {
    this.container.innerHTML = `
      <div class="grid-toolbar">
        <div class="grid-toolbar-left">
          ${this.options.showSearch ? `
            <div class="grid-search">
              <svg class="grid-search-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" />
              </svg>
              <input type="text" placeholder="Tìm kiếm trong bảng..." class="grid-search-input" />
            </div>
          ` : ''}
          ${this.options.showFilterButtons ? `
            <div class="grid-filters">
              <button class="grid-filter-btn active" data-filter="all">Tất cả (<span class="count-all">0</span>)</button>
              <button class="grid-filter-btn" data-filter="modified">Đã sửa (<span class="count-modified">0</span>)</button>
              <button class="grid-filter-btn" data-filter="outlier">Ngoại lai IQR (<span class="count-outlier">0</span>)</button>
            </div>
          ` : ''}
        </div>
        <div class="grid-toolbar-right">
          <span class="grid-total-info">0 bản ghi</span>
          <label class="grid-page-size-label">Mỗi trang
            <select class="grid-page-size" aria-label="Số dòng mỗi trang">
              <option value="15" selected>15</option><option value="50">50</option><option value="100">100</option>
            </select>
          </label>
        </div>
      </div>
      <div class="grid-table-wrapper">
        <table class="grid-table">
          <thead></thead>
          <tbody>
            <tr><td class="grid-empty" colspan="100">Chưa có dữ liệu</td></tr>
          </tbody>
        </table>
      </div>
      ${this.options.showPagination ? `
        <div class="grid-pagination">
          <div class="grid-page-info">Trang 1 / 1 (0 dòng)</div>
          <div class="grid-page-controls">
            <button class="btn btn-secondary btn-sm grid-btn-prev" disabled>← Trước</button>
            <span class="grid-page-current">1</span>
            <button class="btn btn-secondary btn-sm grid-btn-next" disabled>Sau →</button>
          </div>
        </div>
      ` : ''}
    `;

    this.attachEvents();
  }

  attachEvents() {
    const searchInput = this.container.querySelector('.grid-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value.trim().toLowerCase();
        this.currentPage = 1;
        this.remoteLoader ? this.scheduleRefresh() : this.applyFilters();
      });
    }

    const filterBtns = this.container.querySelectorAll('.grid-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filterMode = btn.dataset.filter;
        this.currentPage = 1;
        this.applyFilters();
      });
    });

    const prevBtn = this.container.querySelector('.grid-btn-prev');
    const nextBtn = this.container.querySelector('.grid-btn-next');
    const pageSizeSelect = this.container.querySelector('.grid-page-size');
    pageSizeSelect?.addEventListener('change', () => {
      this.options.pageSize = Number(pageSizeSelect.value) || 15;
      this.currentPage = 1;
      this.remoteLoader ? this.loadRemotePage() : this.renderTableBody();
    });
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.remoteLoader ? this.loadRemotePage() : this.renderTableBody();
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const totalPages = this.remoteTotalPages || (Math.ceil(this.filteredRows.length / this.options.pageSize) || 1);
        if (this.currentPage < totalPages) {
          this.currentPage++;
          this.remoteLoader ? this.loadRemotePage() : this.renderTableBody();
        }
      });
    }
  }

  setRemoteLoader(loader) {
    this.remoteLoader = loader;
    this.currentPage = 1;
    return this.loadRemotePage();
  }

  scheduleRefresh() {
    if (!this.remoteLoader) return;
    clearTimeout(this.remoteTimer);
    this.remoteTimer = setTimeout(() => this.loadRemotePage(), 250);
  }

  async loadRemotePage() {
    if (!this.remoteLoader) return;
    const requestId = ++this.remoteRequestId;
    const tbody = this.container.querySelector('tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="100" class="grid-empty">Đang tải trang dữ liệu…</td></tr>`;
    try {
      const result = await this.remoteLoader({
        page: this.currentPage - 1,
        size: this.options.pageSize,
        search: this.searchTerm,
        sort: this.sortCol,
        direction: this.sortDir,
        filterMode: this.filterMode,
        filters: { ...this.columnFilters }
      });
      if (requestId !== this.remoteRequestId || !this.remoteLoader) return;
      this.rawRows = Array.isArray(result.rows) ? result.rows : [];
      this.filteredRows = this.rawRows;
      const nextColumns = Array.isArray(result.columns) ? result.columns : this.columns;
      const columnsChanged = JSON.stringify(nextColumns) !== JSON.stringify(this.columns);
      this.columns = nextColumns;
      this.remoteTotalRows = Number(result.totalRows) || 0;
      this.remoteAllRows = Number(result.allRows) || this.remoteTotalRows;
      this.remoteModifiedRows = Number(result.modifiedRows) || 0;
      this.remoteOutlierRows = Number(result.outlierRows) || 0;
      this.remoteTotalPages = Number(result.totalPages) || 1;
      this.remoteStartIndex = (this.currentPage - 1) * this.options.pageSize;
      if (this.currentPage > this.remoteTotalPages) {
        this.currentPage = this.remoteTotalPages;
        return this.loadRemotePage();
      }
      if (columnsChanged) this.renderTableHead();
      this.updateCounters();
      this.renderTableBody();
    } catch (error) {
      if (requestId !== this.remoteRequestId) return;
      if (tbody) tbody.innerHTML = `<tr><td colspan="100" class="grid-empty">${escapeHtml(error.message || 'Không thể tải dữ liệu.')}</td></tr>`;
    }
  }

  setData(rows, columns, auditLogs = []) {
    this.remoteRequestId++;
    this.remoteLoader = null;
    this.remoteTotalRows = null;
    this.remoteAllRows = null;
    this.remoteModifiedRows = null;
    this.remoteOutlierRows = null;
    this.remoteTotalPages = null;
    this.rawRows = Array.isArray(rows) ? rows : [];
    this.columns = Array.isArray(columns) && columns.length > 0 
      ? columns 
      : (this.rawRows.length > 0 ? Object.keys(this.rawRows[0]).filter(k => !k.startsWith('__')) : []);
    this.auditLogs = Array.isArray(auditLogs) ? auditLogs : [];
    this.originalRowNumbers = new WeakMap();
    this.rawRows.forEach((row, index) => {
      if (row && typeof row === 'object') this.originalRowNumbers.set(row, index + 1);
    });
    this.currentPage = 1;

    this.renderTableHead();
    this.applyFilters();
  }

  applyFilters() {
    if (this.remoteLoader) {
      this.scheduleRefresh();
      return;
    }
    let result = [...this.rawRows];

    // Filter by mode
    if (this.filterMode === 'modified') {
      const modifiedRowNums = new Set(this.auditLogs.filter(l => !l.changeReason?.includes('OUTLIER')).map(l => l.rowNumber));
      result = result.filter((_, idx) => modifiedRowNums.has(idx + 1));
    } else if (this.filterMode === 'outlier') {
      result = result.filter(row => {
        return Object.keys(row).some(k => k.startsWith('__outlier_') && row[k] === true);
      });
    }

    // Filter by search
    if (this.searchTerm) {
      result = result.filter(row => {
        return this.columns.some(col => {
          const val = row[col];
          return val !== null && val !== undefined && String(val).toLowerCase().includes(this.searchTerm);
        });
      });
    }

    for (const [col, filter] of Object.entries(this.columnFilters)) {
      if (!filter) continue;
      result = result.filter(row => String(row[col] ?? '').toLocaleLowerCase('vi').includes(filter));
    }

    // Sort
    if (this.sortCol) {
      result.sort((a, b) => {
        let vA = a[this.sortCol];
        let vB = b[this.sortCol];
        if (vA === null || vA === undefined) return 1;
        if (vB === null || vB === undefined) return -1;
        const numA = Number(vA);
        const numB = Number(vB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return this.sortDir === 'asc' ? numA - numB : numB - numA;
        }
        return this.sortDir === 'asc'
          ? String(vA).localeCompare(String(vB), 'vi')
          : String(vB).localeCompare(String(vA), 'vi');
      });
    }

    this.filteredRows = result;
    this.updateCounters();
    this.renderTableBody();
  }

  updateCounters() {
    const countAll = this.container.querySelector('.count-all');
    const countMod = this.container.querySelector('.count-modified');
    const countOut = this.container.querySelector('.count-outlier');
    const totalInfo = this.container.querySelector('.grid-total-info');

    if (countAll) countAll.textContent = (this.remoteAllRows ?? this.rawRows.length).toLocaleString('vi-VN');
    if (countMod) {
      const modSet = new Set(this.auditLogs.filter(l => !l.changeReason?.includes('OUTLIER')).map(l => l.rowNumber));
      countMod.textContent = (this.remoteModifiedRows ?? modSet.size).toLocaleString('vi-VN');
    }
    if (countOut) {
      const outCount = this.rawRows.filter(r => Object.keys(r).some(k => k.startsWith('__outlier_') && r[k] === true)).length;
      countOut.textContent = (this.remoteOutlierRows ?? outCount).toLocaleString('vi-VN');
    }
    if (totalInfo) {
      const total = this.remoteTotalRows ?? this.rawRows.length;
      const shown = this.remoteLoader ? this.rawRows.length : this.filteredRows.length;
      totalInfo.textContent = `${shown.toLocaleString('vi-VN')} / ${total.toLocaleString('vi-VN')} bản ghi`;
    }
  }

  renderTableHead() {
    const thead = this.container.querySelector('thead');
    if (!thead) return;

    const ths = [
      `<th class="grid-th-index">#</th>`,
      ...this.columns.map(col => `
        <th class="grid-th" data-col="${escapeHtml(col)}">
          <div class="grid-th-content">
            <span class="grid-th-title">${escapeHtml(col)}</span>
            <span class="grid-th-sort ${this.sortCol === col ? this.sortDir : ''}">
              <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                <path d="M5 0L9.33 4.5H0.67L5 0Z" fill="currentColor" opacity="${this.sortCol === col && this.sortDir === 'asc' ? '1' : '0.3'}"/>
                <path d="M5 12L0.67 7.5L9.33 7.5L5 12Z" fill="currentColor" opacity="${this.sortCol === col && this.sortDir === 'desc' ? '1' : '0.3'}"/>
              </svg>
            </span>
          </div>
        </th>
      `)
    ].join('');

    const filters = [
      '<th class="grid-th-index"></th>',
      ...this.columns.map(col => `<th class="grid-filter-cell"><input class="grid-column-filter" data-filter-col="${escapeHtml(col)}" type="search" aria-label="Lọc cột ${escapeHtml(col)}" placeholder="Lọc…" value="${escapeHtml(this.columnFilters[col] || '')}"></th>`)
    ].join('');
    thead.innerHTML = `<tr>${ths}</tr><tr class="grid-filter-row">${filters}</tr>`;

    thead.querySelectorAll('.grid-column-filter').forEach(input => {
      input.addEventListener('click', event => event.stopPropagation());
      input.addEventListener('input', () => {
        this.columnFilters[input.dataset.filterCol] = input.value.trim().toLocaleLowerCase('vi');
        this.currentPage = 1;
        this.remoteLoader ? this.scheduleRefresh() : this.applyFilters();
      });
    });

    thead.querySelectorAll('.grid-th').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (this.sortCol === col) {
          this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortCol = col;
          this.sortDir = 'asc';
        }
        this.renderTableHead();
        this.applyFilters();
      });
    });
  }

  renderTableBody() {
    const tbody = this.container.querySelector('tbody');
    if (!tbody) return;

    if (this.filteredRows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${this.columns.length + 1}" class="grid-empty">
            <div class="empty-state-inline">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 21l-4.35-4.35M19 11a8 8 0 11-16 0 8 8 0 0116 0z"/>
              </svg>
              <span>Không tìm thấy bản ghi nào khớp với điều kiện lọc</span>
            </div>
          </td>
        </tr>
      `;
      this.updatePagination();
      return;
    }

    const startIdx = this.remoteLoader ? this.remoteStartIndex : (this.currentPage - 1) * this.options.pageSize;
    const pageRows = this.remoteLoader ? this.filteredRows : this.filteredRows.slice(startIdx, startIdx + this.options.pageSize);

    // Map logs for quick check
    const logMap = new Map();
    for (const log of this.auditLogs) {
      const key = `${log.rowNumber}:${log.columnName}`;
      logMap.set(key, log);
    }

    const trs = pageRows.map((row, rIdx) => {
      const globalRowIdx = row.__sourceRowNumber || this.originalRowNumbers?.get(row) || startIdx + rIdx + 1;
      const isOutlierRow = Object.keys(row).some(k => k.startsWith('__outlier_') && row[k] === true);

      const tds = [
        `<td class="grid-td-index ${isOutlierRow ? 'row-outlier-indicator' : ''}">${globalRowIdx}</td>`,
        ...this.columns.map(col => {
          const val = row[col];
          const isOutlierCol = row[`__outlier_${col}`] === true;
          const logEntry = logMap.get(`${globalRowIdx}:${col}`);
          const isModified = !!logEntry;
          const isEmpty = val === null || val === undefined || (typeof val === 'string' && val.trim() === '');

          let cellClass = 'grid-td';
          let badgeHtml = '';
          let titleAttr = '';

          if (isOutlierCol) {
            cellClass += ' cell-outlier';
            badgeHtml = `<span class="badge-tag badge-tag-amber" title="Giá trị ngoại lai IQR">IQR</span>`;
          } else if (isModified) {
            cellClass += ' cell-modified';
            titleAttr = `title="Đã sửa từ: '${escapeHtml(String(logEntry.beforeValue))}'"`;
          } else if (isEmpty) {
            cellClass += ' cell-empty';
          }

          let displayVal = isEmpty ? '<span class="empty-placeholder">(trống)</span>' : escapeHtml(formatCellValue(val));

          return `
            <td class="${cellClass}" ${titleAttr}>
              <div class="cell-content">
                <button type="button" class="cell-edit-trigger" data-row-number="${globalRowIdx}" data-column-name="${escapeHtml(col)}" aria-label="Sửa ${escapeHtml(col)}, dòng ${globalRowIdx}" title="Nhấp để sửa ô"><span class="cell-value">${displayVal}</span></button>
                ${badgeHtml}
              </div>
            </td>
          `;
        })
      ].join('');

      return `<tr class="grid-tr ${isOutlierRow ? 'tr-has-outlier' : ''}" data-idx="${globalRowIdx}">${tds}</tr>`;
    }).join('');

    tbody.innerHTML = trs;
    if (typeof this.options.onCellEdit === 'function') {
      tbody.querySelectorAll('.cell-edit-trigger').forEach(button => {
        button.addEventListener('click', () => this.startCellEdit(button));
      });
    }
    this.updatePagination();
  }

  startCellEdit(button) {
    const rowNumber = Number(button.dataset.rowNumber);
    const columnName = button.dataset.columnName;
    const row = this.rawRows.find(item => Number(item.__sourceRowNumber) === rowNumber)
      || this.rawRows[rowNumber - (this.remoteStartIndex || 0) - 1];
    if (!row || !columnName) return;
    const before = row[columnName];
    const originalText = before === null || before === undefined ? '' : String(before);
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'cell-edit-input';
    input.value = originalText;
    input.setAttribute('aria-label', `Giá trị ${columnName}, dòng ${rowNumber}`);
    button.replaceWith(input);
    input.focus();
    input.select();

    let finished = false;
    const restore = () => {
      if (!input.isConnected) return;
      const replacement = button.cloneNode(true);
      input.replaceWith(replacement);
      replacement.addEventListener('click', () => this.startCellEdit(replacement));
    };
    const save = async () => {
      if (finished) return;
      finished = true;
      if (input.value === originalText) { restore(); return; }
      const value = typeof before === 'number' ? normalizeNumberInput(input.value) : input.value;
      try {
        input.disabled = true;
        await this.options.onCellEdit({ rowNumber, columnName, value });
      } catch (error) {
        restore();
      }
    };
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); input.blur(); }
      if (event.key === 'Escape') { finished = true; restore(); }
    });
    input.addEventListener('blur', save, { once: true });
  }

  updatePagination() {
    const totalPages = this.remoteTotalPages || (Math.ceil(this.filteredRows.length / this.options.pageSize) || 1);
    const pageInfo = this.container.querySelector('.grid-page-info');
    const pageCurrent = this.container.querySelector('.grid-page-current');
    const prevBtn = this.container.querySelector('.grid-btn-prev');
    const nextBtn = this.container.querySelector('.grid-btn-next');

    if (pageInfo) {
      const total = this.remoteTotalRows ?? this.filteredRows.length;
      pageInfo.textContent = `Trang ${this.currentPage} / ${totalPages} (${total.toLocaleString('vi-VN')} dòng)`;
    }
    if (pageCurrent) pageCurrent.textContent = this.currentPage;
    if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
    if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatCellValue(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') {
    return val.toLocaleString('vi-VN');
  }
  return String(val);
}

function normalizeNumberInput(value) {
  let text = String(value).trim().replace(/\s/g, '');
  if (text.includes(',') && text.includes('.')) {
    const decimal = text.lastIndexOf(',') > text.lastIndexOf('.') ? ',' : '.';
    text = decimal === ',' ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '');
  } else if (text.includes(',')) {
    text = /^-?\d{1,3}(,\d{3})+$/.test(text) ? text.replace(/,/g, '') : text.replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, '');
  }
  return text;
}
