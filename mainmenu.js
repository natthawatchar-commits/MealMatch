import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, getDocs, collection }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey:"AIzaSyApISz8uFOfVirU3rX7Dk9wSVVwIKwY2OM",authDomain:"inventory-matching.firebaseapp.com",
  projectId:"inventory-matching",storageBucket:"inventory-matching.firebasestorage.app",
  messagingSenderId:"758643685191",appId:"1:758643685191:web:44a886c25e35d14185be62",measurementId:"G-TZRDCHH5WC"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

/* ── date ── */
document.getElementById("heroDate").textContent =
  new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});

/* ── auth state ── */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const snap = await getDoc(doc(db,"users",user.uid));
    if (snap.exists()) {
      const name = snap.data().username || "Chef";
      document.getElementById("heroGreeting").textContent = `Hello, ${name}!`;
    }
    document.getElementById("logoutBtn").style.display = "flex";
    document.getElementById("logoutBtn").onclick = async () => {
      await signOut(auth);
      window.location.reload();
    };
    await loadIngredients(user);
  } else {
    document.getElementById("heroGreeting").textContent = "Hello, Guest!";
    document.getElementById("heroSub").textContent = "Sign in to track your fridge";
    document.getElementById("logoutBtn").style.display = "none";
    showGuestBanner();
    await computeTopMatch([]);
  }
});

/* ── guest banner ── */
function showGuestBanner() {
  const sub = document.getElementById("heroSub");
  sub.innerHTML = `Sign in to track your fridge &nbsp;·&nbsp; <a href="../login/login.html" style="color:#FCD34D;font-weight:700;text-decoration:none">Sign In</a>`;
  document.getElementById("statIngredients").textContent = "—";
  document.getElementById("statExpiring").textContent    = "—";
}

/* ── load ingredients ── */
async function loadIngredients(user) {
  const snapshot = await getDocs(collection(db,"users",user.uid,"ingredients"));
  const items = [];
  snapshot.forEach(d => items.push({id:d.id,...d.data()}));
  localStorage.setItem("fridgeIngredients", JSON.stringify(items.map(i=>i.name.toLowerCase())));

  const today = new Date();
  const expiring = [];
  items.forEach(item => {
    if(!item.expire) return;
    const diff = Math.ceil((new Date(item.expire)-today)/86400000);
    if(diff<=3) expiring.push({...item,diff});
  });
  expiring.sort((a,b)=>a.diff-b.diff);

  document.getElementById("statIngredients").textContent = items.length;
  document.getElementById("statExpiring").textContent    = expiring.length;
  document.getElementById("heroSub").textContent = expiring.length>0
    ? `${expiring.length} item${expiring.length>1?"s":""} need attention`
    : "Everything looks fresh";

  document.getElementById("fridgeSlots").textContent    = `${items.length}/16 slots used`;
  document.getElementById("inventoryCount").textContent = `${items.length} tracked`;

  renderExpiring(expiring);
  await computeTopMatch(items.map(i=>i.name.toLowerCase()));
}

function renderExpiring(expiring) {
  const wrap=document.getElementById("expireRowWrap"), empty=document.getElementById("expiringEmpty");
  if(!expiring.length){empty.style.display="flex";return;}
  empty.style.display="none";
  wrap.innerHTML = ""; 
  expiring.forEach((item,idx)=>{
    let pillClass,pillText;
    if(item.diff<0){pillClass="is-danger";pillText="Expired";}
    else if(item.diff===0){pillClass="is-danger";pillText="Today";}
    else if(item.diff===1){pillClass="is-danger";pillText="1 day left";}
    else{pillClass="is-warn";pillText=`${item.diff} days left`;}
    
    // ใช้ getIngredientImageUrl รองรับทั้งชื่อไทยและอังกฤษ
    const imgUrl = window.getIngredientImageUrl ? window.getIngredientImageUrl(item.name) : `https://www.themealdb.com/images/ingredients/${item.name}.png`;

    const card=document.createElement("div");
    card.className=`exp-card ${pillClass}`;
    card.style.animationDelay=`${idx*0.5}s`;
    card.onclick=()=>{window.location.href="../inventory/inventory.html";};
    card.innerHTML=`<img src="${imgUrl}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/1046/1046857.png'"><p class="exp-name">${item.name}</p><span class="exp-pill ${pillClass}">${pillText}</span><p class="exp-qty">${item.qty} ${item.unit}</p>`;
    wrap.appendChild(card);
  });
}

