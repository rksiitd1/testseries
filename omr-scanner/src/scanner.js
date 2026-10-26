import { classifyBubbleReadings } from './domain.js';

const OPENCV_URL = 'https://docs.opencv.org/4.10.0/opencv.js';
let cvPromise;

export function loadOpenCv() {
  if (window.cv?.Mat) return Promise.resolve(window.cv);
  if (cvPromise) return cvPromise;
  cvPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = OPENCV_URL;
    script.async = true;
    script.onload = () => {
      if (window.cv?.Mat) resolve(window.cv);
      else if (window.cv?.onRuntimeInitialized !== undefined) window.cv.onRuntimeInitialized = () => resolve(window.cv);
      else reject(new Error('OpenCV could not be initialized.'));
    };
    script.onerror = () => reject(new Error('Image processing library failed to load. You can still enter answers manually.'));
    document.head.append(script);
    const timer = setInterval(() => {
      if (window.cv?.Mat) { clearInterval(timer); resolve(window.cv); }
    }, 150);
    setTimeout(() => { clearInterval(timer); if (!window.cv?.Mat) reject(new Error('Image processing took too long to load.')); }, 20000);
  });
  return cvPromise;
}

function orderCorners(points) {
  const sum = points.map(p => p.x + p.y);
  const diff = points.map(p => p.y - p.x);
  return [points[sum.indexOf(Math.min(...sum))], points[diff.indexOf(Math.min(...diff))], points[sum.indexOf(Math.max(...sum))], points[diff.indexOf(Math.max(...diff))]];
}

function findPaper(cv, source) {
  const gray = new cv.Mat();
  const blur = new cv.Mat();
  const edges = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
  cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
  cv.Canny(blur, edges, 35, 110);
  cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
  let best = null;
  const imageArea = source.rows * source.cols;
  for (let i = 0; i < contours.size(); i++) {
    const contour = contours.get(i);
    const perimeter = cv.arcLength(contour, true);
    const approx = new cv.Mat();
    cv.approxPolyDP(contour, approx, perimeter * 0.025, true);
    const area = Math.abs(cv.contourArea(contour));
    if (approx.rows === 4 && area > imageArea * 0.2 && area > (best?.area || 0)) {
      const points = [];
      for (let j = 0; j < 4; j++) points.push({ x: approx.data32S[j * 2], y: approx.data32S[j * 2 + 1] });
      best = { area, points: orderCorners(points) };
    }
    approx.delete(); contour.delete();
  }
  gray.delete(); blur.delete(); edges.delete(); contours.delete(); hierarchy.delete();
  if (!best) return { page: source.clone(), paperDetected: false };
  const [tl, tr, br, bl] = best.points;
  const width = Math.round(Math.max(Math.hypot(tr.x - tl.x, tr.y - tl.y), Math.hypot(br.x - bl.x, br.y - bl.y)));
  const height = Math.round(Math.max(Math.hypot(bl.x - tl.x, bl.y - tl.y), Math.hypot(br.x - tr.x, br.y - tr.y)));
  const scale = Math.min(1, 1800 / Math.max(width, height));
  const targetWidth = Math.max(400, Math.round(width * scale));
  const targetHeight = Math.max(500, Math.round(height * scale));
  const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, best.points.flatMap(point => [point.x, point.y]));
  const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, targetWidth - 1, 0, targetWidth - 1, targetHeight - 1, 0, targetHeight - 1]);
  const transform = cv.getPerspectiveTransform(srcPts, dstPts);
  const warped = new cv.Mat();
  cv.warpPerspective(source, warped, transform, new cv.Size(targetWidth, targetHeight), cv.INTER_LINEAR, cv.BORDER_REPLICATE);
  srcPts.delete(); dstPts.delete(); transform.delete();
  return { page: warped, paperDetected: true };
}

function groupRows(bubbles, tolerance) {
  const rows = [];
  for (const bubble of [...bubbles].sort((a, b) => a.y - b.y)) {
    let row = rows.find(candidate => Math.abs(candidate.y - bubble.y) <= tolerance);
    if (!row) { row = { y: bubble.y, items: [] }; rows.push(row); }
    row.items.push(bubble);
    row.y = row.items.reduce((sum, item) => sum + item.y, 0) / row.items.length;
  }
  return rows;
}

