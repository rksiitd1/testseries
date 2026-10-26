import { loadAnswerKey, loadTestCatalog, makeResultRecord, scoreResponses } from './domain.js';
import { detectAnswers, loadOpenCv } from './scanner.js';
import { mapDetectedRowsToQuestionNumbers, readQuestionNumbers } from './ocr.js';
import { getCloudState, initializeCloud, loadResults, loadRoster, saveResult as persistResult, saveRoster, signIn, signOut } from './storage.js';

const $ = id => document.getElementById(id);
const screens = { tests: $('screen-tests'), students: $('screen-students'), scan: $('screen-scan'), result: $('screen-result') };
const state = { catalog: [], roster: [], results: [], test: null, student: null, responses: [], marking: { correct: 1, incorrect: 0 }, showAll: false, saved: false, stream: null };

function setNotice(message, kind = 'info') {
  const node = $('notice'); node.textContent = message; node.className = `notice ${kind}`; node.hidden = !message;
}

function switchScreen(name) {
  stopCamera();
  Object.entries(screens).forEach(([key, screen]) => { screen.hidden = key !== name; });
  setNotice(''); window.scrollTo({ top: 0, behavior: 'smooth' });
}

function formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Date(`${value}T00:00:00+05:30`).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', ...options });
}

function todayIndia() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function showCloud(stateData) {
  const status = $('connection-status');
  const account = $('account-status');
  const help = $('firebase-help');
  const login = $('login-form');
  const logout = $('logout-button');
  const { phase, user, error } = stateData;
  status.className = `connection ${user ? 'online' : phase === 'error' ? 'error' : ''}`;
  status.querySelector('span').textContent = user ? 'Cloud connected' : phase === 'ready' ? 'Sign in to sync' : 'Local device';
  help.textContent = phase === 'unconfigured' ? 'Cloud saving is not configured. Add Firebase web settings and secure Firestore rules as described in README.md.' : phase === 'error' ? error : 'Use your teacher Firebase account. Student data syncs to Firestore only after sign in.';
  login.hidden = phase !== 'ready' || Boolean(user);
  logout.hidden = !user;
  account.textContent = user ? `Signed in as ${user.email || 'teacher account'}` : error || '';
  if (user) loadRoster().then(async roster => {
    state.roster = roster; renderRoster();
    if (roster.length) {
      const synced = await saveRoster(roster);
      if (synced.error) account.textContent = `Signed in as ${user.email || 'teacher account'} · roster sync failed: ${synced.error}`;
    }
  });
}

async function initializeRoster() {
  let roster = await loadRoster();
  try {
    const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
    const response = await fetch(isLocal ? './roster.local.json' : './roster.json', { cache: 'no-store' });
    if (response.ok) {
      const payload = await response.json();
      const seed = Array.isArray(payload.students) ? payload.students : [];
      if (seed.length && seed.every(student => student.studentId && student.name && ['10', '12'].includes(String(student.class)))) {
        const existingIds = new Set(roster.map(student => student.studentId));
        const additions = seed.filter(student => !existingIds.has(student.studentId));
        if (additions.length) { roster = [...roster, ...additions]; await saveRoster(roster); }
      }
    }
  } catch {}
  state.roster = roster; renderRoster();
}

async function loadCatalog(force = false) {
  $('catalog-status').textContent = 'Loading test archive…';
  $('refresh-catalog').disabled = true;
  try {
    state.catalog = await loadTestCatalog(fetch, force);
    const dates = [...new Set(state.catalog.map(test => test.date))].sort().reverse();
    $('footer-test-count').textContent = `${state.catalog.length} CLASS 10 TESTS`;
    $('catalog-status').textContent = `${state.catalog.length} Class 10 and 12 tests · answer key fetched when selected`;
    const picker = $('test-date');
    const previous = picker.value;
    picker.value = dates.includes(previous) ? previous : dates.includes(todayIndia()) ? todayIndia() : dates[0] || '';
    renderTests();
  } catch (error) {
    $('catalog-status').textContent = 'Could not connect to the test archive.';
    setNotice(`${error.message} Check your connection or try refreshing the tests.`, 'error');
    $('test-list').innerHTML = '<div class="empty-state"><h2>Test archive unavailable</h2><p>Connect to the internet and refresh to load the repository catalogue.</p></div>';
  } finally { $('refresh-catalog').disabled = false; }
}

