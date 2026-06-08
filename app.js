const {
  canSync,
  decodeId,
  deleteRecord: deleteGoogleRecord,
  encodeId,
  escapeHtml,
  fetchRecords,
  getLocalRecords,
  saveLocalRecords,
  saveRecord: saveGoogleRecord,
} = FoodTrackerApi;

function pad(n) {
  return String(n).padStart(2, '0');
}

function getThaiDate(d) {
  const m = [
    'ม.ค.',
    'ก.พ.',
    'มี.ค.',
    'เม.ย.',
    'พ.ค.',
    'มิ.ย.',
    'ก.ค.',
    'ส.ค.',
    'ก.ย.',
    'ต.ค.',
    'พ.ย.',
    'ธ.ค.',
  ];
  return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function getRadioValue(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : '';
}

function scoreRecord(r) {
  let s = 5;
  if (r.sweetnessLevel === 'หวานมาก') s -= 2;
  else if (r.sweetnessLevel === 'หวานปกติ') s -= 1;
  if (r.drinkType === 'น้ำอัดลม' || r.drinkType === 'ชานม') s -= 2;
  else if (r.drinkType === 'น้ำหวาน') s -= 1;
  if (r.cookingType === 'ทอด') s -= 1;
  if (r.drinkType === 'น้ำเปล่า' || r.drinkType === 'นม') s = Math.min(5, s + 1);
  return Math.max(1, Math.min(5, s));
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

function getErrorMessage(err) {
  return (err && err.message) || String(err || 'ไม่ทราบสาเหตุ');
}

function sweetClass(s) {
  if (s === 'ไม่หวาน') return 'rc-sweet-none';
  if (s === 'หวานน้อย') return 'rc-sweet-low';
  if (s === 'หวานปกติ') return 'rc-sweet-med';
  return 'rc-sweet-high';
}

function stars(score) {
  score = Math.round(score || 0);
  return '⭐'.repeat(score) + '☆'.repeat(Math.max(0, 5 - score));
}

function updateClock() {
  if (!document.getElementById('displayDate')) return;
  const now = new Date();
  document.getElementById('displayDate').textContent = getThaiDate(now);
  document.getElementById('displayTime').textContent = `${pad(now.getHours())}:${pad(now.getMinutes())} น.`;
}

function showPage(name) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('.nav button').forEach((t) => t.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');

  const idx = { log: 0, history: 1, summary: 2 }[name];
  const navButton = document.querySelectorAll('.nav button')[idx];
  if (navButton) navButton.classList.add('active');

  const sid = document.getElementById('studentId').value.trim();
  if (name === 'history') {
    if (sid) document.getElementById('filterStudentId').value = sid;
    loadHistory();
  }
  if (name === 'summary') {
    if (sid) document.getElementById('summaryStudentId').value = sid;
    loadSummary();
  }
}

function saveFoodLog() {
  const sid = document.getElementById('studentId').value.trim();
  const foodName = document.getElementById('foodName').value.trim();

  if (!sid) return showToast('⚠️ กรุณากรอกรหัสนักเรียนก่อนนะ');
  if (!foodName) return showToast('⚠️ กรุณากรอกชื่ออาหารก่อนนะ');

  const now = new Date();
  const r = {
    id: Date.now(),
    studentId: sid,
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    thaiDate: getThaiDate(now),
    mealType: getRadioValue('mealType'),
    foodName,
    cookingType: getRadioValue('cookingType'),
    sweetnessLevel: getRadioValue('sweetnessLevel'),
    drinkType: getRadioValue('drinkType'),
    note: document.getElementById('note').value.trim(),
  };
  r.score = scoreRecord(r);

  const records = getLocalRecords();
  records.unshift(r);
  saveLocalRecords(records);

  const resetForm = () => {
    document.getElementById('foodName').value = '';
    document.getElementById('note').value = '';
  };
  const successMessage = `✅ บันทึกแล้ว! ${r.foodName} ${stars(r.score)}`;

  if (!canSync()) {
    resetForm();
    showToast(successMessage);
    return;
  }

  saveGoogleRecord(r)
    .then(() => {
      resetForm();
      showToast(successMessage);
    })
    .catch((err) => {
      resetForm();
      showToast('บันทึกในเครื่องแล้ว แต่ส่งขึ้น Google ไม่สำเร็จ: ' + getErrorMessage(err));
    });
}

function renderRecord(r) {
  const note = r.note ? `<div class="rc-note">📝 ${escapeHtml(r.note)}</div>` : '';

  return `
    <div class="record-card">
      <button class="rc-del" onclick="deleteFoodRecord('${encodeId(r.id)}')" title="ลบ">🗑️</button>

      <div class="rc-top">
        <div class="rc-food">${escapeHtml(r.foodName || '-')}</div>
        <div class="rc-meal">${escapeHtml(r.mealType || '-')}</div>
      </div>

      <div class="rc-meta">
        <span class="rc-badge rc-cook">👨‍🍳 ${escapeHtml(r.cookingType || '-')}</span>
        <span class="rc-badge rc-drink">🥤 ${escapeHtml(r.drinkType || '-')}</span>
        <span class="rc-badge ${sweetClass(r.sweetnessLevel)}">
          🍬 ${escapeHtml(r.sweetnessLevel || '-')}
        </span>
      </div>

      <div class="rc-dt">
        📅 ${escapeHtml(r.thaiDate || r.date || '-')} ·
        ⏰ ${escapeHtml(r.time || '-')} น. ·
        ${stars(r.score || 3)}
      </div>

      ${note}
    </div>
  `;
}

function loadHistory() {
  const sid = document.getElementById('filterStudentId').value.trim();
  fetchRecords(sid, (records) => {
    const el = document.getElementById('historyList');
    if (!records.length) {
      el.innerHTML = '<div class="empty-state"><div class="es-emoji">🍽️</div><p>ยังไม่มีรายการสำหรับรหัสนี้</p></div>';
      return;
    }
    el.innerHTML = `<div class="record-list">${records.map(renderRecord).join('')}</div>`;
  });
}

function deleteFoodRecord(rawId) {
  const id = decodeId(rawId);
  if (!confirm('ต้องการลบรายการนี้หรือเปล่า?')) return;

  saveLocalRecords(getLocalRecords().filter((r) => String(r.id) !== String(id)));

  if (!canSync()) {
    loadHistory();
    showToast('🗑️ ลบแล้ว');
    return;
  }

  deleteGoogleRecord(id)
    .then(() => {
      loadHistory();
      showToast('🗑️ ลบแล้ว');
    })
    .catch((err) => {
      loadHistory();
      showToast('ลบในเครื่องแล้ว แต่ลบจาก Google ไม่สำเร็จ: ' + getErrorMessage(err));
    });
}

function loadSummary() {
  const sid = document.getElementById('summaryStudentId').value.trim();
  fetchRecords(sid, (records) => {
    const el = document.getElementById('summaryContent');
    if (!records.length) {
      el.innerHTML = '<div class="empty-state"><div class="es-emoji">📊</div><p>ยังไม่มีข้อมูลสำหรับรหัสนี้</p></div>';
      return;
    }

    const avg = (records.reduce((a, r) => a + (Number(r.score) || 3), 0) / records.length).toFixed(1);
    const water = records.filter((r) => r.drinkType === 'น้ำเปล่า' || r.drinkType === 'นม').length;
    const waterPct = Math.round((water / records.length) * 100);
    const count = { cook: {}, drink: {}, sweet: {} };

    records.forEach((r) => {
      count.cook[r.cookingType || '-'] = (count.cook[r.cookingType || '-'] || 0) + 1;
      count.drink[r.drinkType || '-'] = (count.drink[r.drinkType || '-'] || 0) + 1;
      count.sweet[r.sweetnessLevel || '-'] = (count.sweet[r.sweetnessLevel || '-'] || 0) + 1;
    });

    const topCook = Object.entries(count.cook).sort((a, b) => b[1] - a[1])[0];
    const recent = [...new Set(records.slice(0, 10).map((r) => r.foodName).filter(Boolean))].slice(0, 5);

    const recentChips = recent
      .map((f) => `<span class="chip">${escapeHtml(f)}</span>`)
      .join('');

    const drinkChips = Object.entries(count.drink)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `<span class="chip">${escapeHtml(k)} (${v})</span>`)
      .join('');

    const sweetChips = Object.entries(count.sweet)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `<span class="chip">${escapeHtml(k)} (${v})</span>`)
      .join('');

    el.innerHTML = `
      <div class="stats-grid summary-stats-grid">
        <div class="stat-box">
          <div class="stat-num">${records.length}</div>
          <div class="stat-lbl">บันทึกทั้งหมด</div>
        </div>

        <div class="stat-box">
          <div class="stat-num">${avg}</div>
          <div class="stat-lbl">⭐ คะแนนเฉลี่ย</div>
        </div>

        <div class="stat-box">
          <div class="stat-num">${waterPct}%</div>
          <div class="stat-lbl">💧 ดื่มน้ำดี</div>
        </div>

        <div class="stat-box">
          <div class="stat-num">${topCook ? escapeHtml(topCook[0]) : '—'}</div>
          <div class="stat-lbl">👨‍🍳 วิธีทำบ่อยสุด</div>
        </div>
      </div>

      <div class="sec-title">🍜 เมนูล่าสุด</div>
      <div class="chip-group summary-chip-row">${recentChips}</div>

      <div class="sec-title">🥤 เครื่องดื่มที่ดื่มบ่อย</div>
      <div class="chip-group summary-chip-row">${drinkChips}</div>

      <div class="sec-title">🍬 ความหวานที่เลือก</div>
      <div class="chip-group">${sweetChips}</div>
    `;
  });
}

updateClock();
setInterval(updateClock, 30000);