function splitOptionGroups(items, medianGap) {
  const groups = [];
  let current = [];
  for (let i = 0; i < items.length; i++) {
    if (current.length && items[i].x - items[i - 1].x > Math.max(medianGap * 2.8, items[i].diameter * 2.7)) {
      if (current.length >= 4) groups.push(current);
      current = [];
    }
    current.push(items[i]);
  }
  if (current.length >= 4) groups.push(current);
  const complete = [];
  for (const group of groups) {
    if (group.length % 4 === 0) {
      for (let i = 0; i < group.length; i += 4) complete.push(group.slice(i, i + 4));
    }
  }
  return complete;
}

function readMark(gray, bubble) {
  const radius = Math.max(2, Math.round(bubble.diameter * 0.24));
  const x0 = Math.max(0, bubble.x - radius); const y0 = Math.max(0, bubble.y - radius);
  const x1 = Math.min(gray.cols - 1, bubble.x + radius); const y1 = Math.min(gray.rows - 1, bubble.y + radius);
  let dark = 0; let count = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if ((x - bubble.x) ** 2 + (y - bubble.y) ** 2 <= radius ** 2) {
      count++;
      if (gray.ucharAt(y, x) < 115) dark++;
    }
  }
  return count ? dark / count : 0;
}

export function detectAnswers(cv, image, totalQuestions) {
  let source = cv.imread(image);
  if (Math.max(source.cols, source.rows) > 1800) {
    const reduced = new cv.Mat(); const scale = 1800 / Math.max(source.cols, source.rows);
    cv.resize(source, reduced, new cv.Size(Math.round(source.cols * scale), Math.round(source.rows * scale)), 0, 0, cv.INTER_AREA);
    source.delete(); source = reduced;
  }
  const { page, paperDetected } = findPaper(cv, source);
  source.delete();
  const gray = new cv.Mat(); const blur = new cv.Mat(); const binary = new cv.Mat();
  cv.cvtColor(page, gray, cv.COLOR_RGBA2GRAY);
  cv.GaussianBlur(gray, blur, new cv.Size(3, 3), 0);
  cv.adaptiveThreshold(blur, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 31, 8);
  const contours = new cv.MatVector(); const hierarchy = new cv.Mat();
  cv.findContours(binary, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
  const candidates = [];
  const minSide = Math.max(7, Math.round(Math.min(page.cols, page.rows) * 0.006));
  const maxSide = Math.min(72, Math.round(Math.min(page.cols, page.rows) * 0.055));
  for (let i = 0; i < contours.size(); i++) {
    const contour = contours.get(i); const rect = cv.boundingRect(contour);
    const perimeter = cv.arcLength(contour, true); const area = Math.abs(cv.contourArea(contour));
    const ratio = rect.width / Math.max(1, rect.height);
    const circularity = perimeter ? 4 * Math.PI * area / (perimeter * perimeter) : 0;
    if (rect.width >= minSide && rect.height >= minSide && rect.width <= maxSide && rect.height <= maxSide && ratio >= 0.65 && ratio <= 1.45 && circularity >= 0.45) {
      candidates.push({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, diameter: (rect.width + rect.height) / 2, circularity, darkness: 0 });
    }
    contour.delete();
  }
  contours.delete(); hierarchy.delete();
  const unique = [];
  for (const bubble of candidates.sort((a, b) => b.circularity - a.circularity)) {
    if (!unique.some(other => Math.hypot(other.x - bubble.x, other.y - bubble.y) < Math.min(other.diameter, bubble.diameter) * 0.4)) unique.push(bubble);
  }
  const medianDiameter = unique.length ? unique.map(item => item.diameter).sort((a, b) => a - b)[Math.floor(unique.length / 2)] : minSide;
  const rows = groupRows(unique, Math.max(medianDiameter * 0.68, page.rows * 0.0025));
  const rawGroups = [];
  for (const row of rows) {
    const sorted = row.items.sort((a, b) => a.x - b.x);
    const gaps = sorted.slice(1).map((item, index) => item.x - sorted[index].x).filter(gap => gap < medianDiameter * 4);
    const typicalGap = gaps.length ? gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : medianDiameter * 1.4;
    rawGroups.push(...splitOptionGroups(sorted, typicalGap));
  }
  const questionGroups = rawGroups.sort((a, b) => (a.reduce((sum, item) => sum + item.y, 0) / a.length) - (b.reduce((sum, item) => sum + item.y, 0) / b.length) || a[0].x - b[0].x);
  const centers = questionGroups.map(group => ({ group, x: group.reduce((sum, item) => sum + item.x, 0) / group.length, y: group.reduce((sum, item) => sum + item.y, 0) / group.length })).sort((a, b) => a.x - b.x);
  const lanes = [];
  for (const center of centers) {
    let lane = lanes.find(item => Math.abs(item.x - center.x) <= Math.max(page.cols * 0.14, medianDiameter * 8));
    if (!lane) { lane = { x: center.x, groups: [] }; lanes.push(lane); }
    lane.groups.push(center); lane.x = lane.groups.reduce((sum, item) => sum + item.x, 0) / lane.groups.length;
  }
  let readingOrder = 'row-wise';
  if (lanes.length > 1 && lanes.length <= 4 && lanes.every(lane => lane.groups.length >= 4)) {
    const columnMajor = lanes.sort((a, b) => a.x - b.x).flatMap(lane => lane.groups.sort((a, b) => a.y - b.y).map(item => item.group));
    questionGroups.splice(0, questionGroups.length, ...columnMajor);
    readingOrder = 'column-wise';
  }
  const exactLayout = questionGroups.length === totalQuestions;
  const responses = Array.from({ length: totalQuestions }, (_, index) => ({ selectedOption: null, status: 'uncertain', detectedOptions: [], note: 'Bubble row was not confidently mapped.' }));
  questionGroups.slice(0, totalQuestions).forEach((group, index) => {
    const readings = group.map(bubble => readMark(gray, bubble));
    const detectionConfidence = group.length === 4 && group.every((bubble, i) => bubble.x > (group[i - 1]?.x ?? -Infinity)) && exactLayout;
    responses[index] = classifyBubbleReadings(readings, detectionConfidence);
  });
  const resultCanvas = document.createElement('canvas');
  const scale = Math.min(1, 1000 / Math.max(page.cols, page.rows));
  resultCanvas.width = Math.round(page.cols * scale); resultCanvas.height = Math.round(page.rows * scale);
  cv.imshow(resultCanvas, page);
  const brightness = cv.mean(gray)[0];
  const laplacian = new cv.Mat(); const lapMean = new cv.Mat(); const lapStd = new cv.Mat();
  cv.Laplacian(gray, laplacian, cv.CV_32F);
  cv.meanStdDev(laplacian, lapMean, lapStd);
  const edgeVariation = lapStd.data64F[0] ** 2;
  const qualityHints = [];
  if (brightness < 58) qualityHints.push('Photo is dark; use brighter, even lighting.');
  if (brightness > 225) qualityHints.push('Photo has glare or overexposure; tilt the light away from the sheet.');
  if (!paperDetected) qualityHints.push('Paper edges were not isolated; fit the full page inside the camera frame.');
  if (edgeVariation < 28) qualityHints.push('Photo may be out of focus; hold the camera steady and retake it.');
  const questionPositions = questionGroups.slice(0, totalQuestions).map(group => ({
    centerX: group.reduce((sum, item) => sum + item.x, 0) / group.length / page.cols,
    centerY: group.reduce((sum, item) => sum + item.y, 0) / group.length / page.rows,
    leftX: Math.min(...group.map(item => item.x)) / page.cols
  }));
  const detection = { responses, candidateCount: unique.length, detectedRows: questionGroups.length, expectedRows: totalQuestions, exactLayout, readingOrder, paperDetected, qualityHints, questionPositions, previewWidth: resultCanvas.width, previewHeight: resultCanvas.height, pageAspectRatio: +(page.cols / page.rows).toFixed(3), normalizedPreview: resultCanvas.toDataURL('image/jpeg', 0.82) };
  page.delete(); gray.delete(); blur.delete(); binary.delete(); laplacian.delete(); lapMean.delete(); lapStd.delete();
  return detection;
}

