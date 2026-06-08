const SHEET_NAME = 'FoodLogs';
const SPREADSHEET_ID = '';
const HEADERS = [
  'id',
  'studentId',
  'date',
  'time',
  'thaiDate',
  'mealType',
  'foodName',
  'cookingType',
  'sweetnessLevel',
  'drinkType',
  'note',
  'score',
];

function doGet(e) {
  return handleRequest_(e);
}

function doPost(e) {
  return handleRequest_(e);
}

function saveRecord(record) {
  return saveRecord_(record);
}

function getRecords(studentId) {
  return getRecords_(studentId || '');
}

function deleteRecord(id) {
  return deleteRecord_(id);
}

function handleRequest_(e) {
  try {
    const params = (e && e.parameter) || {};
    const body = parseBody_(e);
    const action = String(params.action || body.action || 'list').toLowerCase();
    let data;

    if (action === 'save') {
      data = saveRecord_(parseRecord_(params.record || body.record || body));
    } else if (action === 'delete') {
      data = deleteRecord_(params.id || body.id);
    } else {
      data = getRecords_(params.studentId || params.sid || body.studentId || '');
    }

    return output_(e, { ok: true, data });
  } catch (err) {
    return output_(e, { ok: false, error: (err && err.message) || String(err) });
  }
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    return {};
  }
}

function parseRecord_(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  return JSON.parse(value);
}

function output_(e, payload) {
  const callback = e && e.parameter && e.parameter.callback;
  const text = callback ? `${callback}(${JSON.stringify(payload)});` : JSON.stringify(payload);
  const mimeType = callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON;
  return ContentService.createTextOutput(text).setMimeType(mimeType);
}

function getSheet_() {
  const ss = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('ไม่พบ Spreadsheet ให้ผูก Apps Script กับ Google Sheet หรือใส่ SPREADSHEET_ID');

  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  ensureHeaders_(sheet);
  return sheet;
}

function ensureHeaders_(sheet) {
  const current = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const hasHeaders = current.some((value) => value);
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return;
  }

  const needsUpdate = HEADERS.some((header, index) => current[index] !== header);
  if (needsUpdate) sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
}

function saveRecord_(record) {
  if (!record || !record.studentId || !record.foodName) {
    throw new Error('ข้อมูลไม่ครบ: studentId และ foodName จำเป็นต้องมี');
  }

  const normalized = normalizeRecord_(record);
  const sheet = getSheet_();
  sheet.appendRow(HEADERS.map((key) => normalized[key] ?? ''));
  return normalized;
}

function getRecords_(studentId) {
  const sid = String(studentId || '').trim();
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  return rows
    .map(rowToRecord_)
    .filter((record) => !sid || String(record.studentId) === sid)
    .reverse();
}

function deleteRecord_(id) {
  const targetId = String(id || '');
  if (!targetId) throw new Error('ไม่พบ id สำหรับลบข้อมูล');

  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { deleted: false };

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i += 1) {
    if (String(ids[i][0]) === targetId) {
      sheet.deleteRow(i + 2);
      return { deleted: true };
    }
  }
  return { deleted: false };
}

function normalizeRecord_(record) {
  return {
    id: record.id || Date.now(),
    studentId: String(record.studentId || '').trim(),
    date: record.date || '',
    time: record.time || '',
    thaiDate: record.thaiDate || '',
    mealType: record.mealType || '',
    foodName: record.foodName || '',
    cookingType: record.cookingType || '',
    sweetnessLevel: record.sweetnessLevel || '',
    drinkType: record.drinkType || '',
    note: record.note || '',
    score: Number(record.score) || 3,
  };
}

function rowToRecord_(row) {
  return HEADERS.reduce((record, key, index) => {
    record[key] = row[index];
    return record;
  }, {});
}
