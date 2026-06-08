const { escapeHtml, fetchRecords } = FoodTrackerApi;

function pct(n, total) {
  return total ? Math.round((n / total) * 100) : 0;
}

function countBy(records, key) {
  const o = {};
  records.forEach((r) => {
    const value = r[key] || '-';
    o[value] = (o[value] || 0) + 1;
  });
  return o;
}

function topItems(obj, limit = 6) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function stars(score) {
  score = Math.round(score || 0);
  return '⭐'.repeat(score) + '☆'.repeat(Math.max(0, 5 - score));
}

function sweetClass(s) {
  if (s === 'หวานมาก') return 'red';
  if (s === 'หวานปกติ') return 'yellow';
  return 'green';
}

function barList(title, icon, obj, total) {
  const rows =
    topItems(obj)
      .map(([k, v]) => {
        const percent = pct(v, total);

        return `
          <div class="bar-row">
            <div class="bar-label" title="${escapeHtml(k)}">${escapeHtml(k)}</div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${percent}%"></div>
            </div>
            <div class="bar-val">${v}</div>
          </div>
        `;
      })
      .join('') || '<div class="empty"><p>ไม่มีข้อมูล</p></div>';

  return `
    <div class="card">
      <div class="sec-title">${icon} ${escapeHtml(title)}</div>
      <div class="bar-list">${rows}</div>
    </div>
  `;
}

function advice(avg, waterPct, sweetHigh, fried) {
  let msg = 'โดยรวมทำได้ดี ลองบันทึกอาหารต่อเนื่องเพื่อดูแนวโน้มชัดขึ้น';
  if (avg >= 4.3 && waterPct >= 70) msg = 'เยี่ยมมาก! คะแนนเฉลี่ยดีและเลือกเครื่องดื่มสุขภาพบ่อย';
  else if (sweetHigh > 0 || fried > 0) msg = 'ควรลดอาหารทอดหรือความหวานสูง และเพิ่มน้ำเปล่าหรือนมให้มากขึ้น';
  else if (waterPct < 50) msg = 'ลองเพิ่มน้ำเปล่าหรือนมแทนน้ำหวาน เพื่อช่วยให้คะแนนสุขภาพดีขึ้น';
  return msg;
}

function renderRecent(records) {
  return records
    .slice(0, 8)
    .map(
      (r) => `
        <div class="record">
          <div class="record-top">
            <div class="food">${escapeHtml(r.foodName || '-')}</div>
            <span class="badge meal">${escapeHtml(r.mealType || '-')}</span>
          </div>

          <div class="meta">
            <span class="badge green">👨‍🍳 ${escapeHtml(r.cookingType || '-')}</span>
            <span class="badge blue">🥤 ${escapeHtml(r.drinkType || '-')}</span>
            <span class="badge ${sweetClass(r.sweetnessLevel)}">
              🍬 ${escapeHtml(r.sweetnessLevel || '-')}
            </span>
          </div>

          <div class="date">
            📅 ${escapeHtml(r.thaiDate || r.date || '-')} ·
            ⏰ ${escapeHtml(r.time || '-')} น. ·
            ${stars(r.score || 3)}
          </div>
        </div>
      `
    )
    .join('');
}

function loadDashboard() {
  const sid = document.getElementById('studentId').value.trim();
  fetchRecords(sid, (records) => {
    const el = document.getElementById('dashboardContent');
    if (!records.length) {
      el.innerHTML = '<div class="empty"><div>📊</div><p>ยังไม่มีข้อมูลสำหรับรหัสนี้</p></div>';
      return;
    }

    const total = records.length;
    const avg = records.reduce((a, r) => a + (Number(r.score) || 3), 0) / total;
    const water = records.filter((r) => r.drinkType === 'น้ำเปล่า' || r.drinkType === 'นม').length;
    const sweetHigh = records.filter((r) => r.sweetnessLevel === 'หวานมาก' || r.sweetnessLevel === 'หวานปกติ').length;
    const fried = records.filter((r) => r.cookingType === 'ทอด').length;
    const meal = countBy(records, 'mealType');
    const drink = countBy(records, 'drinkType');
    const sweet = countBy(records, 'sweetnessLevel');
    const cook = countBy(records, 'cookingType');
    const last = records[0];

    el.innerHTML = `
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-num">${total}</div>
          <div class="stat-lbl">รายการทั้งหมด</div>
          <div class="stat-note">${escapeHtml(sid || 'ทุกคน')}</div>
        </div>

        <div class="stat-box">
          <div class="stat-num">${avg.toFixed(1)}</div>
          <div class="stat-lbl">คะแนนเฉลี่ย</div>
          <div class="stat-note">เต็ม 5 ⭐</div>
        </div>

        <div class="stat-box">
          <div class="stat-num">${pct(water, total)}%</div>
          <div class="stat-lbl">ดื่มน้ำดี</div>
          <div class="stat-note">น้ำเปล่า/นม</div>
        </div>

        <div class="stat-box">
          <div class="stat-num">${escapeHtml(last ? last.thaiDate : '-')}</div>
          <div class="stat-lbl">บันทึกล่าสุด</div>
          <div class="stat-note">${last ? escapeHtml(last.time) + ' น.' : ''}</div>
        </div>
      </div>

      <div class="grid">
        <div>
          ${barList('มื้ออาหารที่บันทึก', '🍽️', meal, total)}
          <br />
          ${barList('เครื่องดื่ม', '🥤', drink, total)}
          <br />
          ${barList('วิธีทำอาหาร', '👨‍🍳', cook, total)}
        </div>

        <div>
          <div class="health-box">
            <div class="sec-title">💚 คะแนนสุขภาพรวม</div>
            <div class="score-big">${avg.toFixed(1)}</div>
            <div class="stars">${stars(avg)}</div>
            <p class="advice">${advice(avg, pct(water, total), sweetHigh, fried)}</p>
          </div>

          <br />
          ${barList('ระดับความหวาน', '🍬', sweet, total)}
          <br />

          <div class="card">
            <div class="sec-title">🕒 รายการล่าสุด</div>
            <div class="dashboard-record-list">${renderRecent(records)}</div>
          </div>
        </div>
      </div>
    `;
  });
}

loadDashboard();
