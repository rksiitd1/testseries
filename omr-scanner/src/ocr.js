const TESSERACT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
let workerPromise;

function loadTesseract() {
  if (window.Tesseract?.createWorker) return Promise.resolve(window.Tesseract);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TESSERACT_URL;
    script.async = true;
    script.onload = () => window.Tesseract?.createWorker ? resolve(window.Tesseract) : reject(new Error('OCR library did not initialize.'));
    script.onerror = () => reject(new Error('OCR library could not be downloaded.'));
    document.head.append(script);
  });
}

async function getWorker() {
  if (!workerPromise) workerPromise = loadTesseract().then(Tesseract => Tesseract.createWorker('eng', 1));
  return workerPromise;
}

export async function readQuestionNumbers(imageDataUrl) {
  const worker = await getWorker();
  await worker.setParameters({ tessedit_char_whitelist: '0123456789', tessedit_pageseg_mode: '11' });
  const { data } = await worker.recognize(imageDataUrl);
  return (data.words || []).map(word => ({
    text: String(word.text || '').trim(),
    confidence: Number(word.confidence) || 0,
    x0: word.bbox?.x0 ?? 0,
    y0: word.bbox?.y0 ?? 0,
    x1: word.bbox?.x1 ?? 0,
    y1: word.bbox?.y1 ?? 0
  })).filter(word => /^\d{1,3}$/.test(word.text) && word.confidence >= 35);
}

export function mapDetectedRowsToQuestionNumbers(positions, words, expectedQuestions) {
  if (!Array.isArray(positions) || positions.length !== expectedQuestions || !words?.length) return null;
  const rowGaps = positions.slice(1).map((item, index) => Math.abs(item.centerY - positions[index].centerY)).filter(gap => gap > 0.001).sort((a, b) => a - b);
  const tolerance = Math.max(0.012, (rowGaps[Math.floor(rowGaps.length / 2)] || 0.035) * 0.42);
  const mapping = [];
  const used = new Set();
  for (const position of positions) {
    const candidate = words.map(word => {
      const number = Number(word.text);
      const wordX = (word.x0 + word.x1) / 2;
      const wordY = (word.y0 + word.y1) / 2;
      return { number, distance: Math.hypot((wordY - position.centerY) * 2, wordX - position.leftX), valid: Number.isInteger(number) && number >= 1 && number <= expectedQuestions && Math.abs(wordY - position.centerY) <= tolerance && wordX < position.leftX + 0.025 };
    }).filter(item => item.valid).sort((a, b) => a.distance - b.distance)[0];
    if (!candidate || used.has(candidate.number)) return null;
    used.add(candidate.number);
    mapping.push(candidate.number);
  }
  return used.size === expectedQuestions ? mapping : null;
}
