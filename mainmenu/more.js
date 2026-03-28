import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, getDocs, collection }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyApISz8uFOfVirU3rX7Dk9wSVVwIKwY2OM",
  authDomain: "inventory-matching.firebaseapp.com",
  projectId: "inventory-matching",
  storageBucket: "inventory-matching.firebasestorage.app",
  messagingSenderId: "758643685191",
  appId: "1:758643685191:web:44a886c25e35d14185be62",
  measurementId: "G-TZRDCHH5WC"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

/* ── AUTH ── */
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "../login/login.html"; return; }

  // profile
  const snap = await getDoc(doc(db, "users", user.uid));
  if (snap.exists()) {
    const { username } = snap.data();
    document.getElementById("profileName").textContent  = username || "Chef";
    document.getElementById("profileAvatar").textContent = (username || "C").charAt(0).toUpperCase();
  }
  document.getElementById("profileEmail").textContent = user.email || "";

  // load stats
  await loadStats(user);

  // sign out
  document.getElementById("signoutBtn").addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "../login/login.html";
  });
});

/* ── STATS ── */
async function loadStats(user) {
  // ingredients count
  const ingSnap = await getDocs(collection(db, "users", user.uid, "ingredients"));
  const ingCount = ingSnap.size;
  document.getElementById("statIng").textContent  = ingCount;
  document.getElementById("stockSub").textContent = `${ingCount} items tracked`;

  // shopping count (pending)
  const shopSnap = await getDocs(collection(db, "users", user.uid, "shopping"));
  const shopPending = [...shopSnap.docs].filter(d => !d.data().done).length;
  document.getElementById("statShop").textContent = shopPending;

  // favorites count (from localStorage)
  const favMenus = JSON.parse(localStorage.getItem("favoriteMenus") || "[]");
  const favIngs  = JSON.parse(localStorage.getItem("favoriteIngredients") || "[]");
  const favTotal = favMenus.length + favIngs.length;
  document.getElementById("statFav").textContent  = favTotal;
  document.getElementById("savedSub").textContent = `${favMenus.length} saved recipes`;
}
