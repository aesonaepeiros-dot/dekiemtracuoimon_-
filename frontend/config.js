// URL gốc của Backend (Spring Boot). Để rỗng khi chạy localhost:8080 (cùng origin).
// Khi deploy frontend lên Vercel, điền URL backend, ví dụ: 'https://datalens-api.onrender.com'
window.DATALENS_BACKEND_URL = '';

(function () {
  var base = (window.DATALENS_BACKEND_URL || '').replace(/\/+$/, '');
  window.DATALENS_API_BASE = base + '/api';
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('a[href^="/h2-console"]').forEach(function (a) {
      a.setAttribute('href', base + a.getAttribute('href'));
    });
  });
})();
