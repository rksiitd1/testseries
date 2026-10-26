export const ARCHIVE_RAW_ROOT = 'https://raw.githubusercontent.com/rksiitd1/testseries/main/';
export const ARCHIVE_BLOB_ROOT = 'https://github.com/rksiitd1/testseries/blob/main/';

const clean = value => value.replace(/\.html$|\.pdf$/i, '');

export function parseArchiveFilename(filename) {
  const basename = filename.split('/').pop();
  const match = clean(basename).match(/^(?:SHRI_)?(\d{4}-\d{2}-\d{2})-(.+?)-Class-(\d+)(?:th)?-(Chapter-\d+|All-Chapters)-(.+)$/i);
  if (!match) return null;
  const [, date, subjectSlug, classNumber, chapterSlug, tail] = match;
  let type;
  let version = 1;
  let language = 'Hindi';
  const paper = tail.match(/^question-paper(?:-(english))?(?:-(\d+))?$/i);
  const answer = tail.match(/^AnswerKey-16-Up-Duplex(?:-(\d+))?$/i);
  if (paper) {
    type = 'paper';
    language = paper[1] ? 'English' : 'Hindi';
    version = Number(paper[2] || 1);
  } else if (answer) {
    type = 'answerKey';
    version = Number(answer[1] || 1);
  } else {
    return null;
  }
  return {
    filename: basename,
    date,
    subject: subjectSlug === 'Social-Science' ? 'Social Science' : subjectSlug.replaceAll('-', ' '),
    subjectSlug,
    classNumber: Number(classNumber),
    chapter: chapterSlug === 'All-Chapters' ? 'All Chapters' : chapterSlug.replace('-', ' '),
    chapterSlug,
    type,
    version,
    language,
    format: /\.html$/i.test(basename) ? 'html' : 'pdf',
    branded: basename.startsWith('SHRI_'),
    identity: [date, subjectSlug, classNumber, chapterSlug, version].join('|')
  };
}

