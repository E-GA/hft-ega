const FoodTrackerApi = (() => {
  const STORAGE_KEY = 'food_tracker_records';
  const GOOGLE_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbw6OhOPzoRBSkguxUG--yWIXWDD0aAZxvEKExcR9aVyAHnVT1XqzzNVRcwa-KN7Utc2QQ/exec';

  function isAppsScript() {
    return typeof google !== 'undefined' && google.script && google.script.run;
  }

  function hasGoogleEndpoint() {
    return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(GOOGLE_SCRIPT_URL);
  }

  function canSync() {
    return isAppsScript() || hasGoogleEndpoint();
  }

function getLocalRecords() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveLocalRecords(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  function filterLocalRecords(studentId) {
    const sid = String(studentId || '').trim();
    return getLocalRecords().filter((record) => !sid || String(record.studentId) === sid);
  }

  function runAppsScript(method, ...args) {
    return new Promise((resolve, reject) => {
      const runner = google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((err) => reject(new Error((err && err.message) || String(err))));

      if (typeof runner[method] !== 'function') {
        reject(new Error(`ไม่พบฟังก์ชัน ${method} ใน Apps Script`));
        return;
      }

      runner[method](...args);
    });
  }

  function requestJsonp(action, params = {}) {
    if (!hasGoogleEndpoint()) {
      return Promise.reject(new Error('ยังไม่ได้ตั้งค่า Google Script URL'));
    }

    return new Promise((resolve, reject) => {
      const callbackName = `foodTrackerCallback_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}`;
      const url = new URL(GOOGLE_SCRIPT_URL);
      const script = document.createElement('script');
      let settled = false;

      url.searchParams.set('action', action);
      url.searchParams.set('callback', callbackName);

      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        const normalizedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        url.searchParams.set(key, normalizedValue);
      });

      const cleanup = () => {
        if (script.parentNode) script.parentNode.removeChild(script);
        delete window[callbackName];
      };

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('Google Script ไม่ตอบกลับภายในเวลาที่กำหนด'));
      }, 12000);

      window[callbackName] = (payload) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        cleanup();

        if (payload && payload.ok === false) {
          reject(new Error(payload.error || 'Google Script error'));
          return;
        }

        resolve(
          payload && Object.prototype.hasOwnProperty.call(payload, 'data') ? payload.data : payload
        );
      };

      script.onerror = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        cleanup();
        reject(new Error('โหลดข้อมูลจาก Google Script ไม่สำเร็จ'));
      };

      script.src = url.toString();
      document.body.appendChild(script);
    });
  }

  function saveRecord(record) {
    if (isAppsScript()) return runAppsScript('saveRecord', record);
    return requestJsonp('save', { record });
  }

  function getRecords(studentId) {
    if (isAppsScript()) return runAppsScript('getRecords', studentId);
    return requestJsonp('list', { studentId }).then((records) =>
      Array.isArray(records) ? records : []
    );
  }

  function deleteRecord(id) {
    if (isAppsScript()) return runAppsScript('deleteRecord', id);
    return requestJsonp('delete', { id });
  }

  function fetchRecords(studentId, callback) {
    if (!canSync()) {
      callback(filterLocalRecords(studentId));
      return;
    }

    getRecords(studentId)
      .then((records) => callback(Array.isArray(records) ? records : []))
      .catch(() => callback(filterLocalRecords(studentId)));
  }

  function escapeHtml(value) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return String(value ?? '').replace(/[&<>"']/g, (char) => map[char]);
  }

  function encodeId(value) {
    return encodeURIComponent(String(value ?? ''));
  }

  function decodeId(value) {
    try {
      return decodeURIComponent(String(value ?? ''));
    } catch (e) {
      return String(value ?? '');
    }
  }

  return {
    STORAGE_KEY,
    GOOGLE_SCRIPT_URL,
    canSync,
    decodeId,
    deleteRecord,
    encodeId,
    escapeHtml,
    fetchRecords,
    filterLocalRecords,
    getLocalRecords,
    getRecords,
    hasGoogleEndpoint,
    isAppsScript,
    saveLocalRecords,
    saveRecord,
  };
})();
