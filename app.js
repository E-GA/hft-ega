const API_URL = 'https://script.google.com/macros/s/AKfycbwLbAQhjBLCPa3x9JXppMIV6VL-Qad0QkT4yzKpBA74cI23wtNXx6lCnBF86V1yS2kInQ/exec';
const REQUEST_TIMEOUT_MS = 25000;
const STUDENT_ID_STORAGE_KEY = 'healthyFoodTracker.studentId';

let toastTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  updateDateTime();
  setInterval(updateDateTime, 1000);
  restoreStudentId();
  bindInputEvents();
});

function updateDateTime() {
  const now = new Date();

  const dateText = now.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const timeText = now.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const displayDate = document.getElementById('displayDate');
  const displayTime = document.getElementById('displayTime');

  if (displayDate) displayDate.textContent = dateText;
  if (displayTime) displayTime.textContent = timeText;
}

function showPage(pageName) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });

  const targetPage = document.getElementById('page-' + pageName);
  if (targetPage) {
    targetPage.classList.add('active');
  }

  document.querySelectorAll('.nav button').forEach(button => {
    button.classList.remove('active');
  });

  const navButtons = document.querySelectorAll('.nav button');

  if (pageName === 'log' && navButtons[0]) navButtons[0].classList.add('active');
  if (pageName === 'history' && navButtons[1]) navButtons[1].classList.add('active');
  if (pageName === 'summary' && navButtons[2]) navButtons[2].classList.add('active');

  fillStudentIdFilter(pageName);
}

function restoreStudentId() {
  const storedStudentId = localStorage.getItem(STUDENT_ID_STORAGE_KEY) || '';
  const studentIdInput = document.getElementById('studentId');

  if (studentIdInput && storedStudentId) {
    studentIdInput.value = storedStudentId;
  }
}

function bindInputEvents() {
  const studentIdInput = document.getElementById('studentId');
  const foodNameInput = document.getElementById('foodName');

  if (studentIdInput) {
    studentIdInput.addEventListener('input', () => {
      const studentId = studentIdInput.value.trim();

      if (studentId) {
        localStorage.setItem(STUDENT_ID_STORAGE_KEY, studentId);
      }
    });
  }

  if (foodNameInput) {
    foodNameInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        saveFoodLog();
      }
    });
  }
}

function fillStudentIdFilter(pageName) {
  const studentId = document.getElementById('studentId')?.value.trim();

  if (!studentId) {
    return;
  }

  if (pageName === 'history') {
    const filterStudentId = document.getElementById('filterStudentId');
    if (filterStudentId && !filterStudentId.value.trim()) filterStudentId.value = studentId;
  }

  if (pageName === 'summary') {
    const summaryStudentId = document.getElementById('summaryStudentId');
    if (summaryStudentId && !summaryStudentId.value.trim()) summaryStudentId.value = studentId;
  }
}

function getRadioValue(name) {
  const selected = document.querySelector(`input[name="${name}"]:checked`);
  return selected ? selected.value : '';
}

async function apiRequest(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow',
      credentials: 'omit',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const text = await response.text();
    let result = null;

    try {
      result = JSON.parse(text);
    } catch (error) {
      throw new Error('API ไม่ได้ส่งข้อมูล JSON กลับมา กรุณาตรวจสอบการ Deploy Web App');
    }

    if (!response.ok) {
      throw new Error(result.message || `เชื่อมต่อ API ไม่สำเร็จ (${response.status})`);
    }

    return result;

  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('เชื่อมต่อฐานข้อมูลช้าเกินไป กรุณาลองอีกครั้ง');
    }

    throw error;

  } finally {
    clearTimeout(timer);
  }
}