export function parseAnswerKey(html) {
  const declaration = html.match(/\bconst\s+KEY\s*=\s*\[([\s\S]*?)\]\s*;/i);
  if (!declaration) {
    const entries = [...html.matchAll(/<span\b(?=[^>]*\bclass=["'][^"']*\banswer\b[^"']*["'])[^>]*>\s*(\d{1,3})\s*[-–]\s*([A-D])\s*<\/span>/gi)];
    if (!entries.length) throw new Error('Answer key does not contain a readable KEY array or printed answer list.');
    const byNumber = new Map();
    for (const [, numberText, optionText] of entries) {
      const number = Number(numberText); const option = optionText.toUpperCase();
      if (number < 1 || number > 100) throw new Error('Answer key has malformed options or an unsupported question count.');
      if (byNumber.has(number) && byNumber.get(number) !== option) throw new Error(`Conflicting printed answers for question ${number}.`);
      byNumber.set(number, option);
    }
    const count = byNumber.size; const max = Math.max(...byNumber.keys());
    if (count !== max || [...byNumber.keys()].some(number => !byNumber.has(number))) throw new Error('Printed answer list has missing question numbers.');
    return Array.from({ length: count }, (_, index) => byNumber.get(index + 1));
  }
  const body = declaration[1];
  const values = [...body.matchAll(/["']([A-D])["']/gi)].map(match => match[1].toUpperCase());
  const residue = body.replace(/["']([A-D])["']/gi, '').replace(/[\s,]/g, '');
  if (residue || values.length < 1 || values.length > 100) throw new Error('Answer key has malformed options or an unsupported question count.');
  return values;
}

function preferred(files, language) {
  const relevant = files.filter(file => file.format === 'html' && (file.type !== 'paper' || file.language === language));
  return relevant.find(file => file.branded) || relevant[0] || null;
}

export function buildTestCatalog(filenames) {
  const groups = new Map();
  for (const filename of filenames) {
    const file = parseArchiveFilename(filename);
    if (!file || ![10, 12].includes(file.classNumber)) continue;
    if (!groups.has(file.identity)) groups.set(file.identity, { identity: file.identity, date: file.date, subject: file.subject, classNumber: file.classNumber, chapter: file.chapter, version: file.version, papers: [], keys: [] });
    const group = groups.get(file.identity);
    (file.type === 'paper' ? group.papers : group.keys).push(file);
  }
  const tests = [];
  for (const group of groups.values()) {
    const keyHtml = preferred(group.keys, 'Hindi');
    const keyPdf = group.keys.find(file => file.format === 'pdf') || null;
    const paperLanguages = [...new Set(group.papers.map(file => file.language))];
    const languages = paperLanguages.length ? paperLanguages : ['Hindi'];
    const htmlKeys = group.keys.filter(file => file.format === 'html');
    const keyError = keyHtml ? '' : group.keys.length ? 'The answer key is available as a PDF, but no readable HTML key was found.' : 'No answer key found for this test.';
    for (const language of languages) {
      const paperHtml = preferred(group.papers, language);
      const paperPdf = group.papers.find(file => file.format === 'pdf' && file.language === language) || null;
      const id = `${group.identity}|${language}`;
      tests.push({
        id, identity: group.identity, date: group.date, classNumber: group.classNumber,
        subject: group.subject, chapter: group.chapter, version: group.version, language,
        title: `${group.subject} · ${group.chapter}${group.version > 1 ? ` · Paper ${group.version}` : ''}`,
        key: null, totalQuestions: null, keyError,
        answerKeyReference: keyHtml?.filename || keyPdf?.filename || null,
        answerKeyUrl: keyHtml ? `${ARCHIVE_RAW_ROOT}${encodeURIComponent(keyHtml.filename)}` : null,
        answerKeyReferences: htmlKeys.map(file => ({ filename: file.filename, url: `${ARCHIVE_RAW_ROOT}${encodeURIComponent(file.filename)}` })),
        paperReference: paperHtml?.filename || paperPdf?.filename || null,
        paperUrl: (paperHtml || paperPdf) ? `${ARCHIVE_BLOB_ROOT}${encodeURIComponent((paperHtml || paperPdf).filename)}` : null
      });
    }
  }
  return tests.sort((a, b) => b.date.localeCompare(a.date) || a.subject.localeCompare(b.subject) || a.chapter.localeCompare(b.chapter) || a.language.localeCompare(b.language));
}

export async function loadTestCatalog(fetcher = fetch, force = false) {
  const cacheKey = 'shri-omr-catalog-v1';
  if (force) loadedKeys.clear();
  if (!force) {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached?.savedAt && Date.now() - cached.savedAt < 6 * 60 * 60 * 1000 && Array.isArray(cached.tests)) return cached.tests;
    } catch {}
  }
  const response = await fetcher(`${ARCHIVE_RAW_ROOT}papers.json`, { cache: force ? 'no-store' : 'default' });
  if (!response.ok) throw new Error(`Could not load the GitHub archive (${response.status}).`);
  const data = await response.json();
  const filenames = Array.isArray(data.files) ? data.files : [];
  const catalog = buildTestCatalog(filenames);
  try { localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), tests: catalog })); } catch {}
  return catalog;
}

const loadedKeys = new Map();

export async function loadAnswerKey(test, fetcher = fetch) {
  if (loadedKeys.has(test.id)) return loadedKeys.get(test.id);
  if (!test.answerKeyReferences?.length) throw new Error(test.keyError || 'No readable HTML answer key is available.');
  const parsed = await Promise.all(test.answerKeyReferences.map(async file => {
    const response = await fetcher(file.url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Could not fetch answer key ${file.filename} (${response.status}).`);
    return { filename: file.filename, answers: parseAnswerKey(await response.text()) };
  }));
  const signatures = new Set(parsed.map(item => item.answers.join('')));
  if (signatures.size > 1) throw new Error('Conflicting answer keys share this test identity. Ask a teacher to verify the archive.');
  const key = parsed[0].answers;
  loadedKeys.set(test.id, key);
  return key;
}

export function classifyBubbleReadings(readings, layoutConfident = true) {
  if (!readings.length) return { selectedOption: null, status: 'uncertain', detectedOptions: [], note: 'No answer bubbles were detected.' };
  const max = Math.max(...readings); const sorted = [...readings].sort((a, b) => b - a);
  const marked = readings.map((value, index) => value >= Math.max(0.21, max * 0.62) && value >= 0.17 ? index : -1).filter(index => index >= 0);
  if (marked.length === 0 && max < 0.16 && layoutConfident) return { selectedOption: null, status: 'unanswered', detectedOptions: [], note: '' };
  if (marked.length === 1 && layoutConfident && sorted[0] - (sorted[1] || 0) > 0.055 && sorted[0] >= 0.2) return { selectedOption: 'ABCD'[marked[0]], status: 'detected', detectedOptions: ['ABCD'[marked[0]]], note: '' };
  return {
    selectedOption: marked.length === 1 ? 'ABCD'[marked[0]] : null,
    status: 'uncertain',
    detectedOptions: marked.map(index => 'ABCD'[index]),
    note: marked.length > 1 ? 'Multiple bubbles appear marked.' : 'Mark or row position needs review.'
  };
}

export function scoreResponses(answerKey, responses, marking = { correct: 1, incorrect: 0 }) {
  const details = answerKey.map((correctOption, index) => {
    const source = responses[index] || {};
    const selectedOption = source.selectedOption ? String(source.selectedOption).toUpperCase() : null;
    let status = source.status;
    if (status !== 'uncertain') status = !selectedOption ? 'unanswered' : selectedOption === correctOption ? 'correct' : 'incorrect';
    return { questionNumber: index + 1, selectedOption, correctOption, status, detectedOptions: source.detectedOptions || [] };
  });
  const correctCount = details.filter(item => item.status === 'correct').length;
  const incorrectCount = details.filter(item => item.status === 'incorrect').length;
  const unansweredCount = details.filter(item => item.status === 'unanswered').length;
  const uncertainCount = details.filter(item => item.status === 'uncertain').length;
  const totalMarks = correctCount * Number(marking.correct ?? 1) - incorrectCount * Number(marking.incorrect ?? 0);
  return { details, totalQuestions: answerKey.length, correctCount, incorrectCount, unansweredCount, uncertainCount, totalMarks, accuracy: correctCount + incorrectCount ? correctCount / (correctCount + incorrectCount) : null };
}

export function makeResultRecord({ student, test, responses, marking, scannedAt = new Date().toISOString() }) {
  const score = scoreResponses(test.key, responses, marking);
  return {
    resultId: encodeURIComponent(`${student.studentId}__${test.id}`),
    studentId: student.studentId,
    studentName: student.name,
    class: String(student.class || 10),
    testId: test.id,
    date: test.date,
    subject: test.subject,
    title: test.title,
    answerKeyReference: test.answerKeyReference,
    questionPaperReference: test.paperReference,
    totalQuestions: score.totalQuestions,
    markingScheme: { correct: Number(marking.correct ?? 1), incorrect: Number(marking.incorrect ?? 0) },
    scannedAt,
    responses: score.details,
    correctCount: score.correctCount,
    incorrectCount: score.incorrectCount,
    unansweredCount: score.unansweredCount,
    uncertainCount: score.uncertainCount,
    totalMarks: score.totalMarks,
    accuracy: score.accuracy,
    verificationStatus: score.uncertainCount ? 'needs-review' : 'verified'
  };
}