function renderTests() {
  const date = $('test-date').value;
  const tests = state.catalog.filter(test => test.date === date);
  $('test-list').innerHTML = '';
  if (!tests.length) {
    $('test-list').innerHTML = '<div class="empty-state compact"><h2>No Class 10 or 12 tests on this date</h2><p>Choose another archive date.</p></div>';
    return;
  }
  for (const test of tests) {
    const card = document.createElement('article'); card.className = `test-card ${test.answerKeyUrl ? '' : 'unavailable'}`;
    const letter = test.subject.slice(0, 1).toUpperCase();
    const details = document.createElement('div'); details.className = 'test-main';
        details.innerHTML = `<span class="subject-icon">${letter}</span><div><span class="test-meta">${test.subject.toUpperCase()} <i>·</i> CLASS ${test.classNumber}</span><h2>${test.title}</h2><p>${formatDate(test.date)} <span>·</span> ${test.language} medium</p></div>`;
    const action = document.createElement('div'); action.className = 'test-action';
    const keyStatus = document.createElement('span'); keyStatus.className = `key-status ${test.answerKeyUrl ? 'ready' : 'missing'}`;
    keyStatus.textContent = test.answerKeyUrl ? 'HTML key available' : 'Answer key unavailable';
    const button = document.createElement('button'); button.className = 'button primary'; button.type = 'button'; button.textContent = test.answerKeyUrl ? 'Select test →' : 'Unavailable'; button.disabled = !test.answerKeyUrl;
    button.addEventListener('click', async () => {
      button.disabled = true; button.textContent = 'Loading key…';
      try {
        const key = await loadAnswerKey(test);
        if (!key.length || key.length > 100) throw new Error('This test does not have a supported answer key (1–100 questions).');
        state.test = { ...test, key, totalQuestions: key.length };
        $('selected-test-heading').innerHTML = `<p class="eyebrow">CLASS ${state.test.classNumber} · ${state.test.subject.toUpperCase()} · ${state.test.language.toUpperCase()} MEDIUM</p><strong>${state.test.title}</strong><span>${formatDate(state.test.date)} · ${key.length} questions</span>`;
        $('current-test-short').textContent = `${state.test.subject} · ${state.test.chapter}`;
        state.results = await loadResults(state.test.id);
        state.roster = await loadRoster();
        renderRoster(); switchScreen('students');
      } catch (error) { setNotice(`Answer key could not be verified: ${error.message}`, 'error'); }
      finally { button.disabled = false; button.textContent = test.answerKeyUrl ? 'Select test →' : 'Unavailable'; }
    });
    action.append(keyStatus, button); card.append(details, action);
    $('test-list').append(card);
  }
}

