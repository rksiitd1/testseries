import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildTestCatalog, classifyBubbleReadings, loadAnswerKey, makeResultRecord, parseAnswerKey, parseArchiveFilename, scoreResponses } from '../src/domain.js';
import { mapDetectedRowsToQuestionNumbers } from '../src/ocr.js';

const keyHtml = answers => `<script>const KEY = [${answers.map(answer => `"${answer}"`).join(',')}];</script>`;

test('archive filename parser separates date, subject, class, chapter, language, and version', () => {
  const file = parseArchiveFilename('SHRI_2026-10-17-Mathematics-Class-10th-All-Chapters-question-paper-2.pdf');
  assert.equal(file.date, '2026-10-17');
  assert.equal(file.subject, 'Mathematics');
  assert.equal(file.classNumber, 10);
  assert.equal(file.chapter, 'All Chapters');
  assert.equal(file.version, 2);
  assert.equal(file.type, 'paper');
  assert.equal(file.branded, true);
  assert.equal(parseArchiveFilename('2026-10-08-Hindi-Class-12th-Chapter-1-question-paper.html').classNumber, 12);
  assert.equal(parseArchiveFilename('unrelated.html'), null);
});

test('answer key parser reads the KEY array and rejects missing, empty, oversized, and malformed keys', () => {
  assert.deepEqual(parseAnswerKey(keyHtml(['A', 'd', 'B'])), ['A', 'D', 'B']);
  assert.equal(parseAnswerKey(keyHtml(Array(100).fill('C'))).length, 100);
  assert.throws(() => parseAnswerKey('<script>const ANSWERS=[];</script>'), /KEY array/);
  assert.throws(() => parseAnswerKey(keyHtml([])), /malformed/);
  assert.throws(() => parseAnswerKey(keyHtml(Array(101).fill('A'))), /malformed/);
  assert.throws(() => parseAnswerKey('<script>const KEY=["A", "E"];</script>'), /malformed/);
});

test('answer key parser supports static 16-up HTML answer cards and rejects conflicting duplicates', () => {
  assert.deepEqual(parseAnswerKey('<span class="answer">1-A</span><span class="answer">2–C</span><span class="answer">1-A</span>'), ['A', 'C']);
  assert.throws(() => parseAnswerKey('<span class="answer">1-A</span><span class="answer">3-C</span>'), /missing question numbers/);
  assert.throws(() => parseAnswerKey('<span class="answer">1-A</span><span class="answer">1-B</span>'), /Conflicting printed answers/);
});

test('catalog pairs each paper only with the exact date, class, chapter, and paper version', () => {
  const files = [
    '2026-10-17-Mathematics-Class-10th-All-Chapters-question-paper-2.html',
    '2026-10-17-Mathematics-Class-10th-All-Chapters-question-paper-2.pdf',
    '2026-10-17-Mathematics-Class-10th-All-Chapters-AnswerKey-16-Up-Duplex-2.html',
    '2026-10-18-Mathematics-Class-10th-All-Chapters-question-paper-3.html',
    '2026-10-18-Mathematics-Class-10th-All-Chapters-AnswerKey-16-Up-Duplex-3.html',
    '2026-10-17-Mathematics-Class-12th-All-Chapters-question-paper-2.html'
  ];
  const catalog = buildTestCatalog(files);
  assert.equal(catalog.length, 3);
  assert.equal(catalog[0].version, 3);
  const second = catalog.find(item => item.version === 2);
  assert.match(second.answerKeyReference, /Duplex-2\.html$/);
  assert.equal(second.paperReference, files[0]);
  assert.deepEqual(second.answerKeyReferences.map(item => item.filename), [files[2]]);
  const class12 = catalog.find(item => item.classNumber === 12);
  assert.equal(class12.keyError, 'No answer key found for this test.');
});

