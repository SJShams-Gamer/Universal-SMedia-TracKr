// ================= Firebase Setup =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDocs,
  collection
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBHufCbCaG85LGT3Wb6vK7jZTCwrXB4x3U",
  authDomain: "anime-manga-tracker.firebaseapp.com",
  projectId: "anime-manga-tracker",
  storageBucket: "anime-manga-tracker.appspot.com",
  messagingSenderId: "75813545126",
  appId: "1:75813545126:web:6d2537064c1611f69dc067"
};

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =============== AUTH LISTENERS ===============
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.body.classList.add("signed-in");
    loadUserList(user.uid);
  } else {
    document.body.classList.remove("signed-in");
  }
});

// =============== GLOBAL SAVE FUNCTION ===============
// 🔥 THIS FIXES THE “Save helper unavailable” PROBLEM
window.saveMediaEntry = async function (entry) {
  const user = auth.currentUser;
  if (!user) {
    alert("Please log in to add items to your list.");
    return;
  }

  // Firestore document location
  const docRef = doc(db, "users", user.uid, "mediaList", entry.id);

  await setDoc(docRef, {
    title: entry.title,
    type: entry.type,
    thumbnail: entry.thumbnail || "",
    format: entry.format || "",
    score: entry.score ?? null,
    status: entry.status || "planning",
    episodes: entry.episodes ?? null,
    chapters: entry.chapters ?? null,
    genres: entry.genres ?? [],
    timestamp: Date.now()
  });

  alert("Added to your list! ✔");
  loadUserList(user.uid);
};

// =============== LOAD SAVED ITEMS ===============
async function loadUserList(userId) {
  const cont = document.getElementById("myList");
  if (!cont) return;

  cont.innerHTML = "";

  const q = collection(db, "users", userId, "mediaList");
  const snap = await getDocs(q);

  snap.forEach((docX) => {
    const data = docX.data();
    const card = document.createElement("div");
    card.classList.add("card");

    card.innerHTML = `
      <img src="${data.thumbnail}" alt="${data.title}">
      <div class="card-body">
        <h3>${data.title}</h3>
        <p>${data.type} • ${data.format || ""}</p>
      </div>
    `;

    cont.appendChild(card);
  });
}
