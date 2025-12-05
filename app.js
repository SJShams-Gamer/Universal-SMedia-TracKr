app.js

// app.js (ES module)
// Firebase v9+ modular imports

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* ================= Your Firebase config =================
   Keep the config you already have (already present in your repo).
   If you want to use a different project, replace these values.
*/
const firebaseConfig = {
  apiKey: "AIzaSyBHufCbCaG85LGT3Wb6vK7jZTCwrXB4x3U",
  authDomain: "anime-manga-tracker.firebaseapp.com",
  projectId: "anime-manga-tracker",
  storageBucket: "anime-manga-tracker.appspot.com",
  messagingSenderId: "75813545126",
  appId: "1:75813545126:web:6d2537064c1611f69dc067"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* expose for other scripts */
window.auth = auth;
window.db = db;

/* ---------- DOM helpers (optional) ---------- */
const logoutBtn = document.getElementById('logoutBtn');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const myListContainer = document.getElementById('myList');

/* ---------- Auth UI handlers (if pages exist) ---------- */
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.email.value;
    const password = loginForm.password.value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // don't redirect here; onAuthStateChanged will fire
    } catch (err) {
      alert('Login error: ' + err.message);
    }
  });
}

if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = signupForm.email.value;
    const password = signupForm.password.value;
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // account created - onAuthStateChanged will handle next steps
    } catch (err) {
      alert('Signup error: ' + err.message);
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
      // onAuthStateChanged will toggle UI
    } catch (err) {
      console.error('Logout failed', err);
    }
  });
}

/* ========== Firestore Save Helpers (Option C schema) ========== */

/**
 * Convert an incoming item (from AniList/TMDB/custom) into Option C shape.
 * Accepts flexible input shape and returns standardized object.
 */
function normalizeToOptionC(item) {
  // title may be object or string
  const rawTitle = item?.title ?? item?.title?.romaji ?? item?.title?.english ?? item?.name ?? item?.title_romaji ?? '';
  const title = typeof rawTitle === 'object' ? (rawTitle.romaji || rawTitle.english || rawTitle.native || '') : rawTitle;
  const thumbnail = item?.cover || item?.coverImage?.large || item?.coverImage?.medium || item?.thumbnail || item?.image || item?.poster || item?.poster_path || '';
  const format = item?.format || item?.type || item?.mediaFormat || '';
  const score = item?.averageScore ?? item?.meanScore ?? item?.score ?? item?.vote_average ?? null;
  const status = item?.status ?? item?.listStatus ?? null;
  const episodes = item?.episodes ?? null;
  const chapters = item?.chapters ?? null;
  const genres = item?.genres || item?.genre || item?.genre_names || [];

  return {
    title: title || 'Untitled',
    type: (item?.type || format || 'custom').toString().toLowerCase(),
    thumbnail: thumbnail || '',
    format: format || '',
    score: score === undefined ? null : score,
    status: status || null,
    episodes: episodes || null,
    chapters: chapters || null,
    genres: Array.isArray(genres) ? genres : (typeof genres === 'string' ? genres.split(',').map(s => s.trim()) : []),
    timestamp: Date.now()
  };
}

/**
 * Save an array of items to Firestore for the currently signed-in user.
 * Exposed as window.saveImported(items).
 */
window.saveImported = async function (items = []) {
  const user = auth.currentUser;
  if (!user) {
    alert('You must be signed in to save items.');
    return;
  }
  if (!Array.isArray(items)) items = [items];

  try {
    for (const it of items) {
      const docId = `${(it?.type || it?.format || 'item').toString().toLowerCase()}_${(it?.id ?? it?.mal_id ?? Math.random().toString(36).slice(2,9))}`;
      const normalized = normalizeToOptionC({ ...it });
      // store under users/{uid}/mediaList/{docId}
      await setDoc(doc(db, 'users', user.uid, 'mediaList', docId), normalized);
    }
    // refresh UI
    if (typeof loadUserList === 'function') {
      loadUserList(user.uid);
    }
    // small success
    return true;
  } catch (err) {
    console.error('saveImported error', err);
    alert('Save failed: ' + (err.message || err));
    return false;
  }
};

/**
 * Save a single item (convenience wrapper).
 */
window.saveMediaEntry = async function (entry) {
  return window.saveImported([entry]);
};

/* ========== Load / Render User List ========== */

/**
 * Renders user list into #myList. Uses realtime snapshot listener.
 */
let unsubscribeSnapshot = null;
async function loadUserList(uid) {
  if (!uid) return;
  if (!myListContainer) return;

  // detach previous listener if present
  if (typeof unsubscribeSnapshot === 'function') {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }

  const colRef = collection(db, 'users', uid, 'mediaList');
  const q = query(colRef, orderBy('timestamp', 'desc'));
  unsubscribeSnapshot = onSnapshot(q, (snap) => {
    myListContainer.innerHTML = '';
    if (snap.empty) {
      myListContainer.innerHTML = `<p style="color:var(--muted)">No items yet — add from search or create custom entries.</p>`;
      return;
    }
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `
        <img src="${data.thumbnail || 'https://via.placeholder.com/480x270?text=No+Image'}" alt="${escapeHtml(data.title)}" />
        <div class="card-body">
          <h3>${escapeHtml(data.title)}</h3>
          <p style="color:var(--muted)">${escapeHtml((data.format || data.type || '').toString().toUpperCase())} • ${data.score ?? '—'}</p>
          <p style="color:var(--muted); font-size:13px; margin-top:8px">${escapeHtml(data.status || '')}</p>
        </div>
      `;
      myListContainer.appendChild(card);
    });
  }, (err) => {
    console.error('user list snapshot error', err);
  });
}

/* helper to avoid XSS-ish strings in DOM insertion */
function escapeHtml(s = '') {
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

/* Expose loadUserList (so other scripts can call if needed) */
window.loadUserList = loadUserList;

/* ========== Auth State Handling ========== */

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log('User signed in:', user.email);
    document.body.classList.add('signed-in');
    // enable save buttons
    document.querySelectorAll('.small-btn, .save-btn, .add-btn').forEach(b => b.disabled = false);
    // load user list realtime
    loadUserList(user.uid);
  } else {
    console.log('No user signed in');
    document.body.classList.remove('signed-in');
    // disable save buttons until sign in
    document.querySelectorAll('.small-btn, .save-btn, .add-btn').forEach(b => b.disabled = true);
    // clear my list area
    if (myListContainer) myListContainer.innerHTML = `<p style="color:var(--muted)">Sign in to see your list.</p>`;
    // detach snapshot if any