/* ── compute top match จาก thaimeals.js ── */
async function computeTopMatch(fridgeNames) {
  // ดึงเมนูไทยจาก thaimeals.js
  const meals = window.THAI_MEALS || (typeof THAI_MEALS !== "undefined" ? THAI_MEALS : []);
  if (!meals || meals.length === 0) return;

  try {
    let bestMeal = null;
    let matchPercent = 0;
    let matchedTags = [];
    let needTags = [];

    // แปลงวัตถุดิบในตู้เย็นเป็นภาษาไทยทั้งหมดก่อนคำนวณ
    const thaiFridge = fridgeNames.map(name => window.toThaiIngredient ? window.toThaiIngredient(name) : name);

    if (thaiFridge && thaiFridge.length > 0) {
      let maxScore = 0;
      let scoredMeals = [];

      meals.forEach(meal => {
        const ings = meal.ingredients || [];
        if (!ings.length) return;

        // เช็คการแมตช์คำวัตถุดิบภาษาไทย
        const matched = ings.filter(ing => thaiFridge.some(f => ing.includes(f) || f.includes(ing)));
        const score = matched.length / ings.length;

        if (score > 0) {
          if (score > maxScore) maxScore = score;
          scoredMeals.push({ meal, score, matched, ings });
        }
      });

      const topCandidates = scoredMeals.filter(item => item.score === maxScore);
      if (topCandidates.length > 0) {
        const picked = topCandidates[Math.floor(Math.random() * topCandidates.length)];
        bestMeal = picked.meal;
        matchPercent = Math.round(picked.score * 100);
        matchedTags = picked.matched.slice(0, 4);
        needTags = picked.ings.filter(i => !thaiFridge.some(f => i.includes(f) || f.includes(i))).slice(0, 2);
      }
    }

    // สุ่มเมนูไทยมาแสดงเมื่อเป็น Guest หรือแมตช์ไม่ได้ 0%
    if (!bestMeal && meals.length > 0) {
      bestMeal = meals[Math.floor(Math.random() * meals.length)];
      matchPercent = 0;
      needTags = (bestMeal.ingredients || []).slice(0, 3);
    }

    if (!bestMeal) return;

    document.getElementById("statRecipes").textContent = matchPercent > 0 ? matchPercent + "%" : "—";
    const section = document.getElementById("todaySection"), container = document.getElementById("todaysPick");
    section.style.display = "block";

    const matchHtml = matchedTags.map(i => `<span class="pick-tag match">${i}</span>`).join("");
    const needHtml = needTags.map(i => `<span class="pick-tag need">+ ${i}</span>`).join("");

    container.innerHTML = `<div class="pick-card" onclick="window.location.href='../menumatching/menudetail.html?id=${bestMeal.idMeal}'">
      <div class="pick-img"><img src="${bestMeal.strMealThumb}" alt="${bestMeal.strMeal}"><span class="pick-badge">${matchPercent > 0 ? matchPercent + '% match' : 'Recommended'}</span></div>
      <div class="pick-body"><p class="pick-title">${bestMeal.strMeal}</p>
      <div class="pick-meta"><span><i class="fas fa-clock" style="margin-right:4px;font-size:11px"></i>20 min</span><span><i class="fas fa-users" style="margin-right:4px;font-size:11px"></i>2 servings</span><span class="pick-cat">${bestMeal.strCategory || 'อาหารไทย'}</span></div>
      <div class="pick-tags">${matchHtml}${needHtml}</div></div></div>`;
  } catch (e) { console.error(e); }
}