test('current repository Class 10 and 12 catalogues pair real answer-key files and parse each key', () => {
  const manifest = JSON.parse(readFileSync(new URL('../../papers.json', import.meta.url), 'utf8'));
  const catalog = buildTestCatalog(manifest.files);
  assert.ok(catalog.length > 0);
  assert.ok(catalog.some(item => item.classNumber === 10));
  assert.ok(catalog.some(item => item.classNumber === 12));
  const keyed = catalog.filter(item => item.answerKeyUrl);
  assert.ok(keyed.length > 0);
  for (const item of keyed) {
    const keys = item.answerKeyReferences.map(reference => parseAnswerKey(readFileSync(new URL(`../../${reference.filename}`, import.meta.url), 'utf8')));
    assert.ok(keys.every(key => key.length >= 1 && key.length <= 100), `${item.id} should have 1–100 answers`);
    assert.equal(new Set(keys.map(key => key.join(''))).size, 1, `${item.id} keys should not conflict`);
    assert.equal(item.totalQuestions, null, 'question count is loaded only after teacher selects a test');
  }
  const staticChemistryKey = parseAnswerKey(readFileSync(new URL('../../2026-10-07-Chemistry-Class-12th-Chapter-1-AnswerKey-16-Up-Duplex.html', import.meta.url), 'utf8'));
  assert.equal(staticChemistryKey.length, 100);
});

test('all app DOM lookups resolve to unique elements in the scanner page', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const declared = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  const used = [...app.matchAll(/\$\('([^']+)'\)/g)].map(match => match[1]);
  const duplicates = declared.filter((id, index) => declared.indexOf(id) !== index);
  const missing = [...new Set(used)].filter(id => !declared.includes(id));
  assert.deepEqual(duplicates, [], `duplicate ids: ${duplicates.join(', ')}`);
  assert.deepEqual(missing, [], `missing ids: ${missing.join(', ')}`);
});

test('selected test loads answer key once and rejects conflicting HTML keys', async () => {
  const file = { filename: 'key.html', url: 'https://example.test/key.html' };
  let requests = 0;
  const fetcher = async () => { requests++; return { ok: true, text: async () => keyHtml(['A', 'B']) }; };
  const key = await loadAnswerKey({ id: `unit-${Date.now()}`, answerKeyReferences: [file] }, fetcher);
  assert.deepEqual(key, ['A', 'B']);
  assert.equal(requests, 1);
  await assert.rejects(loadAnswerKey({ id: `conflict-${Date.now()}`, answerKeyReferences: [file, { ...file, filename: 'other.html', url: 'https://example.test/other.html' }] }, async url => {
    requests++;
    return { ok: true, text: async () => keyHtml(url.endsWith('other.html') ? ['B'] : ['A']) };
  }), /Conflicting answer keys/);
  await assert.rejects(loadAnswerKey({ id: `offline-${Date.now()}`, answerKeyReferences: [file] }, async () => ({ ok: false, status: 503 })), /\(503\)/);
});

test('mark classification keeps blank, faint, multiple, and regular reads distinct', () => {
  assert.equal(classifyBubbleReadings([0.02, 0.03, 0.01, 0.02]).status, 'unanswered');
  assert.deepEqual(classifyBubbleReadings([0.57, 0.04, 0.03, 0.02]).detectedOptions, ['A']);
  assert.equal(classifyBubbleReadings([0.57, 0.04, 0.03, 0.02]).status, 'detected');
  assert.equal(classifyBubbleReadings([0.19, 0.06, 0.04, 0.03]).status, 'uncertain');
  const multiple = classifyBubbleReadings([0.58, 0.47, 0.03, 0.02]);
  assert.equal(multiple.status, 'uncertain');
  assert.deepEqual(multiple.detectedOptions, ['A', 'B']);
  assert.equal(classifyBubbleReadings([0.01, 0.01, 0.01, 0.01], false).status, 'uncertain');
});