function renderRoster() {
  const classNumber = Number(state.test?.classNumber || 10);
  const roster = state.roster.filter(student => student.active !== false && Number(student.class || 10) === classNumber);
  const query = $('student-search').value.trim().toLocaleLowerCase();
  const visible = roster.filter(student => student.name.toLocaleLowerCase().includes(query));
  const expectedCount = classNumber === 10 ? 16 : 18;
  $('student-summary').textContent = `${roster.length} active students (${expectedCount} expected) · ${state.results.length} result${state.results.length === 1 ? '' : 's'} saved for this test`;
  const classCounts = [10, 12].map(value => `${value}: ${state.roster.filter(student => student.active !== false && Number(student.class || 10) === value).length}`).join(' · ');
  $('roster-count').textContent = `${state.roster.length} students loaded · Classes ${classCounts}`;
  $('empty-roster-title').textContent = `Add the Class ${classNumber} roster`;
  $('empty-roster-copy').textContent = `No active Class ${classNumber} students are loaded. Import a CSV with studentId, name, class, and active columns.`;
  $('empty-roster').hidden = roster.length !== 0;
  $('student-list').hidden = roster.length === 0;
  $('student-list').innerHTML = '';
  for (const student of visible) {
    const result = state.results.find(item => item.studentId === student.studentId);
    const button = document.createElement('button'); button.className = `student-row ${result ? 'done' : ''}`; button.type = 'button';
    const initials = student.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
    button.innerHTML = `<span class="avatar">${escapeHtml(initials || '•')}</span><span class="student-info"><strong>${escapeHtml(student.name)}</strong><small>${escapeHtml(student.studentId)}</small></span><span class="student-state ${result ? 'complete' : ''}">${result ? `✓ ${result.verificationStatus === 'needs-review' ? 'Review needed' : 'Scanned'}` : 'Ready to scan'}</span><span class="row-arrow">→</span>`;
    button.addEventListener('click', () => selectStudent(student)); $('student-list').append(button);
  }
  if (roster.length && !visible.length) $('student-list').innerHTML = '<div class="empty-state compact"><p>No student matches that name.</p></div>';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function selectStudent(student, forceRescan = false) {
  const existing = state.results.find(item => item.studentId === student.studentId);
  if (existing && forceRescan && !window.confirm(`${student.name} already has a saved result for this test. Rescan and replace that result?`)) return;
  state.student = student;
  if (existing && !forceRescan) {
    state.responses = existing.responses.map(response => ({ selectedOption: response.selectedOption, status: response.status, detectedOptions: response.detectedOptions || [] }));
    state.marking = { correct: Number(existing.markingScheme?.correct ?? 1), incorrect: Number(existing.markingScheme?.incorrect ?? 0) };
    state.saved = true; state.showAll = false;
    renderResult(); switchScreen('result');
    setNotice(`Loaded the saved result from ${formatDate(existing.scannedAt.slice(0, 10))}.`, 'info');
    return;
  }
  state.student = student; state.saved = false; state.showAll = false;
  $('current-student-name').textContent = student.name;
  $('current-student-class').textContent = `CLASS ${student.class || state.test.classNumber}`;
  $('scan-person').innerHTML = `<strong>${escapeHtml(student.name)}</strong><span>${escapeHtml(state.test.title)}</span>`;
  $('camera-empty').hidden = false; $('camera-empty').querySelector('strong').textContent = 'Place the full answer sheet in view';
  $('camera-empty').querySelector('span').textContent = 'Keep the page flat, bright, and inside the frame.';
  $('capture-canvas').hidden = true; $('camera-video').hidden = true; $('camera-badge').textContent = 'CAMERA OFF';
  $('camera-help').textContent = 'Allow camera access when prompted. The image is processed in this browser and discarded after review.';
  $('processing').hidden = true; $('restart-camera').hidden = true;
  switchScreen('scan'); startCamera();
  loadOpenCv().catch(error => { $('camera-help').textContent = `${error.message} You can still enter answers manually.`; });
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    $('camera-help').textContent = 'Camera access is unavailable in this browser. Upload a photograph or enter answers manually.'; $('restart-camera').hidden = false; return;
  }
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
    const video = $('camera-video'); video.srcObject = state.stream; video.hidden = false; $('camera-empty').hidden = true;
    await video.play(); $('capture-button').disabled = false; $('camera-badge').textContent = 'LIVE CAMERA'; $('restart-camera').hidden = true;
  } catch (error) {
    $('camera-help').textContent = error.name === 'NotAllowedError' ? 'Camera permission was denied. Upload a photo instead, or allow camera access in browser settings.' : 'Could not open the camera. Upload a photograph or enter answers manually.';
    $('restart-camera').hidden = false; $('capture-button').disabled = true;
  }
}

function stopCamera() {
  if (state.stream) { state.stream.getTracks().forEach(track => track.stop()); state.stream = null; }
  const video = $('camera-video'); if (video) { video.pause(); video.srcObject = null; }
  const canvas = $('capture-canvas'); if (canvas) { canvas.width = 0; canvas.height = 0; }
  if ($('capture-button')) $('capture-button').disabled = true;
}