async function saveFoodLog() {
  const saveButton = document.getElementById('saveButton');

  try {
    const studentId = document.getElementById('studentId').value.trim();
    const foodName = document.getElementById('foodName').value.trim();
    const note = document.getElementById('note').value.trim();

    if (!studentId) {
      showToast('กรุณากรอกรหัสนักเรียน', 'error');
      return;
    }

    if (!foodName) {
      showToast('กรุณากรอกชื่ออาหาร', 'error');
      return;
    }

    localStorage.setItem(STUDENT_ID_STORAGE_KEY, studentId);
    setButtonLoading(saveButton, true, 'กำลังบันทึก...');

    const payload = {
      action: 'create',
      studentId: studentId,
      mealType: getRadioValue('mealType'),
      foodName: foodName,
      cookingType: getRadioValue('cookingType'),
      sweetnessLevel: getRadioValue('sweetnessLevel'),
      drinkType: getRadioValue('drinkType'),
      note: note
    };

    const result = await apiRequest(payload);

    if (!result.ok) {
      showToast(result.message || 'บันทึกไม่สำเร็จ', 'error');
      return;
    }

    showToast(result.message || 'บันทึกอาหารสำเร็จ', 'success');

    document.getElementById('foodName').value = '';
    document.getElementById('note').value = '';
    document.getElementById('foodName').focus();

  } catch (error) {
    console.error(error);
    showToast(error.message || 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ', 'error');

  } finally {
    setButtonLoading(saveButton, false);
  }
}

async function loadHistory() {
  const historyButton = document.getElementById('historyButton');

  try {
    const filterStudentId = document.getElementById('filterStudentId').value.trim();
    const studentIdFromMain = document.getElementById('studentId').value.trim();
    const studentId = filterStudentId || studentIdFromMain;

    if (!studentId) {
      showToast('กรุณากรอกรหัสนักเรียน', 'error');
      return;
    }

    localStorage.setItem(STUDENT_ID_STORAGE_KEY, studentId);
    document.getElementById('filterStudentId').value = studentId;
    setButtonLoading(historyButton, true, 'กำลังโหลด...');

    const result = await apiRequest({
      action: 'history',
      studentId: studentId
    });

    if (!result.ok) {
      showToast(result.message || 'โหลดประวัติไม่สำเร็จ', 'error');
      return;
    }

    renderHistory(result.data || []);

  } catch (error) {
    console.error(error);
    renderError('historyList', 'โหลดประวัติไม่สำเร็จ');
    showToast(error.message || 'โหลดประวัติไม่สำเร็จ', 'error');

  } finally {
    setButtonLoading(historyButton, false);
  }
}

function renderHistory(items) {
  const historyList = document.getElementById('historyList');

  if (!items.length) {
    historyList.innerHTML = `
      <div class="empty-state">
        <div class="es-emoji">📋</div>
        <p>ยังไม่มีประวัติการบันทึกอาหาร</p>
      </div>
    `;
    return;
  }

  historyList.innerHTML = items.map(item => `
    <div class="history-card">
      <div class="history-food">🍜 ${escapeHtml(item.foodName)}</div>
      <div class="history-meta">🎒 รหัสนักเรียน: ${escapeHtml(item.studentId)}</div>
      <div class="history-meta">📅 ${escapeHtml(item.date)} ⏰ ${escapeHtml(item.time)}</div>
      <div class="history-meta">🍽️ มื้อ: ${escapeHtml(item.mealType)} | 👨‍🍳 วิธีทำ: ${escapeHtml(item.cookingType)}</div>
      <div class="history-meta">🍬 ความหวาน: ${escapeHtml(item.sweetnessLevel)} | 🥤 เครื่องดื่ม: ${escapeHtml(item.drinkType)}</div>
      ${item.note ? `<div class="history-note">📝 ${escapeHtml(item.note)}</div>` : ''}
    </div>
  `).join('');
}

async function loadSummary() {
  const summaryButton = document.getElementById('summaryButton');

  try {
    const summaryStudentId = document.getElementById('summaryStudentId').value.trim();
    const studentIdFromMain = document.getElementById('studentId').value.trim();
    const studentId = summaryStudentId || studentIdFromMain;

    if (!studentId) {
      showToast('กรุณากรอกรหัสนักเรียน', 'error');
      return;
    }

    localStorage.setItem(STUDENT_ID_STORAGE_KEY, studentId);
    document.getElementById('summaryStudentId').value = studentId;
    setButtonLoading(summaryButton, true, 'กำลังโหลด...');

    const result = await apiRequest({
      action: 'summary',
      studentId: studentId
    });

    if (!result.ok) {
      showToast(result.message || 'โหลดสรุปไม่สำเร็จ', 'error');
      return;
    }

    renderSummary(result.summary);

  } catch (error) {
    console.error(error);
    renderError('summaryContent', 'โหลดสรุปไม่สำเร็จ');
    showToast(error.message || 'โหลดสรุปไม่สำเร็จ', 'error');

  } finally {
    setButtonLoading(summaryButton, false);
  }
}

function renderSummary(summary) {
  const summaryContent = document.getElementById('summaryContent');

  if (!summary || summary.total === 0) {
    summaryContent.innerHTML = `
      <div class="empty-state">
        <div class="es-emoji">📊</div>
        <p>ยังไม่มีข้อมูลสำหรับสรุป</p>
      </div>
    `;
    return;
  }

  summaryContent.innerHTML = `
    <div class="summary-card">
      <h2>📊 สรุปการกินอาหาร</h2>
      <p class="summary-total">บันทึกทั้งหมด: ${summary.total} รายการ</p>
    </div>

    ${renderCountGroup('🍽️ สรุปตามมื้ออาหาร', summary.byMealType)}
    ${renderCountGroup('👨‍🍳 สรุปตามวิธีทำอาหาร', summary.byCookingType)}
    ${renderCountGroup('🍬 สรุปตามระดับความหวาน', summary.bySweetnessLevel)}
    ${renderCountGroup('🥤 สรุปตามเครื่องดื่ม', summary.byDrinkType)}
  `;
}

function renderCountGroup(title, data) {
  const rows = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);

  if (!rows.length) {
    return '';
  }

  return `
    <div class="summary-card">
      <h3>${title}</h3>
      ${rows.map(([name, count]) => `
        <div class="summary-row">
          <span>${escapeHtml(name)}</span>
          <strong>${count} ครั้ง</strong>
        </div>
      `).join('')}
    </div>
  `;
}

function renderError(containerId, message) {
  const container = document.getElementById(containerId);

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="empty-state error-state">
      <div class="es-emoji">⚠️</div>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function setButtonLoading(button, isLoading, loadingText) {
  if (!button) {
    return;
  }

  if (!button.dataset.defaultText) {
    button.dataset.defaultText = button.textContent.trim();
  }

  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : button.dataset.defaultText;
}

function showToast(message, type) {
  const toast = document.getElementById('toast');

  if (!toast) {
    alert(message);
    return;
  }

  if (toastTimer) {
    clearTimeout(toastTimer);
  }

  toast.textContent = message;
  toast.className = 'toast show ' + (type || 'success');

  toastTimer = setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
