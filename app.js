const API_URL = 'https://script.google.com/macros/s/AKfycbwLbAQhjBLCPa3x9JXppMIV6VL-Qad0QkT4yzKpBA74cI23wtNXx6lCnBF86V1yS2kInQ/exec';

document.addEventListener('DOMContentLoaded', () => {
  updateDateTime();
  setInterval(updateDateTime, 1000);
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
}

function getRadioValue(name) {
  const selected = document.querySelector(`input[name="${name}"]:checked`);
  return selected ? selected.value : '';
}

async function apiRequest(payload) {
  const response = await fetch(API_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  return result;
}

async function saveFoodLog() {
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

    showToast('บันทึกอาหารสำเร็จ', 'success');

    document.getElementById('foodName').value = '';
    document.getElementById('note').value = '';

  } catch (error) {
    console.error(error);
    showToast('เชื่อมต่อฐานข้อมูลไม่สำเร็จ', 'error');
  }
}

async function loadHistory() {
  try {
    const filterStudentId = document.getElementById('filterStudentId').value.trim();
    const studentIdFromMain = document.getElementById('studentId').value.trim();
    const studentId = filterStudentId || studentIdFromMain;

    if (!studentId) {
      showToast('กรุณากรอกรหัสนักเรียน', 'error');
      return;
    }

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
    showToast('โหลดประวัติไม่สำเร็จ', 'error');
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
    <div class="history-card" style="background:#fff;border-radius:18px;padding:16px;margin-bottom:12px;box-shadow:0 8px 20px rgba(0,0,0,.08);">
      <div style="font-weight:700;font-size:18px;">🍜 ${escapeHtml(item.foodName)}</div>
      <div style="margin-top:6px;color:#555;">🎒 รหัสนักเรียน: ${escapeHtml(item.studentId)}</div>
      <div style="margin-top:6px;color:#555;">📅 ${escapeHtml(item.date)} ⏰ ${escapeHtml(item.time)}</div>
      <div style="margin-top:6px;color:#555;">🍽️ มื้อ: ${escapeHtml(item.mealType)} | 👨‍🍳 วิธีทำ: ${escapeHtml(item.cookingType)}</div>
      <div style="margin-top:6px;color:#555;">🍬 ความหวาน: ${escapeHtml(item.sweetnessLevel)} | 🥤 เครื่องดื่ม: ${escapeHtml(item.drinkType)}</div>
      ${item.note ? `<div style="margin-top:8px;color:#555;">📝 ${escapeHtml(item.note)}</div>` : ''}
    </div>
  `).join('');
}

async function loadSummary() {
  try {
    const summaryStudentId = document.getElementById('summaryStudentId').value.trim();
    const studentIdFromMain = document.getElementById('studentId').value.trim();
    const studentId = summaryStudentId || studentIdFromMain;

    if (!studentId) {
      showToast('กรุณากรอกรหัสนักเรียน', 'error');
      return;
    }

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
    showToast('โหลดสรุปไม่สำเร็จ', 'error');
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
    <div style="background:#fff;border-radius:18px;padding:18px;margin-bottom:14px;box-shadow:0 8px 20px rgba(0,0,0,.08);">
      <h2 style="margin-bottom:10px;">📊 สรุปการกินอาหาร</h2>
      <p style="font-size:18px;font-weight:700;">บันทึกทั้งหมด: ${summary.total} รายการ</p>
    </div>

    ${renderCountGroup('🍽️ สรุปตามมื้ออาหาร', summary.byMealType)}
    ${renderCountGroup('👨‍🍳 สรุปตามวิธีทำอาหาร', summary.byCookingType)}
    ${renderCountGroup('🍬 สรุปตามระดับความหวาน', summary.bySweetnessLevel)}
    ${renderCountGroup('🥤 สรุปตามเครื่องดื่ม', summary.byDrinkType)}
  `;
}

function renderCountGroup(title, data) {
  const rows = Object.entries(data || {});

  if (!rows.length) {
    return '';
  }

  return `
    <div style="background:#fff;border-radius:18px;padding:18px;margin-bottom:14px;box-shadow:0 8px 20px rgba(0,0,0,.08);">
      <h3 style="margin-bottom:10px;">${title}</h3>
      ${rows.map(([name, count]) => `
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding:8px 0;">
          <span>${escapeHtml(name)}</span>
          <strong>${count} ครั้ง</strong>
        </div>
      `).join('')}
    </div>
  `;
}

function showToast(message, type) {
  const toast = document.getElementById('toast');

  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.className = 'toast show ' + (type || 'success');

  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