async function processImage(image) {
  $('processing').hidden = false; $('processing-text').textContent = 'Loading local image processing…';
  $('camera-help').textContent = 'Looking for the paper outline and answer bubble grid.';
  try {
    const cv = await loadOpenCv(); $('processing-text').textContent = 'Detecting page, answer rows, and filled bubbles…';
    const detection = detectAnswers(cv, image, state.test.totalQuestions);
    state.responses = detection.responses;
    let ocrNotice = 'Question-number OCR did not produce a complete match; check the detected order manually.';
    let ocrMapped = false;
    if (detection.exactLayout) {
      $('processing-text').textContent = 'Reading printed question numbers…';
      try {
        const words = await readQuestionNumbers(detection.normalizedPreview);
        const mapping = mapDetectedRowsToQuestionNumbers(detection.questionPositions, words.map(word => ({ ...word, x0: word.x0 / detection.previewWidth, x1: word.x1 / detection.previewWidth, y0: word.y0 / detection.previewHeight, y1: word.y1 / detection.previewHeight })), state.test.totalQuestions);
        if (mapping) {
          const ordered = Array(state.test.totalQuestions);
          mapping.forEach((questionNumber, detectedIndex) => { ordered[questionNumber - 1] = state.responses[detectedIndex]; });
          state.responses = ordered;
          ocrMapped = true;
          ocrNotice = 'OCR matched the printed question numbers to the answer key.';
        }
      } catch (error) { ocrNotice = `${error.message} Review question order manually.`; }
    }
    let feedback; let feedbackKind = 'info';
    if (!detection.exactLayout) {
      state.responses = state.responses.map(response => ({ ...response, status: 'uncertain', note: response.note || 'Detected bubble rows do not match the answer key question count.' }));
      feedback = `${detection.qualityHints.length ? `${detection.qualityHints.join(' ')} ` : ''}Found ${detection.detectedRows} likely question rows; this test has ${detection.expectedRows}. Review all answers or enter the sheet manually.`; feedbackKind = 'warning';
    } else {
      const needsReview = state.responses.filter(response => response.status === 'uncertain').length;
      const quality = detection.qualityHints.length ? `${detection.qualityHints.join(' ')} ` : '';
      feedback = `${quality}${ocrNotice} Detected a ${detection.pageAspectRatio > 1 ? 'landscape' : 'portrait'} sheet; geometric order is ${detection.readingOrder === 'column-wise' ? 'down each detected column' : 'across each detected row'}. ${needsReview ? `${needsReview} responses need review.` : 'Check question order and marks before saving.'}`;
      feedbackKind = needsReview || detection.qualityHints.length || !ocrMapped ? 'warning' : 'info';
    }
    $('processing-text').textContent = 'Opening answer review…';
    $('capture-canvas').width = 0; $('capture-canvas').height = 0;
    renderResult(); switchScreen('result'); setNotice(feedback, feedbackKind);
  } catch (error) {
    $('processing').hidden = true;
    $('camera-help').textContent = `${error.message} Enter answers manually if the image is not readable.`;
    setNotice(error.message, 'error');
  }
}

function makeManualResponses() {
  state.responses = Array.from({ length: state.test.totalQuestions }, () => ({ selectedOption: null, status: 'unanswered', detectedOptions: [] }));
  state.showAll = true; renderResult(); switchScreen('result');
}

function scoreNow() {
  state.marking.correct = Number($('mark-correct').value || 0);
  state.marking.incorrect = Number($('mark-incorrect').value || 0);
  return scoreResponses(state.test.key, state.responses, state.marking);
}

