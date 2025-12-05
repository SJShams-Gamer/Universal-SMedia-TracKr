// app.js (ES module)
// Firebase v9 modular imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* ========== Your Firebase config (already provided) ========== */
const firebaseConfig = {
  apiKey: "AIzaSyBHufCbCaG85LGT3Wb6vK7jZTCwrXB4x3U",
  authDomain: "anime-manga-tracker.firebaseapp.com",
  projectId: "anime-manga-tracker",
  storageBucket: "anime-manga-tracker.firebasestorage.app",
  messagingSenderId: "75813545126",
  appId: "1:75813545126:web:6d2537064c1611f69dc067",
  measurementId: "G-W1YHBHQKL9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* Helper: $ */
const $ = id => document.getElementById(id);

/* Determine page (login/index) */
const isLoginPage = !!$('login-email') || !!$('login-btn');
const isIndexPage = !!$('my-list') || !!$('logout-btn');

/* -------- LOGIN PAGE -------- */
if (isLoginPage) {
  const loginEmail = $('login-email');
  const loginPassword = $('login-password');
  const loginBtn = $('login-btn');
  const signupEmail = $('signup-email');
  const signupPassword = $('signup-password');
  const signupBtn = $('signup-btn');
  const showSignup = $('show-signup');
  const showLogin = $('show-login');
  const authMsg = $('auth-msg');

  if (showSignup) showSignup.addEventListener('click', () => {
    $('login-form').style.display = 'none';
    $('signup-form').style.display = 'block';
    authMsg.textContent = '';
  });
  if (showLogin) showLogin.addEventListener('click', () => {
    $('signup-form').style.display = 'none';
    $('login-form').style.display = 'block';
    authMsg.textContent = '';
  });

  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      try {
        authMsg.textContent = 'Signing in...';
        await signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value);
      } catch (err) {
        authMsg.textContent = err.message;
      }
    });
  }

  if (signupBtn) {
    signupBtn.addEventListener('click', async () => {
      try {
        authMsg.textContent = 'Creating account...';
        await createUserWithEmailAndPassword(auth, signupEmail.value, signupPassword.value);
      } catch (err) {
        authMsg.textContent = err.message;
      }
    });
  }

  onAuthStateChanged(auth, (user) => {
    if (user) window.location.href = 'index.html';
  });
}

