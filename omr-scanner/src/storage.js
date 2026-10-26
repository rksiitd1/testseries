const ROSTER_KEY = 'shri-omr-roster-v1';
const RESULTS_KEY = 'shri-omr-results-v1';

const cloud = { phase: 'unconfigured', user: null, db: null, auth: null, firestore: null, authApi: null };
let authListener = null;

function readLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
  catch { return fallback; }
}

function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export async function initializeCloud(onChange = () => {}) {
  authListener = onChange;
  const config = window.SHRI_FIREBASE_CONFIG;
  if (!config?.apiKey || !config?.projectId || !config?.appId) { cloud.phase = 'unconfigured'; onChange(getCloudState()); return getCloudState(); }
  try {
    const version = '11.10.0';
    const appApi = await import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`);
    const authApi = await import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`);
    const firestore = await import(`https://www.gstatic.com/firebasejs/${version}/firebase-firestore.js`);
    const app = appApi.getApps().length ? appApi.getApp() : appApi.initializeApp(config);
    cloud.auth = authApi.getAuth(app); cloud.db = firestore.getFirestore(app);
    cloud.authApi = authApi; cloud.firestore = firestore; cloud.phase = 'ready';
    authApi.onAuthStateChanged(cloud.auth, user => { cloud.user = user; onChange(getCloudState()); });
  } catch (error) {
    cloud.phase = 'error'; cloud.error = `Firebase could not start: ${error.message}`;
    onChange(getCloudState());
  }
  return getCloudState();
}

export function getCloudState() {
  return { phase: cloud.phase, user: cloud.user, error: cloud.error || '' };
}

export function loadLocalRoster() {
  return readLocal(ROSTER_KEY, []).filter(student => student && student.studentId && student.name);
}

export async function loadRoster() {
  const local = loadLocalRoster();
  if (!cloud.user || cloud.phase !== 'ready') return local;
  try {
    const { collection, getDocs } = cloud.firestore;
    const snapshot = await getDocs(collection(cloud.db, 'students'));
    const remote = snapshot.docs.map(doc => doc.data()).filter(student => student.studentId && student.name);
    const merged = new Map(local.map(student => [student.studentId, student]));
    remote.forEach(student => merged.set(student.studentId, student));
    const roster = [...merged.values()];
    writeLocal(ROSTER_KEY, roster);
    return roster;
  } catch (error) {
    cloud.error = `Roster is available on this device; cloud read failed: ${error.message}`;
    authListener?.(getCloudState());
    return local;
  }
}

export async function saveRoster(roster) {
  writeLocal(ROSTER_KEY, roster);
  if (!cloud.user || cloud.phase !== 'ready') return { cloudSaved: false };
  try {
    const { doc, setDoc } = cloud.firestore;
    await Promise.all(roster.map(student => setDoc(doc(cloud.db, 'students', encodeURIComponent(student.studentId)), student)));
    return { cloudSaved: true };
  } catch (error) { return { cloudSaved: false, error: error.message }; }
}

export async function loadResults(testId) {
  const local = readLocal(RESULTS_KEY, []);
  if (!cloud.user || cloud.phase !== 'ready') return local.filter(result => result.testId === testId);
  try {
    const { collection, getDocs, query, where } = cloud.firestore;
    const snapshot = await getDocs(query(collection(cloud.db, 'results'), where('testId', '==', testId)));
    const remote = snapshot.docs.map(item => item.data());
    const all = new Map(local.map(item => [item.resultId, item]));
    remote.forEach(item => all.set(item.resultId, item));
    const merged = [...all.values()]; writeLocal(RESULTS_KEY, merged);
    return merged.filter(result => result.testId === testId);
  } catch (error) {
    cloud.error = `Saved results remain on this device; cloud read failed: ${error.message}`;
    authListener?.(getCloudState());
    return local.filter(result => result.testId === testId);
  }
}

export async function saveResult(record) {
  const local = readLocal(RESULTS_KEY, []);
  const next = [...local.filter(item => item.resultId !== record.resultId), record];
  writeLocal(RESULTS_KEY, next);
  if (!cloud.user || cloud.phase !== 'ready') return { cloudSaved: false };
  try {
    const { doc, setDoc, serverTimestamp } = cloud.firestore;
    await setDoc(doc(cloud.db, 'results', record.resultId), { ...record, syncedAt: serverTimestamp() });
    return { cloudSaved: true };
  } catch (error) { return { cloudSaved: false, error: error.message }; }
}

export async function signIn(email, password) {
  if (cloud.phase !== 'ready') throw new Error(cloud.error || 'Firebase is not configured yet.');
  await cloud.authApi.signInWithEmailAndPassword(cloud.auth, email, password);
}

export async function signOut() {
  if (cloud.auth && cloud.authApi) await cloud.authApi.signOut(cloud.auth);
}
