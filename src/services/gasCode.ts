export const GAS_CODE_GS = `/**
 * Beta Club Points Tracker - High Concurrency Google Apps Script Backend (Code.gs)
 * Hardened for 500+ student chapters with LockService mutex concurrency & Drive slip storage.
 */

const OFFICER_PASSWORD = 'beta4216'; // Customize your officer passcode

const SHEET_NAMES = {
  MEMBERS: 'Members',
  SUBMISSIONS: 'Submissions',
  CONFIG: 'Config',
  EVENTS: 'Events',
  OFFICERS: 'Officers'
};

const DEFAULT_CONFIG = {
  pointCap: 40,
  hoursRate: 1.0,
  clubName: 'National Beta Club',
  academicYear: '2025-2026',
  schoolName: 'Westview High School'
};

const PAGE_SIZE = 50;
const SESSION_SECONDS = 21600; // 6 hours
const LOCK_TIMEOUT_MS = 10000; // Mutex lock timeout for concurrent users

/**
 * Handle HTTP GET Requests (Serves Web App or JSON API)
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
    return handleApiRequest(e.parameter);
  }
  return HtmlService
    .createHtmlOutputFromFile('index')
    .setTitle('Beta Club Points Portal')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Handle HTTP POST Requests (API Submissions with Lock Queue)
 */
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents || '{}');
    const result = handleApiRequest(postData);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * API Dispatcher
 */
function handleApiRequest(params) {
  const action = params.action;
  
  if (action === 'ping') {
    return { success: true, timestamp: new Date().toISOString(), message: 'Beta Club GAS Backend Online' };
  }
  
  if (action === 'getConfig') {
    return { success: true, config: getConfig() };
  }
  
  if (action === 'getMembers') {
    return { success: true, members: getMembers() };
  }
  
  if (action === 'getEvents') {
    return { success: true, events: getEvents() };
  }
  
  if (action === 'submitHours') {
    return submitHoursLocked(params.studentName, params.studentEmail, params.category, params.hours, params.date, params.assignedTo, params.proofBase64, params.comments);
  }
  
  return { success: false, error: 'Unknown action parameter: ' + action };
}

function getSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('ACTIVE_SPREADSHEET_ID');
  if (!id) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error('No active spreadsheet found.');
    id = ss.getId();
    props.setProperty('ACTIVE_SPREADSHEET_ID', id);
  }
  return SpreadsheetApp.openById(id);
}

function ensureSheet(name, headers) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (headers && headers.length) {
    const currentLastColumn = Math.max(sheet.getLastColumn(), 1);
    const firstRow = sheet.getRange(1, 1, 1, currentLastColumn).getValues()[0];
    const headerMissing = sheet.getLastRow() === 0 || String(firstRow[0] || '') === '';
    if (headerMissing) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }
  return sheet;
}

function ensureSheets() {
  ensureSheet(SHEET_NAMES.MEMBERS, [
    'ID', 'First Name', 'Last Name', 'Name', 'Email', 'Grade Level', 'Total Points', 'Student ID', 'Password Data'
  ]);
  ensureSheet(SHEET_NAMES.SUBMISSIONS, [
    'ID', 'Student Name', 'Student Email', 'Category', 'Hours', 'Points',
    'Date', 'Assigned To', 'Proof URL', 'Status', 'Timestamp', 'Comments', 'Officer Notes'
  ]);
  ensureSheet(SHEET_NAMES.CONFIG, ['Key', 'Value']);
  ensureSheet(SHEET_NAMES.EVENTS, ['ID', 'Name', 'Type', 'Description']);
  ensureSheet(SHEET_NAMES.OFFICERS, ['Email', 'Name', 'Title']);
  ensureDefaultConfig();
}

function ensureDefaultConfig() {
  const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CONFIG);
  const data = sheet.getDataRange().getValues();
  const existing = {};
  for (let i = 1; i < data.length; i++) {
    const key = String(data[i][0] || '').trim();
    if (key) existing[key] = data[i][1];
  }
  Object.keys(DEFAULT_CONFIG).forEach(key => {
    if (!(key in existing)) {
      sheet.appendRow([key, DEFAULT_CONFIG[key]]);
    }
  });
}

function getConfig() {
  ensureSheets();
  const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.CONFIG);
  const data = sheet.getDataRange().getValues();
  const cfg = { ...DEFAULT_CONFIG };
  for (let i = 1; i < data.length; i++) {
    const key = String(data[i][0] || '').trim();
    if (key) {
      cfg[key] = data[i][1];
    }
  }
  return cfg;
}

function getMembers() {
  ensureSheets();
  const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.MEMBERS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const members = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[4]) continue; // email check
    members.push({
      id: String(row[0] || ('mem-' + i)),
      firstName: String(row[1] || ''),
      lastName: String(row[2] || ''),
      name: String(row[3] || (row[1] + ' ' + row[2]).trim()),
      email: String(row[4] || '').toLowerCase().trim(),
      gradeLevel: Number(row[5]) || 11,
      totalPoints: Number(row[6]) || 0,
      studentId: String(row[7] || '')
    });
  }
  return members;
}

function getEvents() {
  ensureSheets();
  const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.EVENTS);
  const data = sheet.getDataRange().getValues();
  const events = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[1]) continue;
    events.push({
      id: String(row[0] || ('evt-' + i)),
      name: String(row[1]),
      type: String(row[2] || 'BETA'),
      description: String(row[3] || '')
    });
  }
  return events;
}

/**
 * High-Concurrency Submissions Handler with LockService Mutex
 */
function submitHoursLocked(studentName, studentEmail, category, hours, date, assignedTo, proofBase64, comments) {
  const lock = LockService.getScriptLock();
  try {
    // Wait up to 10 seconds for concurrent writes to finish
    lock.waitLock(LOCK_TIMEOUT_MS);
    ensureSheets();
    
    let proofUrl = '';
    if (proofBase64 && proofBase64.startsWith('data:image')) {
      proofUrl = saveProofToGoogleDrive(studentEmail, proofBase64);
    }
    
    const cfg = getConfig();
    const rate = Number(cfg.hoursRate) || 1.0;
    const pts = Math.round(Number(hours) * rate * 10) / 10;
    const subId = 'sub-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000);
    const timestamp = new Date().toISOString();
    
    const sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.SUBMISSIONS);
    sheet.appendRow([
      subId,
      studentName,
      studentEmail.toLowerCase().trim(),
      category,
      Number(hours),
      pts,
      date,
      assignedTo,
      proofUrl,
      'Pending',
      timestamp,
      comments || '',
      ''
    ]);
    
    return {
      success: true,
      submissionId: subId,
      points: pts,
      proofUrl: proofUrl
    };
  } catch (err) {
    return { success: false, error: 'Server busy: ' + err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Stores student verification photo slips into a dedicated Google Drive folder
 */
function saveProofToGoogleDrive(studentEmail, base64Data) {
  try {
    const folderName = 'Beta Club Verification Slips (Public)';
    const folders = DriveApp.getFoldersByName(folderName);
    let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const contentType = base64Data.substring(5, base64Data.indexOf(';'));
    const bytes = Utilities.base64Decode(base64Data.substring(base64Data.indexOf('base64,') + 7));
    const blob = Utilities.newBlob(bytes, contentType, studentEmail + '_' + new Date().getTime() + '.jpg');
    
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    Logger.log('Drive save error: ' + e);
    return '';
  }
}
`;