test('scoring reconciles 100 questions and keeps uncertain responses out of correct/incorrect', () => {
  const answerKey = Array(100).fill('A');
  const responses = [
    ...Array.from({ length: 70 }, () => ({ selectedOption: 'A' })),
    ...Array.from({ length: 20 }, () => ({ selectedOption: 'B' })),
    ...Array.from({ length: 10 }, () => ({ selectedOption: null, status: 'unanswered' }))
  ];
  const score = scoreResponses(answerKey, responses);
  assert.equal(score.totalQuestions, 100);
  assert.deepEqual([score.correctCount, score.incorrectCount, score.unansweredCount, score.uncertainCount], [70, 20, 10, 0]);
  const uncertain = scoreResponses(answerKey, [{ selectedOption: 'A', status: 'uncertain' }]);
  assert.equal(uncertain.details[0].questionNumber, 1);
  assert.equal(uncertain.details[0].correctOption, 'A');
  assert.equal(uncertain.correctCount, 0);
  assert.equal(uncertain.uncertainCount, 1);
});

test('record construction preserves stable identifiers, answer mapping, and verification status', () => {
  const student = { studentId: 'sc-001', name: 'Student One', class: 10 };
  const testData = { id: '2026-10-27|Hindi|10|Chapter-12|1|Hindi', date: '2026-10-27', subject: 'Hindi', title: 'Hindi · Chapter 12', key: ['B', 'A'], answerKeyReference: 'verified-key.html', paperReference: 'paper.pdf' };
  const record = makeResultRecord({ student, test: testData, responses: [{ selectedOption: 'A' }, { selectedOption: null }], marking: { correct: 1, incorrect: 0 }, scannedAt: '2026-10-27T00:00:00.000Z' });
  assert.equal(record.resultId, 'sc-001__2026-10-27%7CHindi%7C10%7CChapter-12%7C1%7CHindi');
  assert.equal(record.responses[0].questionNumber, 1);
  assert.equal(record.responses[0].correctOption, 'B');
  assert.equal(record.responses[0].status, 'incorrect');
  assert.equal(record.responses[1].status, 'unanswered');
  assert.equal(record.verificationStatus, 'verified');
  const pending = makeResultRecord({ student, test: { ...testData, id: 'pending', key: ['A'] }, responses: [{ selectedOption: 'A', status: 'uncertain' }], marking: {} });
  assert.equal(pending.verificationStatus, 'needs-review');
});

test('OCR labels map detected bubble rows to the matching answer-key question numbers', () => {
  const positions = [
    { centerY: 0.2, leftX: 0.24 },
    { centerY: 0.4, leftX: 0.24 },
    { centerY: 0.6, leftX: 0.24 }
  ];
  const words = [
    { text: '2', confidence: 90, x0: 0.1, x1: 0.12, y0: 0.39, y1: 0.41 },
    { text: '1', confidence: 91, x0: 0.1, x1: 0.12, y0: 0.19, y1: 0.21 },
    { text: '3', confidence: 88, x0: 0.1, x1: 0.12, y0: 0.59, y1: 0.61 }
  ];
  assert.deepEqual(mapDetectedRowsToQuestionNumbers(positions, words, 3), [1, 2, 3]);
  assert.equal(mapDetectedRowsToQuestionNumbers(positions, words.slice(1), 3), null);
});

test('local adapter survives a module reload and replaces duplicate student/test records', async () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value))
  };
  const storage = await import('../src/storage.js');
  const student = { studentId: 'stable-10-01', name: 'Roster Test', class: 10, active: true };
  await storage.saveRoster([student]);
  const result = { resultId: 'stable-10-01__test-one', studentId: student.studentId, testId: 'test-one', totalMarks: 8 };
  await storage.saveResult(result);
  await storage.saveResult({ ...result, totalMarks: 9 });
  assert.deepEqual(storage.loadLocalRoster(), [student]);
  assert.deepEqual(await storage.loadResults('test-one'), [{ ...result, totalMarks: 9 }]);
  const afterRefresh = await import('../src/storage.js?refresh-check');
  assert.deepEqual(afterRefresh.loadLocalRoster(), [student]);
  assert.deepEqual(await afterRefresh.loadResults('test-one'), [{ ...result, totalMarks: 9 }]);
  delete globalThis.localStorage;
});
