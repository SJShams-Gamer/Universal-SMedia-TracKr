// ================= Firebase Setup =================
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, getDocs, collection, query, where } from "firebase/firestore";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBHufCbCaG85LGT3Wb6vK7jZTCwrXB4x3U",
  authDomain: "anime-manga-tracker.firebaseapp.com",
  projectId: "anime-manga-tracker",
  storageBucket: "anime-manga-tracker.appspot.com",
  messagingSenderId: "75813545126",
  appId: "1:75813545126:web:6d2537064c1611f69dc067"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ================= Authentication =================
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const logoutBtn = document.getElementById("logoutBtn");

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = loginForm.email.value;
  const password = loginForm.password.value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Logged in!");
    loginForm.reset();
  } catch (error) {
    alert("Login error: " + error.message);
  }
});

signupForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = signupForm.email.value;
  const password = signupForm.password.value;

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Account created!");
    signupForm.reset();
  } catch (error) {
    alert("Signup error: " + error.message);
  }
});

logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  alert("Logged out!");
});

// ================= Auth State Listener =================
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User signed in:", user.email);
    document.body.classList.add("signed-in");
    loadUserList(user.uid);
  } else {
    console.log("No user signed in");
    document.body.classList.remove("signed-in");
  }
});

// ================= Save Media Entry =================
async function saveMediaEntry(entry) {
  const user = auth.currentUser;
  if (!user) {
    alert("Please log in to save your media.");
    return;
  }

  const docRef = doc(db, "users", user.uid, "mediaList", entry.id);
  await setDoc(docRef, {
    title: entry.title,
    type: entry.type,
    status: entry.status || "planning",
    thumbnail: entry.thumbnail || "",
    description: entry.description || "",
    timestamp: Date.now()
  });

  alert("Media saved!");
  loadUserList(user.uid); // refresh list
}

// ================= Load User List =================
async function loadUserList(userId) {
  const mediaListContainer = document.getElementById("myList");
  mediaListContainer.innerHTML = "";

  const q = query(collection(db, "users", userId, "mediaList"));
  const querySnapshot = await getDocs(q);

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const card = document.createElement("div");
    card.classList.add("card");
    card.innerHTML = `
      <img src="${data.thumbnail || 'placeholder.png'}" alt="${data.title}">
      <div class="card-body">
        <h3>${data.title}</h3>
        <p>${data.type} | ${data.status}</p>
      </div>
    `;
    mediaListContainer.appendChild(card);
  });
}

// ================= Example Usage =================
// Example entry from search or custom
const exampleEntry = {
  id: "naruto123",
  title: "Naruto",
  type: "anime",
  status: "watching",
  thumbnail: "https://cdn.myanimelist.net/images/anime/13/17405.jpg",
  description: "A ninja story..."
};

// saveMediaEntry(exampleEntry);
