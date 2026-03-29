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
    // logged in
    const snap = await getDoc(doc(db,"users",user.uid));
    if (snap.exists()) {
      const name = snap.data().username || "Chef";
      document.getElementById("heroGreeting").textContent = `Hello, ${name}!`;
    }
    // show logout button
    document.getElementById("logoutBtn").style.display = "flex";
    document.getElementById("logoutBtn").addEventListener("click", async () => {
      await signOut(auth);
      window.location.reload();
    });
    await loadIngredients(user);
  } else {
    // guest
    document.getElementById("heroGreeting").textContent = "Hello, Guest!";
    document.getElementById("heroSub").textContent = "Sign in to track your fridge";
    document.getElementById("logoutBtn").style.display = "none";
    // show sign in button instead
    showGuestBanner();
    computeTopMatch([]);
  }
});

/* ── guest banner in hero ── */
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
  expiring.forEach((item,idx)=>{
    let pillClass,pillText;
    if(item.diff<0){pillClass="is-danger";pillText="Expired";}
    else if(item.diff===0){pillClass="is-danger";pillText="Today";}
    else if(item.diff===1){pillClass="is-danger";pillText="1 day left";}
    else{pillClass="is-warn";pillText=`${item.diff} days left`;}
    const card=document.createElement("div");
    card.className=`exp-card ${pillClass}`;
    card.style.animationDelay=`${idx*0.5}s`;
    card.onclick=()=>{window.location.href="../inventory/inventory.html";};
    card.innerHTML=`<img src="https://www.themealdb.com/images/ingredients/${item.name}.png" onerror="this.src='https://cdn-icons-png.flaticon.com/512/1046/1046857.png'"><p class="exp-name">${item.name}</p><span class="exp-pill ${pillClass}">${pillText}</span><p class="exp-qty">${item.qty} ${item.unit}</p>`;
    wrap.appendChild(card);
  });
}

async function computeTopMatch(fridgeNames) {
  let cached=localStorage.getItem("allMeals");
  if(!cached){
    try{
      const letters=["a","c","s","b","m","p"]; let allMeals=[];
      for(const l of letters){const r=await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${l}`);const d=await r.json();if(d.meals)allMeals=allMeals.concat(d.meals);}
      const seen=new Set(); const unique=allMeals.filter(m=>{if(seen.has(m.idMeal))return false;seen.add(m.idMeal);return true;});
      localStorage.setItem("allMeals",JSON.stringify(unique)); cached=localStorage.getItem("allMeals");
    }catch(e){return;}
  }
  try{
    const meals=JSON.parse(cached); let best=null,bestScore=0;
    meals.forEach(meal=>{
      const ings=[];for(let i=1;i<=20;i++){const ing=meal[`strIngredient${i}`];if(ing&&ing.trim())ings.push(ing.toLowerCase());}
      if(!ings.length)return;
      const matched=ings.filter(ing=>fridgeNames.some(f=>ing.includes(f)||f.includes(ing)));
      const score=matched.length/ings.length;
      if(score>bestScore){bestScore=score;best={meal,score,matched,ings};}
    });
    if(!best||bestScore===0){document.getElementById("statRecipes").textContent="—";return;}
    document.getElementById("statRecipes").textContent=Math.round(bestScore*100)+"%";
    const section=document.getElementById("todaySection"),container=document.getElementById("todaysPick");
    section.style.display="block";
    const matchTags=best.matched.slice(0,4).map(i=>`<span class="pick-tag match">${i}</span>`).join("");
    const missTags=best.ings.filter(i=>!fridgeNames.some(f=>i.includes(f)||f.includes(i))).slice(0,2).map(i=>`<span class="pick-tag need">+ ${i}</span>`).join("");
    container.innerHTML=`<div class="pick-card" onclick="window.location.href='../menumatching/menudetail.html?id=${best.meal.idMeal}'">
      <div class="pick-img"><img src="${best.meal.strMealThumb}" alt="${best.meal.strMeal}"><span class="pick-badge">${Math.round(bestScore*100)}% match</span></div>
      <div class="pick-body"><p class="pick-title">${best.meal.strMeal}</p>
      <div class="pick-meta"><span><i class="fas fa-clock" style="margin-right:4px;font-size:11px"></i>20 min</span><span><i class="fas fa-users" style="margin-right:4px;font-size:11px"></i>2 servings</span><span class="pick-cat">${best.meal.strCategory}</span></div>
      <div class="pick-tags">${matchTags}${missTags}</div></div></div>`;
  }catch(e){console.log(e);}
}