/* -------- INDEX PAGE (Firestore + import) -------- */
if (isIndexPage) {
  let currentUser = null;

  const logoutBtn = $('logout-btn');
  const myListEl = $('my-list');
  const searchInput = $('search-input');
  const typeFilter = $('type-filter');

  const addCustomBtn = $('add-custom-btn');
  const entryModal = $('entry-modal');
  const importModal = $('import-modal');
  const saveEntryBtn = $('save-entry-btn');
  const openImportModalBtn = $('open-import-modal') || $('btn-import') || $('btn-import-open');
  const importAnilistBtn = $('import-anilist-btn');
  const importMalBtn = $('import-mal-btn');
  const importJsonFile = $('import-json-file');
  const importAnilistUsername = $('import-anilist-username');
  const importAnilistType = $('import-anilist-type');
  const importMalUsername = $('import-mal-username');
  const importMalType = $('import-mal-type');

  let myList = [];
  let editingId = null;

  // modal helpers
  function openModal(modalEl){ modalEl?.setAttribute('aria-hidden','false'); }
  function closeModal(modalEl){ modalEl?.setAttribute('aria-hidden','true'); }
  document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', e => {
    const parent = e.target.closest('.modal');
    closeModal(parent);
  }));
  document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', (e)=> { if (e.target===m) closeModal(m); }));

  // auth state
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    currentUser = user;
    loadMyList();
  });

  if (logoutBtn) logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'login.html';
  });

  // add custom
  if (addCustomBtn) addCustomBtn.addEventListener('click', () => {
    editingId = null;
    $('modal-title').textContent = 'Add Custom Entry';
    $('entry-title').value = '';
    $('entry-type').value = 'custom';
    $('entry-thumbnail').value = '';
    $('entry-status').value = '';
    $('entry-notes').value = '';
    openModal(entryModal);
  });

  // save entry
  if (saveEntryBtn) saveEntryBtn.addEventListener('click', async ()=>{
    const title = $('entry-title').value.trim();
    const type = $('entry-type').value;
    const cover = $('entry-thumbnail').value.trim() || null;
    const status = $('entry-status').value.trim() || null;
    const notes = $('entry-notes').value.trim() || null;
    if(!title) return alert('Title required');
    if(!currentUser) return alert('Sign in first');

    if(editingId){
      const docRef = doc(db, 'users', currentUser.uid, 'list', editingId);
      await updateDoc(docRef, { title, type, cover, status, notes, updatedAt: Date.now() });
    } else {
      const id = Date.now().toString();
      const docRef = doc(db, 'users', currentUser.uid, 'list', id);
      await setDoc(docRef, { title, type, cover, status, notes, custom: true, createdAt: Date.now(), updatedAt: Date.now() });
    }
    closeModal(entryModal);
    await loadMyList();
  });

  // load list
  async function loadMyList(){
    if(!currentUser) return;
    const col = collection(db, 'users', currentUser.uid, 'list');
    const q = query(col);
    const snap = await getDocs(q);
    myList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderList();
  }

  // render list with search & filter
  function renderList(){
    myListEl.innerHTML = '';
    const search = (searchInput?.value || '').toLowerCase();
    const type = (typeFilter?.value || 'all').toLowerCase();
    const filtered = myList.filter(item => {
      const title = (item.title||'').toLowerCase();
      const matchesSearch = title.includes(search);
      const matchesType = type === 'all' || (item.type||'').toLowerCase()===type;
      return matchesSearch && matchesType;
    });
    if(filtered.length === 0){
      myListEl.innerHTML = `<p style="color:var(--muted)">No items found.</p>`;
      return;
    }
    filtered.forEach(item => {
      const card = document.createElement('article');
      card.className = 'card';
      const img = document.createElement('img');
      img.src = item.cover || 'https://via.placeholder.com/640x360?text=No+Image';
      img.alt = item.title || 'cover';
      const body = document.createElement('div');
      body.className = 'card-body';
      const h3 = document.createElement('h3'); h3.textContent = item.title || 'Untitled';
      const p = document.createElement('p'); p.textContent = item.status ? item.status : (item.notes ? item.notes.slice(0,120) : '');
      const actions = document.createElement('div'); actions.className = 'actions';
      const editBtn = document.createElement('button'); editBtn.className='small-btn'; editBtn.textContent='Edit';
      editBtn.addEventListener('click', ()=> openEdit(item));
      const delBtn = document.createElement('button'); delBtn.className='small-btn'; delBtn.textContent='Delete';
      delBtn.addEventListener('click', ()=> deleteItem(item.id));
      actions.append(editBtn, delBtn);
      body.append(h3, p, actions);
      card.append(img, body);
      myListEl.appendChild(card);
    });
  }

  if (searchInput) searchInput.addEventListener('input', renderList);
  if (typeFilter) typeFilter.addEventListener('change', renderList);

  function openEdit(item){
    editingId = item.id;
    $('modal-title').textContent = 'Edit Entry';
    $('entry-title').value = item.title || '';
    $('entry-type').value = item.type || 'custom';
    $('entry-thumbnail').value = item.cover || '';
    $('entry-status').value = item.status || '';
    $('entry-notes').value = item.notes || '';
    openModal(entryModal);
  }

  async function deleteItem(id){
    if(!confirm('Delete this entry?')) return;
    await deleteDoc(doc(db, 'users', currentUser.uid, 'list', id));
    await loadMyList();
  }

  // Export JSON
  const exportBtn = $('btn-export');
  if (exportBtn) exportBtn.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(myList, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'my_list.json'; a.click(); URL.revokeObjectURL(url);
  });

  // open import modal
  const openImport = $('open-import-modal') || $('btn-import-open') || $('btn-import');
  if(openImport) openImport.addEventListener('click', ()=> openModal(importModal));
  const importClose = $('import-close'); if(importClose) importClose.addEventListener('click', ()=> closeModal(importModal));

  /* ======= AniList import (GraphQL) ======= */
  async function importFromAniList(username, mediaType = 'ANIME') {
    if(!username) throw new Error('No AniList username');
    const q = `
      query ($userName: String, $type: MediaType) {
        MediaListCollection(userName: $userName, type: $type) {
          lists {
            entries {
              media {
                title { romaji english native }
                coverImage { large medium }
                type
              }
              status
            }
          }
        }
      }
    `;
    const resp = await fetch('https://graphql.anilist.co', {
      method:'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ query: q, variables: { userName: username, type: mediaType } })
    });
    if(!resp.ok) throw new Error('AniList error: ' + resp.status);
    const json = await resp.json();
    const lists = json.data?.MediaListCollection?.lists || [];
    const items = [];
    for(const list of lists){
      for(const entry of (list.entries||[])){
        const media = entry.media;
        if(!media) continue;
        items.push({
          title: media.title?.romaji || media.title?.english || media.title?.native || 'Untitled',
          type: (media.type||'ANIME').toString().toLowerCase(),
          cover: media.coverImage?.large || media.coverImage?.medium || null,
          status: entry.status || null,
          source: 'anilist',
          importedAt: Date.now()
        });
      }
    }
    return items;
  }

  /* ======= MAL import via Jikan ======= */
  async function importFromMAL(username, mediaType='anime'){
    if(!username) throw new Error('No MAL username');
    const url = `https://api.jikan.moe/v4/users/${encodeURIComponent(username)}/${mediaType}list`;
    const resp = await fetch(url);
    if(!resp.ok) throw new Error('Jikan error: ' + resp.status);
    const json = await resp.json();
    const data = json.data || [];
    const items = data.map(entry => {
      const e = entry.entry || entry;
      return {
        title: e.title || e.name || 'Untitled',
        type: mediaType,
        cover: e.images?.jpg?.image_url || null,
        status: entry.status || null,
        source: 'mal',
        importedAt: Date.now()
      };
    });
    return items;
  }

  // hook import buttons
  if(importAnilistBtn) importAnilistBtn.addEventListener('click', async ()=>{
    const username = importAnilistUsername.value.trim();
    const t = importAnilistType.value || 'ANIME';
    if(!username) return alert('Enter AniList username');
    try{
      importAnilistBtn.disabled=true; importAnilistBtn.textContent='Importing...';
      const items = await importFromAniList(username, t);
      await saveImported(items);
      alert(`Imported ${items.length} items from AniList.`);
      importAnilistUsername.value='';
    }catch(err){ console.error(err); alert('AniList import failed: '+err.message); }
    finally{ importAnilistBtn.disabled=false; importAnilistBtn.textContent='Import AniList'; }
  });

  if(importMalBtn) importMalBtn.addEventListener('click', async ()=>{
    const username = importMalUsername.value.trim();
    const t = importMalType.value || 'anime';
    if(!username) return alert('Enter MAL username');
    try{
      importMalBtn.disabled=true; importMalBtn.textContent='Importing...';
      const items = await importFromMAL(username, t);
      await saveImported(items);
      alert(`Imported ${items.length} items from MAL.`);
      importMalUsername.value='';
    }catch(err){ console.error(err); alert('MAL import failed: '+err.message); }
    finally{ importMalBtn.disabled=false; importMalBtn.textContent='Import MAL (Jikan)'; }
  });

  // json file import
  if(importJsonFile) importJsonFile.addEventListener('change', async (ev)=>{
    const f = ev.target.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const j = JSON.parse(e.target.result);
        let items = [];
        if(Array.isArray(j)) items = j;
        else if(typeof j==='object') items = Object.values(j);
        else throw new Error('Invalid JSON');
        await saveImported(items);
        alert(`Imported ${items.length} items from JSON`);
      } catch(err){ console.error(err); alert('JSON import failed: '+err.message); }
      finally { importJsonFile.value=''; }
    };
    reader.readAsText(f);
  });

  // save imported items (merge)
  async function saveImported(items){
    if(!currentUser) throw new Error('Sign in first');
    for(const it of items){
      const id = Date.now().toString() + Math.random().toString(36).slice(2,8);
      const docRef = doc(db, 'users', currentUser.uid, 'list', id);
      const obj = {
        title: it.title || it.name || 'Untitled',
        type: (it.type || 'custom').toString().toLowerCase(),
        cover: it.cover || it.image || null,
        status: it.status || null,
        notes: it.notes || null,
        source: it.source || null,
        importedAt: it.importedAt || Date.now(),
        createdAt: Date.now(), updatedAt: Date.now()
      };
      await setDoc(docRef, obj);
    }
    await loadMyList();
  }
}