function renderResult() {
  stopCamera();
  $('saved-label').hidden = !state.saved;
  $('result-student-name').textContent = state.student.name;
  $('result-caption').textContent = `Class ${state.test.classNumber} · ${state.test.title} · ${formatDate(state.test.date)} · ${state.test.totalQuestions} questions`;
  $('mark-correct').value = String(state.marking.correct); $('mark-incorrect').value = String(state.marking.incorrect);
  const score = scoreNow(); $('score-number').textContent = Number.isInteger(score.totalMarks) ? score.totalMarks : score.totalMarks.toFixed(2);
  $('accuracy-readout').innerHTML = score.accuracy === null ? 'Accuracy appears after a response is confirmed.' : `Accuracy <strong>${(score.accuracy * 100).toFixed(1)}%</strong> of confirmed attempted answers`;
  const metrics = [
    ['CORRECT', score.correctCount, 'correct'], ['INCORRECT', score.incorrectCount, 'incorrect'],
    ['UNANSWERED', score.unansweredCount, 'unanswered'], ['NEEDS REVIEW', score.uncertainCount, 'uncertain']
  ];
  $('metric-grid').innerHTML = metrics.map(([label, value, kind]) => `<div class="metric ${kind}"><span>${label}</span><strong>${value}</strong></div>`).join('');
  $('review-banner').hidden = score.uncertainCount === 0;
  const rows = state.showAll ? score.details : score.details.filter(item => item.status !== 'correct');
  $('toggle-all-questions').textContent = state.showAll ? 'Show flagged only' : `Show all ${score.totalQuestions} questions`;
  $('response-list').innerHTML = rows.length ? rows.map(item => {
    const i = item.questionNumber - 1;
    const reviewChoice = item.status === 'uncertain' ? `<option value="!">Review needed${item.selectedOption ? ` · ${item.selectedOption}?` : ''}</option>` : '';
    const selectedValue = item.status === 'uncertain' ? '!' : item.selectedOption || '';
    return `<div class="response-row ${item.status}"><span class="question-number">${String(item.questionNumber).padStart(2, '0')}</span><div class="response-answer"><strong>${item.status === 'uncertain' ? 'Check this response' : statusLabel(item.status)}</strong><small>Correct answer: ${item.correctOption}${item.detectedOptions?.length > 1 ? ` · Possible marks: ${item.detectedOptions.join(', ')}` : ''}</small></div><label class="answer-select-label"><span>STUDENT</span><select data-response="${i}" aria-label="Student answer for question ${item.questionNumber}">${reviewChoice}<option value="">Blank</option>${'ABCD'.split('').map(option => `<option value="${option}">${option}</option>`).join('')}</select></label><span class="status-tag ${item.status}">${statusLabel(item.status)}</span></div>`;
  }).join('') : '<div class="all-correct"><span>✓</span><div><strong>No incorrect, blank, or uncertain answers</strong><p>Open all questions to verify the full response sheet.</p></div></div>';
  $('response-list').querySelectorAll('select[data-response]').forEach(select => {
    select.value = select.getAttribute('data-selected') || select.value;
    const index = Number(select.dataset.response); const item = score.details[index];
    if (item.status === 'uncertain') select.value = '!';
    else select.value = item.selectedOption || '';
    select.addEventListener('change', () => {
      const option = select.value;
      state.responses[index] = option === '!' ? { ...state.responses[index], status: 'uncertain' } : { selectedOption: option || null, status: option ? 'detected' : 'unanswered', detectedOptions: [] };
      state.saved = false; $('save-result').hidden = false; $('next-student').hidden = true; renderResult();
    });
  });
  $('save-result').hidden = state.saved; $('next-student').hidden = !state.saved;
}

function statusLabel(status) {
  return ({ correct: 'Correct', incorrect: 'Incorrect', unanswered: 'Blank', uncertain: 'Review' })[status] || status;
}

async function saveCurrentResult() {
  const record = makeResultRecord({ student: state.student, test: state.test, responses: state.responses, marking: state.marking });
  const button = $('save-result'); button.disabled = true; button.textContent = 'Saving…';
  const outcome = await persistResult(record);
  state.results = [...state.results.filter(item => item.studentId !== state.student.studentId), record];
  state.saved = true; renderResult(); renderRoster();
  if (outcome.cloudSaved) { setNotice('Result saved securely to Firestore.', 'success'); $('save-note').textContent = 'Saved to your Firebase classroom records.'; }
  else if (outcome.error) { setNotice(`Result saved on this device. Cloud sync failed: ${outcome.error}`, 'warning'); $('save-note').textContent = 'Saved on this device. Sign in or restore the connection to sync to Firebase.'; }
  else { setNotice('Result saved on this device. Firebase cloud saving is not configured or signed in.', 'warning'); $('save-note').textContent = 'Saved on this browser only. Configure Firebase and sign in to keep cloud records.'; }
  button.disabled = false;
}

function goToStudentList() {
  renderRoster(); switchScreen('students');
}

function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
      cell = ''; row = []; if (char === '\r' && text[i + 1] === '\n') i++;
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows.filter(values => values.some(value => value !== ''));
}

async function importRoster(file) {
  const rows = parseCsv(await file.text());
  if (rows.length < 1) { setNotice('That CSV is empty.', 'error'); return; }
  const headings = rows[0].map(value => value.toLowerCase().replace(/[\s-]/g, '_'));
  const hasHeader = headings.some(value => ['name', 'studentname', 'student_name', 'studentid', 'student_id', 'id'].includes(value));
  const columns = hasHeader ? headings : ['name'];
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const indexOf = (...names) => columns.findIndex(value => names.includes(value.replace(/[\s-]/g, '_')) || names.includes(value));
  const nameIndex = indexOf('name', 'studentname', 'student_name');
  if (nameIndex < 0) { setNotice('CSV must have a name column, or contain one name per row.', 'error'); return; }
  const idIndex = indexOf('studentid', 'student_id', 'id'); const classIndex = indexOf('class', 'grade'); const activeIndex = indexOf('active', 'status');
  const roster = dataRows.map(row => {
    const name = row[nameIndex]?.trim(); if (!name) return null;
    const suppliedId = idIndex >= 0 ? row[idIndex]?.trim() : '';
    const prior = state.roster.find(student => student.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase());
    const id = suppliedId || prior?.studentId || `student-${crypto.randomUUID()}`;
    const activeText = activeIndex >= 0 ? (row[activeIndex] || '').toLowerCase() : 'true';
    const classValue = classIndex >= 0 ? String(row[classIndex] || '10').replace(/\D/g, '') : '10';
    return { studentId: id, name, class: classValue, active: !['false', 'inactive', 'no', '0'].includes(activeText) };
  }).filter(Boolean);
  if (!roster.length) { setNotice('No student names were found in that CSV.', 'error'); return; }
  if (roster.some(student => !['10', '12'].includes(student.class))) { setNotice('This scanner currently supports Class 10 and Class 12 rosters only.', 'error'); return; }
  if (new Set(roster.map(student => student.studentId)).size !== roster.length) { setNotice('Student IDs in this CSV must be unique.', 'error'); return; }
  state.roster = roster; const outcome = await saveRoster(roster); renderRoster();
  setNotice(`${roster.length} student${roster.length === 1 ? '' : 's'} imported${outcome.cloudSaved ? ' and synced to Firebase' : ' on this device'}.`, outcome.cloudSaved ? 'success' : 'info');
}

function downloadTemplate() {
  const blob = new Blob(['studentId,name,class,active\n'], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'shri-classes-roster-template.csv'; link.click(); URL.revokeObjectURL(url);
}

function openSettings() { $('settings-panel').hidden = false; }

$('test-date').addEventListener('change', renderTests);
$('refresh-catalog').addEventListener('click', () => loadCatalog(true));
$('back-tests').addEventListener('click', () => switchScreen('tests'));
$('back-students').addEventListener('click', goToStudentList);
$('close-scanner').addEventListener('click', goToStudentList);
$('result-back').addEventListener('click', goToStudentList);
$('student-search').addEventListener('input', renderRoster);
$('settings-toggle').addEventListener('click', openSettings);
$('settings-close').addEventListener('click', () => { $('settings-panel').hidden = true; });
$('roster-file').addEventListener('change', event => { if (event.target.files[0]) importRoster(event.target.files[0]); event.target.value = ''; });
$('import-roster-empty').addEventListener('click', () => { openSettings(); setTimeout(() => $('roster-file').click(), 50); });
$('download-template').addEventListener('click', downloadTemplate);
$('login-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.currentTarget.querySelector('button'); button.disabled = true;
  try { await signIn($('login-email').value, $('login-password').value); $('login-password').value = ''; setNotice('Signed in to Firebase.', 'success'); }
  catch (error) { setNotice(`Sign in failed: ${error.message}`, 'error'); }
  finally { button.disabled = false; }
});
$('logout-button').addEventListener('click', () => signOut().catch(error => setNotice(error.message, 'error')));
$('capture-button').addEventListener('click', () => {
  const video = $('camera-video'); const canvas = $('capture-canvas');
  canvas.width = video.videoWidth; canvas.height = video.videoHeight; canvas.getContext('2d', { willReadFrequently: true }).drawImage(video, 0, 0);
  processImage(canvas);
});
$('photo-file').addEventListener('change', async event => {
  const file = event.target.files?.[0]; if (!file) return;
  try { const url = URL.createObjectURL(file); const image = new Image(); image.onload = () => { processImage(image).finally(() => URL.revokeObjectURL(url)); }; image.onerror = () => { URL.revokeObjectURL(url); setNotice('That photo could not be opened.', 'error'); }; image.src = url; }
  finally { event.target.value = ''; }
});
$('manual-entry').addEventListener('click', makeManualResponses);
$('restart-camera').addEventListener('click', startCamera);
$('toggle-all-questions').addEventListener('click', () => { state.showAll = !state.showAll; renderResult(); });
  $('mark-correct').addEventListener('change', () => { state.saved = false; renderResult(); });
  $('mark-incorrect').addEventListener('change', () => { state.saved = false; renderResult(); });
$('save-result').addEventListener('click', saveCurrentResult);
$('rescan-button').addEventListener('click', () => selectStudent(state.student, true));
$('next-student').addEventListener('click', goToStudentList);

initializeCloud(showCloud);
loadCatalog();
initializeRoster();
